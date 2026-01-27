import { useState, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    totalSize?: number;
    inserted?: number;
    errors?: number;
    skipped?: number;
    message?: string;
  } | null>(null);
  const [fiscalYear, setFiscalYear] = useState("FY2024");
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importLogs, setImportLogs] = useState<Array<{
    chunk: number;
    bytesProcessed: number;
    totalBytes: number;
    inserted: number;
    skipped: number;
    errors: number;
    progress: number;
    timestamp: Date;
  }>>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Track skipped samples for diagnostics
  const [skippedSamples, setSkippedSamples] = useState<Array<{
    chunk: number;
    reason: string;
    lineNumber: number;
    caseNumber: string | null;
    employerName: string | null;
    missingFields: string[];
  }>>([]);
  const [showSkippedPanel, setShowSkippedPanel] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    console.log('Selected file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    if (!fileName.endsWith('.csv')) {
      toast.error(`File "${file.name}" is not a CSV. Please upload a .csv file.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setResult(null);
    setUploadedFilePath(null);

    try {
      const fileName = `lca_${Date.now()}_${file.name}`;
      
      toast.info(`Uploading ${(file.size / 1024 / 1024).toFixed(1)} MB file to storage...`);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('lca-imports')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      setUploadProgress(100);
      setUploadedFilePath(data.path);
      toast.success("File uploaded successfully! Click 'Start Import' to process.");

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const startImport = async () => {
    if (!uploadedFilePath) {
      toast.error("No file uploaded. Please upload a file first.");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setResult(null);
    setImportLogs([]);
    setSkippedSamples([]);

    let totalInserted = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    let totalSize = 0;
    let byteStart = 0;
    let chunkNumber = 0;
    let cachedHeaders: string[] | undefined;
    let cachedColIndices: Record<string, number> | undefined;

    try {
      toast.info("Starting server-side import with streaming...");

      // Process in byte chunks until done
      let hasMore = true;
      while (hasMore) {
        chunkNumber++;

        const { data, error } = await supabase.functions.invoke('process-lca-import', {
          body: { 
            filePath: uploadedFilePath, 
            fiscalYear,
            byteStart,
            headers: cachedHeaders,
            colIndices: cachedColIndices
          }
        });

        if (error) {
          console.error(`Chunk ${chunkNumber} error:`, error);
          throw new Error(`Processing failed at chunk ${chunkNumber}: ${error.message}`);
        }

        // Cache headers from first chunk
        if (chunkNumber === 1 && data.headers) {
          cachedHeaders = data.headers;
          cachedColIndices = data.colIndices;
        }

        totalSize = data.totalSize || totalSize;
        totalInserted += data.inserted || 0;
        totalErrors += data.errors || 0;
        totalSkipped += data.skipped || 0;
        hasMore = data.hasMore;
        byteStart = data.nextByteStart || 0;

        // Update progress
        setImportProgress(data.progressPercent || 0);

        // Add log entry for this chunk
        setImportLogs(prev => [...prev, {
          chunk: chunkNumber,
          bytesProcessed: byteStart + (data.processedBytes || 0),
          totalBytes: data.totalSize || totalSize,
          inserted: data.inserted || 0,
          skipped: data.skipped || 0,
          errors: data.errors || 0,
          progress: data.progressPercent || 0,
          timestamp: new Date()
        }]);
        
        // Capture skipped samples for diagnostics
        if (data.skippedSamples && data.skippedSamples.length > 0) {
          const chunkNum = chunkNumber;
          setSkippedSamples(prev => [
            ...prev,
            ...data.skippedSamples.map((s: { reason: string; lineNumber: number; caseNumber: string | null; employerName: string | null; missingFields: string[] }) => ({
              ...s,
              chunk: chunkNum
            }))
          ]);
        }

        // Auto-scroll to latest log
        setTimeout(() => {
          logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        console.log(`Chunk ${chunkNumber}: inserted ${data.inserted}, progress: ${data.progressPercent}%, hasMore: ${hasMore}`);
      }

      setImportProgress(100);
      setResult({
        success: true,
        totalSize,
        inserted: totalInserted,
        errors: totalErrors,
        skipped: totalSkipped
      });
      toast.success(`Successfully imported ${totalInserted.toLocaleString()} LCA records`);

      // Clean up uploaded file
      await supabase.storage.from('lca-imports').remove([uploadedFilePath]);
      setUploadedFilePath(null);

    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      toast.error("Import failed. Check the error details below.");
    } finally {
      setIsImporting(false);
    }
  };

  const cancelUpload = async () => {
    if (uploadedFilePath) {
      await supabase.storage.from('lca-imports').remove([uploadedFilePath]);
      setUploadedFilePath(null);
      toast.info("Upload cancelled and file removed.");
    }
  };

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground">Admin: Import LCA Data</h1>
          <p className="mt-2 text-muted-foreground">
            Import LCA disclosure data from DOL CSV files (supports large files up to 100MB+)
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import LCA Disclosure File
            </CardTitle>
            <CardDescription>
              Upload a CSV file from the DOL LCA Disclosure Data. Large files are uploaded to storage 
              first, then processed server-side in small streaming chunks to avoid memory limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fiscalYear">Fiscal Year</Label>
              <Input
                id="fiscalYear"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="e.g., FY2024"
                disabled={isUploading || isImporting}
              />
            </div>

            {/* Step 1: Upload */}
            <div className="space-y-2">
              <Label>Step 1: Upload CSV File</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading || isImporting || !!uploadedFilePath}
                  className="hidden"
                />
                <label
                  htmlFor="file"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  ) : uploadedFilePath ? (
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  ) : (
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isUploading 
                      ? "Uploading to storage..." 
                      : uploadedFilePath 
                        ? "File ready for import" 
                        : "Click to upload CSV file (up to 100MB+)"}
                  </span>
                </label>
              </div>
              {uploadedFilePath && !isImporting && (
                <Button variant="outline" size="sm" onClick={cancelUpload}>
                  Cancel & Remove File
                </Button>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Step 2: Import */}
            {uploadedFilePath && !isUploading && (
              <div className="space-y-4">
                <Label>Step 2: Process Import</Label>
                <Button 
                  onClick={startImport} 
                  disabled={isImporting}
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Start Import"
                  )}
                </Button>
              </div>
            )}

            {isImporting && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-sm text-muted-foreground text-center">
                  Processing... {importProgress}% complete
                </p>
              </div>
            )}

            {/* Import Logs Panel */}
            {importLogs.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Import Progress Log
                </Label>
                <div className="border rounded-md bg-muted/30 max-h-48 overflow-y-auto">
                  <div className="p-2 space-y-1 font-mono text-xs">
                    {importLogs.map((log, idx) => (
                      <div 
                        key={idx} 
                        className={`p-1.5 rounded ${
                          log.errors > 0 
                            ? 'bg-destructive/10 text-destructive' 
                            : log.inserted > 0 
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
                              : 'bg-muted'
                        }`}
                      >
                        <span className="text-muted-foreground">
                          [{log.timestamp.toLocaleTimeString()}]
                        </span>{' '}
                        <span className="font-semibold">Chunk {log.chunk}</span>:{' '}
                        <span className="text-primary">{(log.bytesProcessed / 1024 / 1024).toFixed(2)} MB</span>
                        {log.totalBytes > 0 && (
                          <span className="text-muted-foreground">
                            /{(log.totalBytes / 1024 / 1024).toFixed(1)} MB
                          </span>
                        )}{' '}
                        | <span className="text-green-600 dark:text-green-400">+{log.inserted} inserted</span>
                        {log.skipped > 0 && (
                          <span className="text-yellow-600 dark:text-yellow-400"> | {log.skipped} skipped</span>
                        )}
                        {log.errors > 0 && (
                          <span className="text-destructive"> | {log.errors} errors</span>
                        )}
                        {' '}| <span className="font-medium">{log.progress}%</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {importLogs.reduce((sum, l) => sum + l.inserted, 0).toLocaleString()} inserted, 
                  {' '}{importLogs.reduce((sum, l) => sum + l.skipped, 0).toLocaleString()} skipped
                </p>
              </div>
            )}
            
            {/* Skipped Records Panel */}
            {skippedSamples.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    Skipped Records Sample ({skippedSamples.length} samples)
                  </Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSkippedPanel(!showSkippedPanel)}
                  >
                    {showSkippedPanel ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
                {showSkippedPanel && (
                  <div className="border rounded-md bg-yellow-50/50 dark:bg-yellow-900/10 max-h-64 overflow-y-auto">
                    <div className="p-2 space-y-1 font-mono text-xs">
                      {skippedSamples.slice(0, 200).map((sample, idx) => (
                        <div 
                          key={idx} 
                          className="p-2 rounded bg-background/80 border border-yellow-200 dark:border-yellow-800"
                        >
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-muted-foreground">Chunk {sample.chunk}, Line {sample.lineNumber}</span>
                            <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded text-[10px] font-medium">
                              {sample.reason.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            <span className="text-destructive font-medium">Missing: </span>
                            {sample.missingFields.join(', ')}
                          </div>
                          {(sample.caseNumber || sample.employerName) && (
                            <div className="mt-1 text-xs">
                              {sample.caseNumber && <span>Case: {sample.caseNumber} </span>}
                              {sample.employerName && <span>| Employer: {sample.employerName}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                      {skippedSamples.length > 200 && (
                        <p className="text-center text-muted-foreground py-2">
                          ... and {skippedSamples.length - 200} more samples
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  ⚠️ These are sample rows that were skipped due to missing required fields. 
                  Up to 100 samples are captured per chunk.
                </p>
              </div>
            )}

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {result.success ? "Import Successful" : "Import Failed"}
                </AlertTitle>
                <AlertDescription>
                  {result.success ? (
                    <ul className="mt-2 text-sm space-y-1">
                      <li>File size: {((result.totalSize || 0) / 1024 / 1024).toFixed(1)} MB</li>
                      <li>Records inserted: {result.inserted?.toLocaleString()}</li>
                      <li>Records skipped: {result.skipped?.toLocaleString()}</li>
                      {result.errors ? <li>Errors: {result.errors?.toLocaleString()}</li> : null}
                    </ul>
                  ) : (
                    <p>{result.message}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download LCA disclosure data from <a href="https://www.dol.gov/agencies/eta/foreign-labor/performance" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">DOL Performance Data</a></li>
                <li>Convert the XLSX file to CSV format</li>
                <li>Upload the CSV file (Step 1) - large files are stored temporarily</li>
                <li>Click "Start Import" (Step 2) to process server-side</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
