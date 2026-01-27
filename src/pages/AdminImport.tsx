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

const CHUNK_SIZE = 10000; // rows per chunk for server-side processing

export default function AdminImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    totalLines?: number;
    inserted?: number;
    errors?: number;
    skipped?: number;
    message?: string;
  } | null>(null);
  const [fiscalYear, setFiscalYear] = useState("FY2024");
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file. If you have an XLSX file, please convert it to CSV first.");
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
    setCurrentChunk(0);
    setResult(null);

    let totalInserted = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    let totalLines = 0;
    let chunkStart = 0;
    let chunkNumber = 0;

    try {
      toast.info("Starting server-side import...");

      // Process in chunks until done
      let hasMore = true;
      while (hasMore) {
        chunkNumber++;
        setCurrentChunk(chunkNumber);

        const { data, error } = await supabase.functions.invoke('process-lca-import', {
          body: { 
            filePath: uploadedFilePath, 
            fiscalYear,
            chunkStart,
            chunkSize: CHUNK_SIZE
          }
        });

        if (error) {
          console.error(`Chunk ${chunkNumber} error:`, error);
          throw new Error(`Processing failed at chunk ${chunkNumber}: ${error.message}`);
        }

        totalLines = data.totalLines || totalLines;
        totalInserted += data.inserted || 0;
        totalErrors += data.errors || 0;
        totalSkipped += data.skipped || 0;
        hasMore = data.hasMore;
        chunkStart = data.nextChunkStart || 0;

        // Update progress
        const processedSoFar = chunkStart || totalLines;
        const progressPercent = Math.min(Math.round((processedSoFar / totalLines) * 100), 100);
        setImportProgress(progressPercent);
        setTotalChunks(Math.ceil(totalLines / CHUNK_SIZE));

        console.log(`Chunk ${chunkNumber}: inserted ${data.inserted}, hasMore: ${hasMore}`);
      }

      setImportProgress(100);
      setResult({
        success: true,
        totalLines,
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
      setCurrentChunk(0);
      setTotalChunks(0);
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
              first, then processed server-side in chunks of {CHUNK_SIZE.toLocaleString()} rows.
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
                  Processing chunk {currentChunk}{totalChunks > 0 ? ` of ~${totalChunks}` : ''}... ({importProgress}%)
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
                      <li>Total lines in file: {result.totalLines?.toLocaleString()}</li>
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
