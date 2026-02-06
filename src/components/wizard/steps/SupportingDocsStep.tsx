import { useState, useCallback } from 'react';
import { FileText, Upload, X, Check, AlertCircle, FileUp, Building2, Bell, Users, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LCAScanResult {
  caseNumber?: string;
  caseStatus?: string;
  employerName?: string;
  employerAddress?: string;
  employerCity?: string;
  employerState?: string;
  employerPostalCode?: string;
  employerFein?: string;
  naicsCode?: string;
  jobTitle?: string;
  socCode?: string;
  socTitle?: string;
  isFullTime?: boolean;
  beginDate?: string;
  endDate?: string;
  wageRateFrom?: number;
  wageRateTo?: number;
  wageUnit?: string;
  prevailingWage?: number;
  prevailingWageUnit?: string;
  wageLevel?: string;
  worksiteCity?: string;
  worksiteState?: string;
  worksitePostalCode?: string;
  worksiteCounty?: string;
  h1bDependent?: boolean;
  willfulViolator?: boolean;
  visaClass?: string;
  totalWorkers?: number;
}

export interface SupportingDocs {
  lcaCaseNumber: string;
  lcaFile: File | null;
  actualWageMemo: string;
  noticePostingProof: File | null;
  noticePostingStartDate: string;
  noticePostingEndDate: string;
  noticePostingLocation: string;
  noticePostingLocation2: string;
  benefitsComparisonFile: File | null;
  benefitsNotes: string;
  isCertifiedLCA?: boolean;
  isH1BDependent?: boolean;
}

interface SupportingDocsStepProps {
  data: Partial<SupportingDocs>;
  onNext: (data: SupportingDocs) => void;
  onBack: () => void;
  isManualMode?: boolean;
  onScanComplete?: (result: LCAScanResult) => void;
}

function FileUploadZone({ 
  label, 
  file, 
  onFileChange, 
  onRemove,
  accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg"
}: { 
  label: string;
  file: File | null;
  onFileChange: (file: File) => void;
  onRemove: () => void;
  accept?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileChange(droppedFile);
    }
  }, [onFileChange]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileChange(selectedFile);
    }
  }, [onFileChange]);

  if (file) {
    return (
      <div className="flex items-center justify-between p-4 border border-success/30 bg-success/5 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <Check className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="font-medium text-foreground">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
        ${isDragging 
          ? 'border-accent bg-accent/5' 
          : 'border-border hover:border-accent/50 hover:bg-muted/30'
        }
      `}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Drag & drop or click to upload (PDF, DOC, or images)
      </p>
    </div>
  );
}

export function SupportingDocsStep({ data, onNext, onBack, isManualMode, onScanComplete }: SupportingDocsStepProps) {
  const [formData, setFormData] = useState<Partial<SupportingDocs>>({
    lcaCaseNumber: data.lcaCaseNumber || '',
    lcaFile: data.lcaFile || null,
    actualWageMemo: data.actualWageMemo || getDefaultWageMemo(),
    noticePostingProof: data.noticePostingProof || null,
    noticePostingStartDate: data.noticePostingStartDate || '',
    noticePostingEndDate: data.noticePostingEndDate || '',
    noticePostingLocation: data.noticePostingLocation || '',
    noticePostingLocation2: data.noticePostingLocation2 || '',
    benefitsComparisonFile: data.benefitsComparisonFile || null,
    benefitsNotes: data.benefitsNotes || getDefaultBenefitsNotes(),
    isCertifiedLCA: data.isCertifiedLCA ?? true,
    isH1BDependent: data.isH1BDependent ?? false,
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<LCAScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleScanLCA = async () => {
    if (!formData.lcaFile) return;

    setIsScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      const arrayBuffer = await formData.lcaFile.arrayBuffer();
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

      // Auto-fill fields from scan
      if (scanData.caseNumber) {
        updateField('lcaCaseNumber', scanData.caseNumber);
      }
      if (scanData.h1bDependent !== undefined && scanData.h1bDependent !== null) {
        updateField('isH1BDependent', scanData.h1bDependent);
      }
      if (scanData.caseStatus) {
        updateField('isCertifiedLCA', scanData.caseStatus.toLowerCase() === 'certified');
      }

      if (onScanComplete) {
        onScanComplete(scanData);
      }

      toast({
        title: 'LCA Scanned Successfully',
        description: 'Data extracted and applied to wizard fields.',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData as SupportingDocs);
  };

  const updateField = <K extends keyof SupportingDocs>(field: K, value: SupportingDocs[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isComplete = (section: 'lca' | 'wage' | 'notice' | 'benefits') => {
    switch (section) {
      case 'lca':
        return !!formData.lcaCaseNumber || !!formData.lcaFile;
      case 'wage':
        return !!formData.actualWageMemo && formData.actualWageMemo.length > 50;
      case 'notice':
        return !!formData.noticePostingStartDate || !!formData.noticePostingProof;
      case 'benefits':
        return !!formData.benefitsNotes || !!formData.benefitsComparisonFile;
      default:
        return false;
    }
  };

  return (
    <div className="fade-in">
      <div className="paf-section-header">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <FileText className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Supporting Documents</h2>
          <p className="text-sm text-muted-foreground">
            Required documentation for your Public Access File per DOL regulations
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="lca" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lca" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">LCA</span>
              {isComplete('lca') && <Badge variant="secondary" className="h-5 w-5 p-0 justify-center bg-success/20 text-success"><Check className="h-3 w-3" /></Badge>}
            </TabsTrigger>
            <TabsTrigger value="wage" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Wage</span>
              {isComplete('wage') && <Badge variant="secondary" className="h-5 w-5 p-0 justify-center bg-success/20 text-success"><Check className="h-3 w-3" /></Badge>}
            </TabsTrigger>
            <TabsTrigger value="notice" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notice</span>
              {isComplete('notice') && <Badge variant="secondary" className="h-5 w-5 p-0 justify-center bg-success/20 text-success"><Check className="h-3 w-3" /></Badge>}
            </TabsTrigger>
            <TabsTrigger value="benefits" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Benefits</span>
              {isComplete('benefits') && <Badge variant="secondary" className="h-5 w-5 p-0 justify-center bg-success/20 text-success"><Check className="h-3 w-3" /></Badge>}
            </TabsTrigger>
          </TabsList>

          {/* LCA Tab */}
          <TabsContent value="lca" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  Labor Condition Application (LCA)
                </CardTitle>
                <CardDescription>
                  Upload your certified ETA Form 9035/9035E from FLAG.gov
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Compliance Questions - shown in manual mode */}
                {isManualMode && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Is this a Certified LCA?</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Has the LCA been certified by DOL? Select "No" if still in process.
                        </p>
                      </div>
                      <RadioGroup
                        value={formData.isCertifiedLCA ? 'yes' : 'no'}
                        onValueChange={(val) => updateField('isCertifiedLCA', val === 'yes')}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="certifiedYes" />
                          <Label htmlFor="certifiedYes" className="cursor-pointer font-medium">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="certifiedNo" />
                          <Label htmlFor="certifiedNo" className="cursor-pointer font-medium">No</Label>
                        </div>
                      </RadioGroup>
                      {!formData.isCertifiedLCA && (
                        <p className="text-xs text-warning bg-warning/10 p-2 rounded">
                          ⚠ PAF will be saved as "In Process LCA". You can re-upload a certified LCA later from the edit page.
                        </p>
                      )}
                    </div>

                    <div className="border-t border-border pt-4 space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Is this an H-1B Dependent Employer?</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Is the employer H-1B dependent per DOL standards?
                        </p>
                      </div>
                      <RadioGroup
                        value={formData.isH1BDependent ? 'yes' : 'no'}
                        onValueChange={(val) => updateField('isH1BDependent', val === 'yes')}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="h1bDepYes" />
                          <Label htmlFor="h1bDepYes" className="cursor-pointer font-medium">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="h1bDepNo" />
                          <Label htmlFor="h1bDepNo" className="cursor-pointer font-medium">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lcaCaseNumber">LCA Case Number</Label>
                    <Input
                      id="lcaCaseNumber"
                      placeholder="I-200-XXXXX-XXXXXX"
                      value={formData.lcaCaseNumber}
                      onChange={(e) => updateField('lcaCaseNumber', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the case number from your certified LCA
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Certified LCA Document</Label>
                  <FileUploadZone
                    label="Upload Certified LCA (ETA 9035)"
                    file={formData.lcaFile || null}
                    onFileChange={(file) => {
                      updateField('lcaFile', file);
                      setScanResult(null);
                      setScanError(null);
                    }}
                    onRemove={() => {
                      updateField('lcaFile', null);
                      setScanResult(null);
                      setScanError(null);
                    }}
                    accept=".pdf"
                  />
                </div>

                {/* AI Scan Button */}
                {formData.lcaFile && (
                  <div className="space-y-3">
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

                    {scanError && (
                      <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-destructive">Scan Error</p>
                          <p className="text-muted-foreground">{scanError}</p>
                        </div>
                      </div>
                    )}

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
                                <span className="text-muted-foreground">Worksite</span>
                                <span className="font-medium">
                                  {[scanResult.worksiteCity, scanResult.worksiteState].filter(Boolean).join(', ')}
                                </span>
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
                            Extracted data has been applied to your wizard fields. Review and adjust as needed.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-accent mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Where to get your LCA</p>
                    <p className="text-muted-foreground">
                      Download your certified LCA from the{' '}
                      <a
                        href="https://flag.dol.gov"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        FLAG System
                      </a>
                      . Navigate to your case and download the certified PDF.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actual Wage Memo Tab */}
          <TabsContent value="wage" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-accent" />
                  Actual Wage Memorandum
                </CardTitle>
                <CardDescription>
                  Document your wage determination methodology per 20 CFR 655.731
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-success/10 rounded-lg mb-4">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Auto-Generated Content</p>
                    <p className="text-muted-foreground">
                      The PDF automatically includes a complete wage determination memo with position details,
                      SOC code, prevailing wage, actual wage, and methodology factors from your wizard entries.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actualWageMemo">Additional Wage Determination Notes (Optional)</Label>
                  <Textarea
                    id="actualWageMemo"
                    rows={6}
                    placeholder="Add any additional notes about wage determination methodology, comparable employees, or special circumstances..."
                    value={formData.actualWageMemo}
                    onChange={(e) => updateField('actualWageMemo', e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Only add notes here if you have additional information beyond what's auto-generated
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notice Posting Tab */}
          <TabsContent value="notice" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-accent" />
                  Notice Posting Documentation
                </CardTitle>
                <CardDescription>
                  Proof that the LCA posting requirements were satisfied
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="noticePostingStartDate">Posting Start Date</Label>
                    <Input
                      id="noticePostingStartDate"
                      type="date"
                      value={formData.noticePostingStartDate}
                      onChange={(e) => updateField('noticePostingStartDate', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Date the LCA notice was first posted
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noticePostingEndDate">Posting End Date</Label>
                    <Input
                      id="noticePostingEndDate"
                      type="date"
                      value={formData.noticePostingEndDate}
                      onChange={(e) => updateField('noticePostingEndDate', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Date the LCA notice was removed (after 10 business days)
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="noticePostingLocation">Posting Location 1 *</Label>
                    <Input
                      id="noticePostingLocation"
                      placeholder="e.g., Main lobby bulletin board"
                      value={formData.noticePostingLocation}
                      onChange={(e) => updateField('noticePostingLocation', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      First conspicuous location
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noticePostingLocation2">Posting Location 2 *</Label>
                    <Input
                      id="noticePostingLocation2"
                      placeholder="e.g., Break room bulletin board"
                      value={formData.noticePostingLocation2}
                      onChange={(e) => updateField('noticePostingLocation2', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Second conspicuous location
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Posting Proof (Photo/Screenshot)</Label>
                  <FileUploadZone
                    label="Upload proof of notice posting"
                    file={formData.noticePostingProof || null}
                    onFileChange={(file) => updateField('noticePostingProof', file)}
                    onRemove={() => updateField('noticePostingProof', null)}
                  />
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-accent mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Notice Requirements</p>
                    <p className="text-muted-foreground">
                      The LCA must be posted for 10 business days. If there's a collective bargaining 
                      representative, provide notice to them. Otherwise, post in 2 conspicuous locations 
                      at the worksite or via electronic notification.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benefits Comparison Tab */}
          <TabsContent value="benefits" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Benefits Comparison
                </CardTitle>
                <CardDescription>
                  Summary of benefits offered to U.S. workers and H-1B workers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="benefitsNotes">Benefits Summary</Label>
                  <Textarea
                    id="benefitsNotes"
                    rows={10}
                    value={formData.benefitsNotes}
                    onChange={(e) => updateField('benefitsNotes', e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Benefits Documentation (Optional)</Label>
                  <FileUploadZone
                    label="Upload benefits comparison document"
                    file={formData.benefitsComparisonFile || null}
                    onFileChange={(file) => updateField('benefitsComparisonFile', file)}
                    onRemove={() => updateField('benefitsComparisonFile', null)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-6">
          <Button type="button" variant="wizardOutline" size="lg" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" variant="wizard" size="lg">
            Continue to Review
          </Button>
        </div>
      </form>
    </div>
  );
}

function getDefaultWageMemo(): string {
  // Note: The PDF generator automatically includes full wage determination details
  // (position, SOC code, prevailing wage, actual wage, methodology factors).
  // This field is for ADDITIONAL notes only - leave blank if none needed.
  return '';
}

function getDefaultBenefitsNotes(): string {
  return `BENEFITS COMPARISON - U.S. Workers vs. H-1B Workers

The H-1B worker will be offered the same benefits as similarly employed U.S. workers.

BENEFIT                  | U.S. WORKERS  | H-1B WORKERS
-------------------------|---------------|---------------
Health Insurance         | Yes           | Yes
Dental Insurance         | Yes           | Yes
Vision Insurance         | Yes           | Yes
401(k) Retirement Plan   | Yes           | Yes
Paid Time Off (PTO)      | Yes           | Yes
Paid Holidays            | Yes           | Yes
Life Insurance           | Yes           | Yes
Disability Insurance     | Yes           | Yes
Employee Stock Options   | [If applicable]| [If applicable]
Tuition Reimbursement    | [If applicable]| [If applicable]
Professional Development | [If applicable]| [If applicable]

NOTES:
- All benefits are offered on the same terms and conditions
- Eligibility periods are identical for all employees
- No additional costs are imposed on H-1B workers

The employer confirms that H-1B workers are offered benefits on the same 
basis and in accordance with the same criteria as offered to U.S. workers.`;
}
