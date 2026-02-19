import { useState, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Database, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WAGE_YEARS = [
  { label: '2025-2026', value: '2025-2026', url: 'https://flag.dol.gov/sites/default/files/wages/OFLC_Wages_2025-26.zip', totalRows: 451984 },
  { label: '2024-2025', value: '2024-2025', url: 'https://flag.dol.gov/sites/default/files/wages/OFLC_Wages_2024-25.zip', totalRows: 451984 },
  { label: '2023-2024', value: '2023-2024', url: 'https://flag.dol.gov/sites/default/files/wages/OFLC_Wages_2023-24.zip', totalRows: 451984 },
  { label: '2022-2023', value: '2022-2023', url: 'https://flag.dol.gov/sites/default/files/wages/OFLC_Wages_2022-23.zip', totalRows: 451984 },
  { label: '2021-2022', value: '2021-2022', url: 'https://flag.dol.gov/sites/default/files/wages/OFLC_Wages_2021-22.zip', totalRows: 437593 },
  { label: '2020-2021', value: '2020-2021', url: 'https://flag.dol.gov/sites/default/files/wages/OFLC_Wages_2020-21.zip', totalRows: 437593 },
  { label: '2019-2020', value: '2019-2020', url: 'https://flag.dol.gov/sites/default/files/wages/OFLC_Wages_2019-20.zip', totalRows: 436442 },
];

export default function AdminImport() {
  // LCA import state
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
  const [skippedSamples, setSkippedSamples] = useState<Array<{
    chunk: number;
    reason: string;
    lineNumber: number;
    caseNumber: string | null;
    employerName: string | null;
    missingFields: string[];
  }>>([]);
  const [showSkippedPanel, setShowSkippedPanel] = useState(false);

  // Wage data import state
  const [wageImportStatus, setWageImportStatus] = useState<Record<string, {
    status: 'idle' | 'importing' | 'patching' | 'done' | 'error';
    rowCount?: number;
    message?: string;
    skipRows?: number;
  }>>({});

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      toast.error(`File "${file.name}" is not a CSV. Please upload a .csv file.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setResult(null);
    setUploadedFilePath(null);

    try {
      const storageName = `lca_${Date.now()}_${file.name}`;
      toast.info(`Uploading ${(file.size / 1024 / 1024).toFixed(1)} MB file to storage...`);
      const { data, error } = await supabase.storage
        .from('lca-imports')
        .upload(storageName, file, { cacheControl: '3600', upsert: false });

      if (error) throw new Error(`Upload failed: ${error.message}`);

      setUploadProgress(100);
      setUploadedFilePath(data.path);
      toast.success("File uploaded successfully! Click 'Start Import' to process.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      setResult({ success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      let hasMore = true;
      while (hasMore) {
        chunkNumber++;
        const { data, error } = await supabase.functions.invoke('process-lca-import', {
          body: { filePath: uploadedFilePath, fiscalYear, byteStart, headers: cachedHeaders, colIndices: cachedColIndices }
        });

        if (error) throw new Error(`Processing failed at chunk ${chunkNumber}: ${error.message}`);

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

        setImportProgress(data.progressPercent || 0);
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

        if (data.skippedSamples?.length > 0) {
          const chunkNum = chunkNumber;
          setSkippedSamples(prev => [
            ...prev,
            ...data.skippedSamples.map((s: { reason: string; lineNumber: number; caseNumber: string | null; employerName: string | null; missingFields: string[] }) => ({ ...s, chunk: chunkNum }))
          ]);
        }

        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }

      setImportProgress(100);
      setResult({ success: true, totalSize, inserted: totalInserted, errors: totalErrors, skipped: totalSkipped });
      toast.success(`Successfully imported ${totalInserted.toLocaleString()} LCA records`);
      await supabase.storage.from('lca-imports').remove([uploadedFilePath]);
      setUploadedFilePath(null);
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' });
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

  const importWageYear = async (year: typeof WAGE_YEARS[0], skipRows = 0, clearExisting = false) => {
    setWageImportStatus(prev => ({
      ...prev,
      [year.value]: { status: 'importing', skipRows, message: `Importing from row ${skipRows}...` }
    }));

    try {
      const { data, error } = await supabase.functions.invoke('import-wage-data', {
        body: { zipUrl: year.url, wageYear: year.value, skipRows, clearExisting }
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Import failed');

      const nextSkip = data.nextSkipRows || (skipRows + data.recordCount);
      const isDone = nextSkip >= year.totalRows;

      if (isDone) {
        // Patch area names after full import
        setWageImportStatus(prev => ({
          ...prev,
          [year.value]: { status: 'patching', rowCount: nextSkip, message: 'Patching area names...' }
        }));

        const { data: patchData, error: patchError } = await supabase.functions.invoke('patch-wage-area-names', {
          body: { zipUrl: year.url, wageYear: year.value }
        });

        if (patchError || !patchData?.success) {
          toast.warning(`${year.label} imported but area name patch failed`);
        }

        setWageImportStatus(prev => ({
          ...prev,
          [year.value]: { status: 'done', rowCount: nextSkip, message: `Complete — ${nextSkip.toLocaleString()} rows` }
        }));
        toast.success(`${year.label} wage data fully imported`);
      } else {
        // More rows remain — continue automatically
        setWageImportStatus(prev => ({
          ...prev,
          [year.value]: { status: 'importing', skipRows: nextSkip, rowCount: nextSkip, message: `${nextSkip.toLocaleString()} / ~${year.totalRows.toLocaleString()} rows...` }
        }));
        toast.info(`${year.label}: ${nextSkip.toLocaleString()} rows done, continuing...`);
        // Continue automatically
        await importWageYear(year, nextSkip, false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setWageImportStatus(prev => ({
        ...prev,
        [year.value]: { status: 'error', message: msg }
      }));
      toast.error(`${year.label} import failed: ${msg}`);
    }
  };

  const patchAreaNames = async (year: typeof WAGE_YEARS[0]) => {
    setWageImportStatus(prev => ({
      ...prev,
      [year.value]: { ...prev[year.value], status: 'patching', message: 'Patching area names...' }
    }));

    try {
      const { data, error } = await supabase.functions.invoke('patch-wage-area-names', {
        body: { zipUrl: year.url, wageYear: year.value }
      });

      if (error || !data?.success) throw new Error(error?.message || data?.error || 'Patch failed');

      setWageImportStatus(prev => ({
        ...prev,
        [year.value]: { ...prev[year.value], status: 'done', message: `Area names patched (${data.updated?.toLocaleString()} rows updated)` }
      }));
      toast.success(`${year.label} area names patched successfully`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setWageImportStatus(prev => ({
        ...prev,
        [year.value]: { ...prev[year.value], status: 'error', message: msg }
      }));
      toast.error(`${year.label} patch failed: ${msg}`);
    }
  };

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground">Admin: Data Import</h1>
          <p className="mt-2 text-muted-foreground">
            Import LCA disclosure data and prevailing wage data from DOL sources
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">

        {/* ── Prevailing Wage Import ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              OFLC Prevailing Wage Data
            </CardTitle>
            <CardDescription>
              Import FLAG.gov OFLC wage tables for each year. Rows are upserted so re-running is safe.
              Each year ~450K rows — the import automatically continues in chunks until complete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {WAGE_YEARS.map((year) => {
                const st = wageImportStatus[year.value];
                const busy = st?.status === 'importing' || st?.status === 'patching';
                return (
                  <div key={year.value} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className="w-24 shrink-0">
                      <span className="font-mono font-medium text-sm">{year.label}</span>
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground">
                      {st ? st.message : `~${year.totalRows.toLocaleString()} rows`}
                    </div>
                    <div className="flex items-center gap-2">
                      {st?.status === 'done' && <Badge variant="secondary" className="text-xs">✓ Done</Badge>}
                      {st?.status === 'error' && <Badge variant="destructive" className="text-xs">Error</Badge>}
                      {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => importWageYear(year, 0, false)}
                      >
                        {busy ? 'Running...' : st?.status === 'done' ? 'Re-import' : 'Import'}
                      </Button>
                      {(st?.status === 'done' || st?.status === 'error') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => patchAreaNames(year)}
                          title="Re-run area name patch only"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              ⚠️ Imports run sequentially in chunks (~30K rows each) to avoid timeouts. 
              Leave this tab open while importing — it will continue automatically until complete.
            </p>
          </CardContent>
        </Card>

        {/* ── LCA Disclosure Import ── */}
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
                <label htmlFor="file" className="cursor-pointer flex flex-col items-center gap-2">
                  {isUploading ? (
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  ) : uploadedFilePath ? (
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  ) : (
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isUploading ? "Uploading to storage..." : uploadedFilePath ? "File ready for import" : "Click to upload CSV file (up to 100MB+)"}
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
                <p className="text-sm text-muted-foreground text-center">Uploading... {uploadProgress}%</p>
              </div>
            )}

            {uploadedFilePath && !isUploading && (
              <div className="space-y-4">
                <Label>Step 2: Process Import</Label>
                <Button onClick={startImport} disabled={isImporting} className="w-full">
                  {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Start Import"}
                </Button>
              </div>
            )}

            {isImporting && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-sm text-muted-foreground text-center">Processing... {importProgress}% complete</p>
              </div>
            )}

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
                          log.errors > 0 ? 'bg-destructive/10 text-destructive'
                          : log.inserted > 0 ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                          : 'bg-muted'
                        }`}
                      >
                        <span className="text-muted-foreground">[{log.timestamp.toLocaleTimeString()}]</span>{' '}
                        <span className="font-semibold">Chunk {log.chunk}</span>:{' '}
                        <span className="text-primary">{(log.bytesProcessed / 1024 / 1024).toFixed(2)} MB</span>
                        {log.totalBytes > 0 && <span className="text-muted-foreground">/{(log.totalBytes / 1024 / 1024).toFixed(1)} MB</span>}{' '}
                        | <span className="text-green-600 dark:text-green-400">+{log.inserted} inserted</span>
                        {log.skipped > 0 && <span className="text-yellow-600 dark:text-yellow-400"> | {log.skipped} skipped</span>}
                        {log.errors > 0 && <span className="text-destructive"> | {log.errors} errors</span>}
                        {' '}| <span className="font-medium">{log.progress}%</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {importLogs.reduce((sum, l) => sum + l.inserted, 0).toLocaleString()} inserted,{' '}
                  {importLogs.reduce((sum, l) => sum + l.skipped, 0).toLocaleString()} skipped
                </p>
              </div>
            )}

            {skippedSamples.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    Skipped Records Sample ({skippedSamples.length} samples)
                  </Label>
                  <Button variant="outline" size="sm" onClick={() => setShowSkippedPanel(!showSkippedPanel)}>
                    {showSkippedPanel ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
                {showSkippedPanel && (
                  <div className="border rounded-md bg-yellow-50/50 dark:bg-yellow-900/10 max-h-64 overflow-y-auto">
                    <div className="p-2 space-y-1 font-mono text-xs">
                      {skippedSamples.slice(0, 200).map((sample, idx) => (
                        <div key={idx} className="p-2 rounded bg-background/80 border border-yellow-200 dark:border-yellow-800">
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
                        <p className="text-center text-muted-foreground py-2">... and {skippedSamples.length - 200} more samples</p>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  ⚠️ These are sample rows that were skipped due to missing required fields.
                </p>
              </div>
            )}

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{result.success ? "Import Complete" : "Import Failed"}</AlertTitle>
                <AlertDescription>
                  {result.success ? (
                    <div className="space-y-1 text-sm">
                      <p>✅ Successfully inserted: <strong>{result.inserted?.toLocaleString()}</strong> records</p>
                      {result.skipped !== undefined && result.skipped > 0 && (
                        <p>⏭️ Skipped (duplicates/incomplete): <strong>{result.skipped?.toLocaleString()}</strong></p>
                      )}
                      {result.errors !== undefined && result.errors > 0 && (
                        <p>❌ Errors: <strong>{result.errors?.toLocaleString()}</strong></p>
                      )}
                      {result.totalSize && (
                        <p>📦 File size: <strong>{(result.totalSize / 1024 / 1024).toFixed(1)} MB</strong></p>
                      )}
                    </div>
                  ) : (
                    result.message
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>How to import LCA data</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
                  <li>Download the latest LCA Disclosure CSV from <a href="https://www.dol.gov/agencies/eta/foreign-labor/performance" target="_blank" rel="noopener noreferrer" className="text-primary underline">DOL OFLC Performance Data</a></li>
                  <li>Select the CSV file using the upload area above</li>
                  <li>Click "Start Import" (Step 2) to process server-side</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
