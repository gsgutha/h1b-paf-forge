import { useState, useCallback } from 'react';
import { FileText, Upload, X, Check, AlertCircle, FileUp, Building2, Bell, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export interface SupportingDocs {
  lcaCaseNumber: string;
  lcaFile: File | null;
  actualWageMemo: string;
  noticePostingProof: File | null;
  noticePostingDate: string;
  noticePostingLocation: string;
  benefitsComparisonFile: File | null;
  benefitsNotes: string;
  employeeName: string;
}

interface SupportingDocsStepProps {
  data: Partial<SupportingDocs>;
  onNext: (data: SupportingDocs) => void;
  onBack: () => void;
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

export function SupportingDocsStep({ data, onNext, onBack }: SupportingDocsStepProps) {
  const [formData, setFormData] = useState<Partial<SupportingDocs>>({
    lcaCaseNumber: data.lcaCaseNumber || '',
    lcaFile: data.lcaFile || null,
    actualWageMemo: data.actualWageMemo || getDefaultWageMemo(),
    noticePostingProof: data.noticePostingProof || null,
    noticePostingDate: data.noticePostingDate || '',
    noticePostingLocation: data.noticePostingLocation || '',
    benefitsComparisonFile: data.benefitsComparisonFile || null,
    benefitsNotes: data.benefitsNotes || getDefaultBenefitsNotes(),
    employeeName: data.employeeName || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData as SupportingDocs);
  };

  const updateField = <K extends keyof SupportingDocs>(field: K, value: SupportingDocs[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isComplete = (section: 'lca' | 'wage' | 'notice' | 'benefits' | 'employee') => {
    switch (section) {
      case 'lca':
        return !!formData.lcaCaseNumber || !!formData.lcaFile;
      case 'wage':
        return !!formData.actualWageMemo && formData.actualWageMemo.length > 50;
      case 'notice':
        return !!formData.noticePostingDate || !!formData.noticePostingProof;
      case 'benefits':
        return !!formData.benefitsNotes || !!formData.benefitsComparisonFile;
      case 'employee':
        return !!formData.employeeName && formData.employeeName.trim().length > 0;
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
            <TabsTrigger value="employee" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Employee</span>
              {isComplete('employee') && <Badge variant="secondary" className="h-5 w-5 p-0 justify-center bg-success/20 text-success"><Check className="h-3 w-3" /></Badge>}
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
                    onFileChange={(file) => updateField('lcaFile', file)}
                    onRemove={() => updateField('lcaFile', null)}
                    accept=".pdf"
                  />
                </div>

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
                <div className="space-y-2">
                  <Label htmlFor="actualWageMemo">Wage Determination Memo</Label>
                  <Textarea
                    id="actualWageMemo"
                    rows={12}
                    value={formData.actualWageMemo}
                    onChange={(e) => updateField('actualWageMemo', e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe how you determine wages for similarly employed workers
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
                    <Label htmlFor="noticePostingDate">Posting Date</Label>
                    <Input
                      id="noticePostingDate"
                      type="date"
                      value={formData.noticePostingDate}
                      onChange={(e) => updateField('noticePostingDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noticePostingLocation">Posting Location</Label>
                    <Input
                      id="noticePostingLocation"
                      placeholder="e.g., Company intranet, break room bulletin board"
                      value={formData.noticePostingLocation}
                      onChange={(e) => updateField('noticePostingLocation', e.target.value)}
                    />
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

          {/* Employee Name Tab */}
          <TabsContent value="employee" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-accent" />
                  Employee Information
                </CardTitle>
                <CardDescription>
                  Enter the H-1B worker's name for the acknowledgement document
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Employee Full Name *</Label>
                  <Input
                    id="employeeName"
                    placeholder="e.g., John A. Smith"
                    value={formData.employeeName}
                    onChange={(e) => updateField('employeeName', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will appear on the Worker Receipt Acknowledgement page
                  </p>
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-accent mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Worker Receipt Statement</p>
                    <p className="text-muted-foreground">
                      The employee name will be used in the Statement of Receipt of Certified Labor 
                      Condition Application, which must be signed by the H-1B worker on or before 
                      they begin work.
                    </p>
                  </div>
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
  return `ACTUAL WAGE DETERMINATION MEMORANDUM

Date: [Date]
Position: [Job Title]
SOC Code: [SOC Code]

WAGE DETERMINATION METHODOLOGY

The employer determines the actual wage for this position based on the following factors:

1. EXPERIENCE LEVEL
   - Entry-level: 0-2 years of relevant experience
   - Mid-level: 3-5 years of relevant experience
   - Senior-level: 6+ years of relevant experience

2. EDUCATION
   - Minimum requirement: [Degree requirement]
   - Advanced degrees may warrant additional compensation

3. SPECIALIZED SKILLS
   - [List any specialized skills that affect wage determination]

4. COMPARABLE EMPLOYEES
   - The wage offered is consistent with wages paid to other employees 
     with similar experience, education, and job responsibilities.

5. WAGE RANGE
   - Minimum: $[amount] per [unit]
   - Maximum: $[amount] per [unit]

CERTIFICATION

I certify that the wage offered to the H-1B worker is at least equal to the 
actual wage paid to other employees with similar experience and qualifications 
for the specific employment in question.

_________________________
Authorized Representative`;
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
