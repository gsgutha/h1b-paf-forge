import { useState, useCallback } from 'react';
import { FileText, FileUp, X, Check, AlertCircle, Loader2, Sparkles, ShieldCheck, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LCAScanResult } from './SupportingDocsStep';

interface LCAScanStepProps {
  onNext: (file: File | null, scanResult: LCAScanResult | null) => void;
  onBack: () => void;
  onScanComplete?: (result: LCAScanResult) => void;
}

export function LCAScanStep({ onNext, onBack, onScanComplete }: LCAScanStepProps) {
  const [lcaFile, setLcaFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<LCAScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = useCallback((file: File) => {
    setLcaFile(file);
    setScanResult(null);
    setScanError(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setLcaFile(null);
    setScanResult(null);
    setScanError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  }, [handleFileChange]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileChange(selectedFile);
  }, [handleFileChange]);

  const handleScanLCA = async () => {
    if (!lcaFile) return;

    setIsScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      const arrayBuffer = await lcaFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const pdfBase64 = btoa(binary);

      const { data: result, error } = await supabase.functions.invoke('scan-lca-pdf', {
        body: { pdfBase64 },
      });

      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || 'Scan failed');

      const scanData = result.data as LCAScanResult;
      setScanResult(scanData);

      if (onScanComplete) {
        onScanComplete(scanData);
      }

      toast({
        title: 'LCA Scanned Successfully',
        description: 'Data extracted and will be applied to all wizard fields.',
      });
    } catch (err: any) {
      console.error('LCA scan error:', err);
      setScanError(err.message || 'Failed to scan LCA');
      toast({
        title: 'LCA Scan Failed',
        description: err.message || 'Could not extract data from the uploaded LCA.',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleNext = () => {
    onNext(lcaFile, scanResult);
  };

  return (
    <div className="fade-in">
      <div className="paf-section-header">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <ScanLine className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Scan LCA Document</h2>
          <p className="text-sm text-muted-foreground">
            Upload your LCA PDF to auto-fill job details, worksite, wages, and more
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Upload LCA (ETA Form 9035)
          </CardTitle>
          <CardDescription>
            The AI scanner will extract data from all pages including primary worksite (Page 3) and secondary worksite (Page 7/Appendix A)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          {lcaFile ? (
            <div className="flex items-center justify-between p-4 border border-success/30 bg-success/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Check className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{lcaFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(lcaFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer border-border hover:border-accent/50 hover:bg-muted/30"
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Upload LCA PDF</p>
              <p className="text-xs text-muted-foreground mt-1">
                Drag & drop or click to upload your certified LCA document
              </p>
            </div>
          )}

          {/* Scan Button */}
          {lcaFile && !scanResult && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleScanLCA}
              disabled={isScanning}
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning LCA with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Scan &amp; Extract LCA Data
                </>
              )}
            </Button>
          )}

          {/* Scan Error */}
          {scanError && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Scan Error</p>
                <p className="text-muted-foreground">{scanError}</p>
              </div>
            </div>
          )}

          {/* Scan Results */}
          {scanResult && (
            <Card className="border-success/30 bg-success/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-success" />
                  LCA Data Extracted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  {scanResult.caseNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Case Number</span>
                      <span className="font-medium">{scanResult.caseNumber}</span>
                    </div>
                  )}
                  {scanResult.caseStatus && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={scanResult.caseStatus.toLowerCase() === 'certified' ? 'default' : 'destructive'}>
                        {scanResult.caseStatus}
                      </Badge>
                    </div>
                  )}
                  {scanResult.employerName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Employer</span>
                      <span className="font-medium">{scanResult.employerName}</span>
                    </div>
                  )}
                  {scanResult.jobTitle && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Job Title</span>
                      <span className="font-medium">{scanResult.jobTitle}</span>
                    </div>
                  )}
                  {scanResult.socCode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SOC Code</span>
                      <span className="font-medium">{scanResult.socCode}{scanResult.socTitle ? ` - ${scanResult.socTitle}` : ''}</span>
                    </div>
                  )}
                  {scanResult.wageRateFrom !== undefined && scanResult.wageRateFrom !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wage</span>
                      <span className="font-medium">
                        ${scanResult.wageRateFrom?.toLocaleString()}
                        {scanResult.wageRateTo ? ` - $${scanResult.wageRateTo.toLocaleString()}` : ''}
                        {' / '}{scanResult.wageUnit || 'Year'}
                      </span>
                    </div>
                  )}
                  {scanResult.prevailingWage !== undefined && scanResult.prevailingWage !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prevailing Wage</span>
                      <span className="font-medium">
                        ${scanResult.prevailingWage?.toLocaleString()} / {scanResult.prevailingWageUnit || 'Year'}
                        {scanResult.wageLevel ? ` (${scanResult.wageLevel})` : ''}
                      </span>
                    </div>
                  )}
                  {(scanResult.worksiteCity || scanResult.worksiteState) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Primary Worksite</span>
                      <span className="font-medium">
                        {[scanResult.worksiteName, scanResult.worksiteAddress, scanResult.worksiteCity, scanResult.worksiteState].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {scanResult.hasSecondaryWorksite && (scanResult.secondaryWorksiteCity || scanResult.secondaryWorksiteState) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Secondary Worksite</span>
                      <span className="font-medium">
                        {[scanResult.secondaryWorksiteName, scanResult.secondaryWorksiteAddress, scanResult.secondaryWorksiteCity, scanResult.secondaryWorksiteState].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {scanResult.wageSourceYear && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wage Source Date</span>
                      <span className="font-medium">{scanResult.wageSourceYear}</span>
                    </div>
                  )}
                  {scanResult.h1bDependent !== undefined && scanResult.h1bDependent !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">H-1B Dependent</span>
                      <Badge variant={scanResult.h1bDependent ? 'destructive' : 'secondary'}>
                        {scanResult.h1bDependent ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Extracted data will be applied to all subsequent wizard steps. Review and adjust as needed.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          {scanResult ? 'Continue with Scanned Data' : 'Skip Scan & Continue'}
        </Button>
      </div>
    </div>
  );
}
