import { useState, useCallback } from 'react';
import { FileText, Upload, X, Check, AlertCircle, FileUp, Building2, Bell, Users, Loader2, Sparkles, ShieldCheck, ClipboardList } from 'lucide-react';
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
  employerPhone?: string;
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
  worksiteAddress?: string;
  worksiteCity?: string;
  worksiteState?: string;
  worksitePostalCode?: string;
  worksiteCounty?: string;
  worksiteName?: string;
  wageSourceYear?: string;
  hasSecondaryWorksite?: boolean;
  secondaryWorksiteAddress?: string;
  secondaryWorksiteCity?: string;
  secondaryWorksiteState?: string;
  secondaryWorksitePostalCode?: string;
  secondaryWorksiteCounty?: string;
  secondaryWorksiteName?: string;
  h1bDependent?: boolean;
  willfulViolator?: boolean;
  visaClass?: string;
  totalWorkers?: number;
  // Section H-4 exemption box verification
  h1bExemptionChecked?: boolean | null;
  // LCA filing date for dependency worksheet
  lcaReceivedDate?: string | null;
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
  noticePostingLocation3?: string;
  noticePostingLocation4?: string;
  benefitsComparisonFile: File | null;
  benefitsNotes: string;
  isCertifiedLCA?: boolean;
  isH1BDependent?: boolean;

  // H-1B Dependency Worksheet — stamped with LCA filing date
  totalFTECount?: number;
  totalH1BCount?: number;
  dependencyCalculationDate?: string;

  // Exemption type (for H-1B dependent employers)
  exemptionType?: 'wage' | 'degree' | 'none';

  // Section H-4 exemption box verified from LCA scan
  h1bExemptionChecked?: boolean | null;

  // Recruitment details (for non-exempt H-1B dependent employers)
  recruitmentStartDate?: string;
  recruitmentEndDate?: string;
  recruitmentPlatforms?: string;
  usApplicantsCount?: number;
  nonSelectionReasons?: string;

  // Comparable wage details — one of these paths must be explicitly chosen
  comparableWorkersCount?: number;
  comparableWageMin?: number;
  comparableWageMax?: number;
  noComparableWorkers?: boolean;
}

interface SupportingDocsStepProps {
  data: Partial<SupportingDocs>;
  onNext: (data: SupportingDocs) => void;
  onBack: () => void;
  isManualMode?: boolean;
  hasSecondaryWorksite?: boolean;
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

export function SupportingDocsStep({ data, onNext, onBack, isManualMode, hasSecondaryWorksite, onScanComplete }: SupportingDocsStepProps) {
  const [formData, setFormData] = useState<Partial<SupportingDocs>>({
    lcaCaseNumber: data.lcaCaseNumber || '',
    lcaFile: data.lcaFile || null,
    actualWageMemo: data.actualWageMemo || getDefaultWageMemo(),
    noticePostingProof: data.noticePostingProof || null,
    noticePostingStartDate: data.noticePostingStartDate || '',
    noticePostingEndDate: data.noticePostingEndDate || '',
    noticePostingLocation: data.noticePostingLocation || '',
    noticePostingLocation2: data.noticePostingLocation2 || '',
    noticePostingLocation3: data.noticePostingLocation3 || '',
    noticePostingLocation4: data.noticePostingLocation4 || '',
    benefitsComparisonFile: data.benefitsComparisonFile || null,
    benefitsNotes: data.benefitsNotes || getDefaultBenefitsNotes(),
    isCertifiedLCA: data.isCertifiedLCA ?? true,
    isH1BDependent: data.isH1BDependent, // undefined = not yet chosen; user must explicitly pick in H-1B tab
    // H-1B Compliance fields
    totalFTECount: data.totalFTECount || undefined,
    totalH1BCount: data.totalH1BCount || undefined,
    dependencyCalculationDate: data.dependencyCalculationDate || '',
    exemptionType: data.exemptionType || 'wage',
    recruitmentStartDate: data.recruitmentStartDate || '',
    recruitmentEndDate: data.recruitmentEndDate || '',
    recruitmentPlatforms: data.recruitmentPlatforms || 'LinkedIn, Indeed, Company Website',
    usApplicantsCount: data.usApplicantsCount || undefined,
    nonSelectionReasons: data.nonSelectionReasons || '',
    comparableWorkersCount: data.comparableWorkersCount || undefined,
    comparableWageMin: data.comparableWageMin || undefined,
    comparableWageMax: data.comparableWageMax || undefined,
    noComparableWorkers: data.noComparableWorkers ?? false,
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
      // NOTE: h1bDependent from scan is shown as info only — user must explicitly override in H-1B tab
      if (scanData.caseStatus) {
        updateField('isCertifiedLCA', scanData.caseStatus.toLowerCase() === 'certified');
      }
      // Store H-4 exemption verification result from LCA scan
      if (scanData.h1bExemptionChecked !== undefined) {
        updateField('h1bExemptionChecked', scanData.h1bExemptionChecked);
      }
      // Auto-populate dependency calculation date from LCA filing date
      if (scanData.lcaReceivedDate) {
        updateField('dependencyCalculationDate', scanData.lcaReceivedDate);
      } else if (scanData.beginDate && !formData.dependencyCalculationDate) {
        // Fallback: use LCA begin date if received date not available
        updateField('dependencyCalculationDate', scanData.beginDate);
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

    // Validate comparable wage: must explicitly choose "no comparables" OR provide count + wage range
    const hasComparableData = formData.noComparableWorkers ||
      (formData.comparableWorkersCount && formData.comparableWageMin && formData.comparableWageMax);
    if (!hasComparableData) {
      toast({
        title: 'Comparable Wage Required',
        description: 'Please complete the Comparable Wage section in the H-1B tab: either enter worker count + wage range, or check "No similarly employed workers".',
        variant: 'destructive',
      });
      return;
    }

    onNext(formData as SupportingDocs);
  };

  const updateField = <K extends keyof SupportingDocs>(field: K, value: SupportingDocs[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isComplete = (section: 'lca' | 'h1b' | 'wage' | 'notice' | 'benefits') => {
    switch (section) {
      case 'lca':
        return !!formData.lcaCaseNumber || !!formData.lcaFile;
      case 'h1b': {
        const dependencySet = formData.isH1BDependent !== undefined;
        const hasWorksheet = !!formData.totalFTECount && !!formData.totalH1BCount && !!formData.dependencyCalculationDate;
        const hasComparable = formData.noComparableWorkers ||
          (!!formData.comparableWorkersCount && !!formData.comparableWageMin && !!formData.comparableWageMax);
        return dependencySet && hasWorksheet && !!hasComparable;
      }
      case 'wage':
        return true; // Auto-generated, always complete
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="lca" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">LCA</span>
              {isComplete('lca') && <Badge variant="secondary" className="h-5 w-5 p-0 justify-center bg-success/20 text-success"><Check className="h-3 w-3" /></Badge>}
            </TabsTrigger>
            <TabsTrigger value="h1b" className="flex items-center gap-1">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">H-1B</span>
              {isComplete('h1b') && <Badge variant="secondary" className="h-5 w-5 p-0 justify-center bg-success/20 text-success"><Check className="h-3 w-3" /></Badge>}
            </TabsTrigger>
            <TabsTrigger value="wage" className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Wage</span>
              {isComplete('wage') && <Badge variant="secondary" className="h-5 w-5 p-0 justify-center bg-success/20 text-success"><Check className="h-3 w-3" /></Badge>}
            </TabsTrigger>
            <TabsTrigger value="notice" className="flex items-center gap-1">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notice</span>
              {isComplete('notice') && <Badge variant="secondary" className="h-5 w-5 p-0 justify-center bg-success/20 text-success"><Check className="h-3 w-3" /></Badge>}
            </TabsTrigger>
            <TabsTrigger value="benefits" className="flex items-center gap-1">
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
                            {scanResult.h1bDependent && scanResult.h1bExemptionChecked !== undefined && scanResult.h1bExemptionChecked !== null && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Section H-4 Exemption Box</span>
                                <Badge variant={scanResult.h1bExemptionChecked ? 'default' : 'destructive'}>
                                  {scanResult.h1bExemptionChecked ? '✓ Checked' : '✗ Not Checked'}
                                </Badge>
                              </div>
                            )}
                            {scanResult.lcaReceivedDate && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">LCA Filing Date</span>
                                <span className="font-medium">{scanResult.lcaReceivedDate}</span>
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

          {/* H-1B Compliance Tab */}
          <TabsContent value="h1b" className="mt-6">
            <div className="space-y-6">
              {/* H-1B Dependency Status — user must explicitly set this */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-accent" />
                    H-1B Dependent Employer Status
                  </CardTitle>
                  <CardDescription>
                    Confirm whether your company is classified as an H-1B dependent employer under 20 CFR § 655.736
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Show scanned value as info only */}
                  {scanResult?.h1bDependent !== undefined && scanResult?.h1bDependent !== null && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border text-sm">
                      <span className="text-muted-foreground">LCA (Section H) shows:</span>
                      <Badge variant={scanResult.h1bDependent ? 'destructive' : 'secondary'}>
                        {scanResult.h1bDependent ? 'H-1B Dependent' : 'Not Dependent'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">— override below if your current status differs</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Is this employer H-1B Dependent? *</Label>
                    <p className="text-xs text-muted-foreground">
                      An employer is H-1B dependent if H-1B workers make up ≥15% of its workforce (or ≥25% if &lt;26 FTE employees).
                    </p>
                    <RadioGroup
                      value={formData.isH1BDependent === true ? 'yes' : formData.isH1BDependent === false ? 'no' : ''}
                      onValueChange={(val) => updateField('isH1BDependent', val === 'yes')}
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="h1bDepYesH1BTab" />
                        <Label htmlFor="h1bDepYesH1BTab" className="cursor-pointer font-medium text-destructive">Yes — H-1B Dependent</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="h1bDepNoH1BTab" />
                        <Label htmlFor="h1bDepNoH1BTab" className="cursor-pointer font-medium text-success">No — Not Dependent</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>

              {/* Dependency Worksheet */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-accent" />
                    H-1B Dependency Worksheet
                  </CardTitle>
                  <CardDescription>
                    Document your FTE / H-1B count used to determine dependency status per 20 CFR § 655.736
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="totalFTECount">Total FTE Employees *</Label>
                      <Input
                        id="totalFTECount"
                        type="number"
                        min={1}
                        placeholder="e.g. 87"
                        value={formData.totalFTECount ?? ''}
                        onChange={(e) => updateField('totalFTECount', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      <p className="text-xs text-muted-foreground">Full-time equivalent headcount</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalH1BCount">Total H-1B Workers *</Label>
                      <Input
                        id="totalH1BCount"
                        type="number"
                        min={0}
                        placeholder="e.g. 14"
                        value={formData.totalH1BCount ?? ''}
                        onChange={(e) => updateField('totalH1BCount', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      <p className="text-xs text-muted-foreground">Current H-1B workers employed</p>
                    </div>
                    <div className="space-y-2">
                      <Label>H-1B Percentage</Label>
                      <div className="h-10 flex items-center px-3 rounded-md border border-border bg-muted/50 text-sm font-medium">
                        {formData.totalFTECount && formData.totalH1BCount
                          ? `${((formData.totalH1BCount / formData.totalFTECount) * 100).toFixed(1)}%`
                          : '—'}
                      </div>
                      <p className="text-xs text-muted-foreground">Auto-calculated</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dependencyCalculationDate">Date Calculation Performed *</Label>
                    <Input
                      id="dependencyCalculationDate"
                      type="date"
                      value={formData.dependencyCalculationDate ?? ''}
                      onChange={(e) => updateField('dependencyCalculationDate', e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                  {formData.totalFTECount && formData.totalH1BCount && (
                    <div className={`p-3 rounded-lg text-sm ${
                      formData.isH1BDependent ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
                    }`}>
                      {formData.isH1BDependent
                        ? `⚠ H-1B Dependent: ${formData.totalH1BCount} H-1B workers out of ${formData.totalFTECount} FTEs (${((formData.totalH1BCount / formData.totalFTECount) * 100).toFixed(1)}%)`
                        : `✓ Not H-1B Dependent: ${formData.totalH1BCount} H-1B workers out of ${formData.totalFTECount} FTEs (${((formData.totalH1BCount / formData.totalFTECount) * 100).toFixed(1)}%)`}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Exemption Type - only show if H-1B dependent */}
              {formData.isH1BDependent && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Exemption Documentation</CardTitle>
                    <CardDescription>
                      How does this worker qualify as exempt from additional attestations?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup
                      value={formData.exemptionType || 'wage'}
                      onValueChange={(val) => updateField('exemptionType', val as 'wage' | 'degree' | 'none')}
                      className="space-y-3"
                    >
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                        <RadioGroupItem value="wage" id="exemptWage" className="mt-0.5" />
                        <Label htmlFor="exemptWage" className="cursor-pointer">
                          <p className="font-medium">Wage Exemption — Salary ≥ $60,000/year</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Worker's annualized wage meets or exceeds $60,000 (INA § 212(n)(3)(B)(i))</p>
                        </Label>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                        <RadioGroupItem value="degree" id="exemptDegree" className="mt-0.5" />
                        <Label htmlFor="exemptDegree" className="cursor-pointer">
                          <p className="font-medium">Degree Exemption — Master's Degree or Equivalent</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Worker holds a U.S. Master's degree or equivalent in a specialty related to the employment (INA § 212(n)(3)(B)(ii))</p>
                        </Label>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                        <RadioGroupItem value="none" id="exemptNone" className="mt-0.5" />
                        <Label htmlFor="exemptNone" className="cursor-pointer">
                          <p className="font-medium text-destructive">Non-Exempt — Full Attestations Required</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Worker does not qualify for exemption. Recruitment summary and displacement attestations are required.</p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

              {/* Recruitment Details - only show if non-exempt */}
              {formData.isH1BDependent && formData.exemptionType === 'none' && (
                <Card className="border-warning/30">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-warning" />
                      Recruitment Summary Details
                    </CardTitle>
                    <CardDescription>
                      Required for non-exempt H-1B dependent employers per 20 CFR § 655.739
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="recruitmentStartDate">Recruitment Start Date</Label>
                        <Input
                          id="recruitmentStartDate"
                          type="date"
                          value={formData.recruitmentStartDate ?? ''}
                          onChange={(e) => updateField('recruitmentStartDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recruitmentEndDate">Recruitment End Date</Label>
                        <Input
                          id="recruitmentEndDate"
                          type="date"
                          value={formData.recruitmentEndDate ?? ''}
                          onChange={(e) => updateField('recruitmentEndDate', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recruitmentPlatforms">Platforms / Where Ads Were Posted</Label>
                      <Input
                        id="recruitmentPlatforms"
                        placeholder="e.g. LinkedIn, Indeed, Company Website, Dice"
                        value={formData.recruitmentPlatforms ?? ''}
                        onChange={(e) => updateField('recruitmentPlatforms', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Comma-separated list of job boards and platforms used</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="usApplicantsCount">Number of U.S. Applicants Reviewed</Label>
                      <Input
                        id="usApplicantsCount"
                        type="number"
                        min={0}
                        placeholder="e.g. 12"
                        value={formData.usApplicantsCount ?? ''}
                        onChange={(e) => updateField('usApplicantsCount', e.target.value ? Number(e.target.value) : undefined)}
                        className="max-w-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nonSelectionReasons">Lawful Job-Related Reasons for Non-Selection</Label>
                      <Textarea
                        id="nonSelectionReasons"
                        rows={4}
                        placeholder="e.g. U.S. applicants lacked required experience with [specific technology/skill]. No applicant met the minimum qualification of [X years] in [specific area]..."
                        value={formData.nonSelectionReasons ?? ''}
                        onChange={(e) => updateField('nonSelectionReasons', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Describe the lawful, job-related reasons no qualified U.S. worker was selected</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comparable Wage Details — Required */}
              <Card className={
                !formData.noComparableWorkers && !(formData.comparableWorkersCount && formData.comparableWageMin && formData.comparableWageMax)
                  ? 'border-warning/50'
                  : ''
              }>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    Comparable Wage Details
                    <Badge variant="secondary" className="text-xs font-normal bg-warning/15 text-warning border-warning/30">Required</Badge>
                  </CardTitle>
                  <CardDescription>
                    Required per 20 CFR § 655.731 — document wages of similarly employed U.S. workers, or confirm none exist
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                    <input
                      type="checkbox"
                      id="noComparableWorkers"
                      checked={formData.noComparableWorkers ?? false}
                      onChange={(e) => {
                        updateField('noComparableWorkers', e.target.checked);
                        if (e.target.checked) {
                          updateField('comparableWorkersCount', undefined);
                          updateField('comparableWageMin', undefined);
                          updateField('comparableWageMax', undefined);
                        }
                      }}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <Label htmlFor="noComparableWorkers" className="cursor-pointer">
                      <span className="font-medium">No similarly employed U.S. workers exist in this position at this company</span>
                      <p className="text-xs text-muted-foreground font-normal mt-0.5">This is the first H-1B worker hired into this role — no internal comparables available</p>
                    </Label>
                  </div>
                  {!formData.noComparableWorkers && (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="comparableWorkersCount">Number of Similarly Employed Workers</Label>
                        <Input
                          id="comparableWorkersCount"
                          type="number"
                          min={1}
                          placeholder="e.g. 5"
                          value={formData.comparableWorkersCount ?? ''}
                          onChange={(e) => updateField('comparableWorkersCount', e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="comparableWageMin">Wage Range — Min ($/yr)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            id="comparableWageMin"
                            type="number"
                            min={0}
                            step={1000}
                            placeholder="85000"
                            value={formData.comparableWageMin ?? ''}
                            onChange={(e) => updateField('comparableWageMin', e.target.value ? Number(e.target.value) : undefined)}
                            className="pl-7"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="comparableWageMax">Wage Range — Max ($/yr)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            id="comparableWageMax"
                            type="number"
                            min={0}
                            step={1000}
                            placeholder="120000"
                            value={formData.comparableWageMax ?? ''}
                            onChange={(e) => updateField('comparableWageMax', e.target.value ? Number(e.target.value) : undefined)}
                            className="pl-7"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {!formData.noComparableWorkers && !(formData.comparableWorkersCount && formData.comparableWageMin && formData.comparableWageMax) && (
                    <p className="text-xs text-warning bg-warning/10 p-2 rounded">
                      ⚠ Required: Enter the count and wage range of similarly employed workers, or check the box above if none exist.
                    </p>
                  )}
                  {formData.noComparableWorkers && (
                    <p className="text-xs text-success bg-success/10 p-2 rounded">
                      ✓ Confirmed: No comparable workers. This will be noted in the Actual Wage Determination.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
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
                    <Label htmlFor="noticePostingEndDate" className={isManualMode && !formData.isCertifiedLCA ? 'text-muted-foreground' : ''}>
                      Post Remove Date
                    </Label>
                    {isManualMode && !formData.isCertifiedLCA ? (
                      <>
                        <Input
                          id="noticePostingEndDate"
                          type="date"
                          value=""
                          disabled
                          className="bg-muted/50 cursor-not-allowed"
                        />
                        <p className="text-xs text-warning bg-warning/10 p-2 rounded">
                          ⚠ Post remove date will be available after you upload a certified LCA from the edit page.
                        </p>
                      </>
                    ) : (
                      <>
                        <Input
                          id="noticePostingEndDate"
                          type="date"
                          value={formData.noticePostingEndDate}
                          onChange={(e) => updateField('noticePostingEndDate', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Date the LCA notice was removed (after 10 business days)
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="noticePostingLocation">Primary Location 1 *</Label>
                    <Input
                      id="noticePostingLocation"
                      placeholder="e.g., Main lobby bulletin board"
                      value={formData.noticePostingLocation}
                      onChange={(e) => updateField('noticePostingLocation', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      First conspicuous location at primary worksite
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noticePostingLocation2">Primary Location 2 *</Label>
                    <Input
                      id="noticePostingLocation2"
                      placeholder="e.g., Break room bulletin board"
                      value={formData.noticePostingLocation2}
                      onChange={(e) => updateField('noticePostingLocation2', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Second conspicuous location at primary worksite
                    </p>
                  </div>
                </div>

                {/* Secondary worksite posting locations */}
                {hasSecondaryWorksite && (
                  <div className="space-y-4 rounded-lg border border-accent/30 p-4 bg-accent/5">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-accent" />
                      <p className="text-sm font-medium text-foreground">Secondary Worksite Posting Locations</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="noticePostingLocation3">Secondary Location 1 *</Label>
                        <Input
                          id="noticePostingLocation3"
                          placeholder="e.g., Client site reception area"
                          value={formData.noticePostingLocation3}
                          onChange={(e) => updateField('noticePostingLocation3', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          First conspicuous location at secondary worksite
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="noticePostingLocation4">Secondary Location 2 *</Label>
                        <Input
                          id="noticePostingLocation4"
                          placeholder="e.g., Client site break room"
                          value={formData.noticePostingLocation4}
                          onChange={(e) => updateField('noticePostingLocation4', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Second conspicuous location at secondary worksite
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Posting Proof (Photo/Screenshot)</Label>
                    <Badge variant="secondary" className="text-xs font-normal">Optional</Badge>
                  </div>
                  <FileUploadZone
                    label="Upload proof of notice posting (photo, affidavit, or screenshot)"
                    file={formData.noticePostingProof || null}
                    onFileChange={(file) => updateField('noticePostingProof', file)}
                    onRemove={() => updateField('noticePostingProof', null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended for audit defense. Retain the original proof internally even if not uploaded here.
                  </p>
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
