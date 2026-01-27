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
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    totalParsed?: number;
    inserted?: number;
    errors?: number;
    skipped?: number;
    message?: string;
  } | null>(null);
  const [fiscalYear, setFiscalYear] = useState("FY2024");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's a CSV file
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file. If you have an XLSX file, please convert it to CSV first.");
      return;
    }

    setIsImporting(true);
    setProgress(10);
    setResult(null);

    try {
      // Read file content
      const text = await file.text();
      setProgress(30);

      // Send to edge function
      const { data, error } = await supabase.functions.invoke('import-lca-disclosure', {
        body: { csvData: text, fiscalYear }
      });

      setProgress(100);

      if (error) {
        throw error;
      }

      setResult({
        success: true,
        ...data
      });
      toast.success(`Successfully imported ${data.inserted} LCA records`);
    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      toast.error("Import failed. Please check the file format.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground">Admin: Import LCA Data</h1>
          <p className="mt-2 text-muted-foreground">
            Import LCA disclosure data from DOL CSV files
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
              Upload a CSV file from the DOL LCA Disclosure Data. The file should contain
              columns for case number, employer name, job title, wages, etc.
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">CSV File</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isImporting}
                  className="hidden"
                />
                <label
                  htmlFor="file"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {isImporting ? (
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isImporting ? "Importing..." : "Click to upload CSV file"}
                  </span>
                </label>
              </div>
            </div>

            {isImporting && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  Processing file... This may take a few minutes for large files.
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
                      <li>Records parsed: {result.totalParsed?.toLocaleString()}</li>
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
                <li>Upload the CSV file above</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
