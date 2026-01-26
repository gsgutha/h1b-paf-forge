import { useState } from 'react';
import { FileText, Download, Printer, Edit2, CheckCircle, Bell, Building2, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PAFData } from '@/types/paf';
import { format } from 'date-fns';
import { downloadPAF, printPAF } from '@/lib/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import type { SupportingDocs } from './SupportingDocsStep';

interface ReviewStepProps {
  data: PAFData;
  supportingDocs?: SupportingDocs;
  onBack: () => void;
  onGenerate: () => void;
  onEdit: (step: number) => void;
}

function SectionCard({ 
  title, 
  icon: Icon, 
  children, 
  onEdit 
}: { 
  title: string; 
  icon: React.ElementType;
  children: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Icon className="h-4 w-4 text-accent" />
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-1" /> Edit
          </Button>
        )}
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value?: string | number | boolean }) {
  if (value === undefined || value === '') return null;
  
  let displayValue = String(value);
  if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No';
  }
  
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right max-w-[60%]">{displayValue}</span>
    </div>
  );
}

export function ReviewStep({ data, supportingDocs, onBack, onGenerate, onEdit }: ReviewStepProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const formatCurrency = (amount: number, unit: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
    return `${formatted} / ${unit}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await downloadPAF(data, supportingDocs);
      toast({
        title: "PAF Downloaded!",
        description: "Your complete Public Access File with all attachments has been saved.",
      });
      onGenerate();
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Download Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
      await printPAF(data, supportingDocs);
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print Failed",
        description: "There was an error opening the print preview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="paf-section-header">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
          <CheckCircle className="h-5 w-5 text-success" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Review & Generate</h2>
          <p className="text-sm text-muted-foreground">Review all information before generating your PAF</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Visa Type Banner */}
        <div className="rounded-lg hero-gradient p-6 text-primary-foreground">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <Badge variant="secondary" className="mb-2 bg-white/20 text-white border-white/30">
                {data.visaType}
              </Badge>
              <h3 className="text-2xl font-bold">{data.job.jobTitle}</h3>
              <p className="mt-1 text-primary-foreground/80">
                SOC: {data.job.socCode} - {data.job.socTitle}
              </p>
              {supportingDocs?.lcaCaseNumber && (
                <p className="mt-2 text-sm text-primary-foreground/70">
                  LCA Case: {supportingDocs.lcaCaseNumber}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-primary-foreground/70">Employment Period</p>
              <p className="font-semibold">
                {formatDate(data.job.beginDate)} - {formatDate(data.job.endDate)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SectionCard title="Employer Information" icon={FileText} onEdit={() => onEdit(1)}>
            <DataRow label="Legal Business Name" value={data.employer.legalBusinessName} />
            <DataRow label="Trade Name / DBA" value={data.employer.tradeName} />
            <DataRow label="Address" value={`${data.employer.address1}${data.employer.address2 ? `, ${data.employer.address2}` : ''}`} />
            <DataRow label="City, State ZIP" value={`${data.employer.city}, ${data.employer.state} ${data.employer.postalCode}`} />
            <DataRow label="Telephone" value={data.employer.telephone} />
            <DataRow label="FEIN" value={data.employer.fein} />
            <DataRow label="NAICS Code" value={data.employer.naicsCode} />
          </SectionCard>

          <SectionCard title="Job Details" icon={FileText} onEdit={() => onEdit(2)}>
            <DataRow label="Job Title" value={data.job.jobTitle} />
            <DataRow label="SOC Code" value={`${data.job.socCode} - ${data.job.socTitle}`} />
            {data.job.onetCode && (
              <DataRow label="O*NET Code" value={`${data.job.onetCode} - ${data.job.onetTitle}`} />
            )}
            <DataRow label="Full-Time" value={data.job.isFullTime} />
            <DataRow label="Workers Needed" value={data.job.workersNeeded} />
            <DataRow 
              label="Offered Wage" 
              value={data.job.wageRateTo 
                ? `${formatCurrency(data.job.wageRateFrom, data.job.wageUnit)} - ${formatCurrency(data.job.wageRateTo, data.job.wageUnit)}`
                : formatCurrency(data.job.wageRateFrom, data.job.wageUnit)
              } 
            />
          </SectionCard>

          <SectionCard title="Worksite Location" icon={FileText} onEdit={() => onEdit(3)}>
            <DataRow label="Address" value={`${data.worksite.address1}${data.worksite.address2 ? `, ${data.worksite.address2}` : ''}`} />
            <DataRow label="City, State ZIP" value={`${data.worksite.city}, ${data.worksite.state} ${data.worksite.postalCode}`} />
            <DataRow label="County" value={data.worksite.county} />
            <DataRow label="Wage Area" value={data.worksite.areaName} />
            <DataRow label="Area Code" value={data.worksite.areaCode} />
          </SectionCard>

          <SectionCard title="Wage Information" icon={FileText} onEdit={() => onEdit(4)}>
            <DataRow label="Prevailing Wage" value={formatCurrency(data.wage.prevailingWage, data.wage.prevailingWageUnit)} />
            <DataRow label="Wage Level" value={data.wage.wageLevel} />
            <DataRow label="Wage Source" value={data.wage.wageSource} />
            <DataRow label="Source Date" value={formatDate(data.wage.wageSourceDate)} />
            <div className="border-t border-border mt-3 pt-3">
              <DataRow label="Actual Wage" value={formatCurrency(data.wage.actualWage, data.wage.actualWageUnit)} />
            </div>
            <div className={`mt-3 p-2 rounded text-xs font-medium ${
              data.wage.actualWage >= data.wage.prevailingWage 
                ? 'bg-success/10 text-success' 
                : 'bg-destructive/10 text-destructive'
            }`}>
              {data.wage.actualWage >= data.wage.prevailingWage 
                ? '✓ Wage is compliant'
                : '✗ Wage compliance issue'
              }
            </div>
          </SectionCard>
        </div>

        {/* Supporting Documents Summary */}
        {supportingDocs && (
          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard title="LCA & Wage Documentation" icon={Building2} onEdit={() => onEdit(5)}>
              <DataRow label="LCA Case Number" value={supportingDocs.lcaCaseNumber} />
              <DataRow label="LCA Document" value={supportingDocs.lcaFile?.name || 'Not uploaded'} />
              <DataRow label="Wage Memo" value={supportingDocs.actualWageMemo ? 'Documented' : 'Not provided'} />
            </SectionCard>

            <SectionCard title="Notice & Benefits" icon={Bell} onEdit={() => onEdit(5)}>
              <DataRow label="Notice Posted" value={supportingDocs.noticePostingDate ? formatDate(supportingDocs.noticePostingDate) : 'Not recorded'} />
              <DataRow label="Posting Location" value={supportingDocs.noticePostingLocation} />
              <DataRow label="Posting Proof" value={supportingDocs.noticePostingProof?.name || 'Not uploaded'} />
              <DataRow label="Benefits Comparison" value={supportingDocs.benefitsNotes ? 'Documented' : 'Not provided'} />
            </SectionCard>

            <SectionCard title="Employee & Signing Authority" icon={User} onEdit={() => onEdit(5)}>
              <DataRow label="H-1B Worker Name" value={supportingDocs.employeeName || 'Not provided'} />
              <div className="border-t border-border mt-3 pt-3">
                <DataRow label="Signing Authority" value={supportingDocs.signingAuthorityName || 'Not provided'} />
                <DataRow label="Title" value={supportingDocs.signingAuthorityTitle || 'Not provided'} />
              </div>
              {!supportingDocs.signingAuthorityName && (
                <div className="mt-3 p-2 rounded text-xs bg-muted text-muted-foreground">
                  ⚠ Documents will show "Authorized Representative" as default
                </div>
              )}
            </SectionCard>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6">
          <Button type="button" variant="wizardOutline" size="lg" onClick={onBack}>
            Back to Edit
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={handlePrint} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              Print Preview
            </Button>
            <Button variant="wizard" size="lg" onClick={handleDownload} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isGenerating ? 'Generating...' : 'Download PAF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
