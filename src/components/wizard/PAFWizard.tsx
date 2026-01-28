import { useState } from 'react';
import { WizardProgress } from './WizardProgress';
import { LCASelectionStep, type LCARecord } from './steps/LCASelectionStep';
import { EmployerInfoStep } from './steps/EmployerInfoStep';
import { JobDetailsStep } from './steps/JobDetailsStep';
import { WorksiteStep } from './steps/WorksiteStep';
import { WageInfoStep } from './steps/WageInfoStep';
import { SupportingDocsStep, type SupportingDocs } from './steps/SupportingDocsStep';
import { ReviewStep } from './steps/ReviewStep';
import type { PAFData, Employer, JobDetails, WorksiteLocation, WageInfo } from '@/types/paf';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const steps = [
  { id: 0, title: 'Select LCA', description: 'Choose case' },
  { id: 1, title: 'Employer', description: 'Company info' },
  { id: 2, title: 'Job Details', description: 'Position & SOC' },
  { id: 3, title: 'Worksite', description: 'Location' },
  { id: 4, title: 'Wages', description: 'Prevailing wage' },
  { id: 5, title: 'Documents', description: 'LCA & Supporting' },
  { id: 6, title: 'Review', description: 'Generate PAF' },
];

export interface ExtendedPAFData extends PAFData {
  supportingDocs?: SupportingDocs;
  lcaId?: string; // Track the selected LCA ID
}

const initialPAFData: Partial<ExtendedPAFData> = {
  visaType: 'H-1B',
  isH1BDependent: false,
  isWillfulViolator: false,
  employer: {} as Employer,
  job: {} as JobDetails,
  worksite: {} as WorksiteLocation,
  wage: {} as WageInfo,
  supportingDocs: undefined,
  lcaId: undefined,
};

// Helper to map LCA wage unit to PAF wage unit
function mapWageUnit(unit: string | null): 'Hour' | 'Week' | 'Bi-Weekly' | 'Month' | 'Year' {
  if (!unit) return 'Year';
  const lower = unit.toLowerCase();
  if (lower.includes('hour')) return 'Hour';
  if (lower.includes('week')) return 'Week';
  if (lower.includes('month')) return 'Month';
  return 'Year';
}

// Helper to map LCA wage level to PAF wage level
function mapWageLevel(level: string | null): 'Level I' | 'Level II' | 'Level III' | 'Level IV' {
  if (!level) return 'Level I';
  if (level.includes('IV') || level.includes('4')) return 'Level IV';
  if (level.includes('III') || level.includes('3')) return 'Level III';
  if (level.includes('II') || level.includes('2')) return 'Level II';
  return 'Level I';
}

export function PAFWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [pafData, setPafData] = useState<Partial<ExtendedPAFData>>(initialPAFData);
  const [selectedLca, setSelectedLca] = useState<LCARecord | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleLCASelect = (lca: LCARecord) => {
    setSelectedLca(lca);
    
    // Auto-fill all available fields from LCA
    const employer: Employer = {
      legalBusinessName: lca.employer_name,
      address1: lca.employer_address1 || '',
      address2: lca.employer_address2 || undefined,
      city: lca.employer_city || '',
      state: lca.employer_state || '',
      postalCode: lca.employer_postal_code || '',
      country: lca.employer_country || 'United States',
      telephone: lca.employer_phone || '',
      fein: lca.employer_fein || '',
      naicsCode: lca.naics_code || '',
    };

    const job: JobDetails = {
      jobTitle: lca.job_title || '',
      socCode: lca.soc_code || '',
      socTitle: lca.soc_title || '',
      isFullTime: lca.full_time_position ?? true,
      beginDate: lca.begin_date || '',
      endDate: lca.end_date || '',
      wageRateFrom: lca.wage_rate_from || 0,
      wageRateTo: lca.wage_rate_to || undefined,
      wageUnit: mapWageUnit(lca.wage_unit),
      workersNeeded: lca.total_workers || 1,
    };

    const worksite: WorksiteLocation = {
      address1: '', // Not in LCA disclosure
      city: lca.worksite_city || '',
      state: lca.worksite_state || '',
      postalCode: lca.worksite_postal_code || '',
      county: lca.worksite_county || undefined,
    };

    const wage: Partial<WageInfo> = {
      prevailingWage: lca.prevailing_wage || 0,
      prevailingWageUnit: mapWageUnit(lca.wage_unit),
      wageLevel: mapWageLevel(lca.pw_wage_level),
      wageSource: 'OFLC Online Wage Library',
      wageSourceDate: lca.decision_date || new Date().toISOString().split('T')[0],
    };

    setPafData((prev) => ({
      ...prev,
      lcaId: lca.id,
      caseNumber: lca.case_number,
      caseStatus: 'Certified',
      visaType: lca.visa_class === 'H-1B' ? 'H-1B' : 'H-1B',
      isH1BDependent: lca.h1b_dependent ?? false,
      isWillfulViolator: lca.willful_violator ?? false,
      employer,
      job,
      worksite,
      wage: wage as WageInfo,
    }));

    setCurrentStep(1);
  };

  const handleEmployerNext = (employer: Employer) => {
    setPafData((prev) => ({ ...prev, employer }));
    setCurrentStep(2);
  };

  const handleJobNext = (job: JobDetails) => {
    setPafData((prev) => ({ ...prev, job }));
    setCurrentStep(3);
  };

  const handleWorksiteNext = (worksite: WorksiteLocation) => {
    setPafData((prev) => ({ ...prev, worksite }));
    setCurrentStep(4);
  };

  const handleWageNext = (wage: WageInfo) => {
    setPafData((prev) => ({ ...prev, wage }));
    setCurrentStep(5);
  };

  const handleSupportingDocsNext = (supportingDocs: SupportingDocs) => {
    setPafData((prev) => ({ ...prev, supportingDocs }));
    setCurrentStep(6);
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
  };

  const handleGenerate = async () => {
    // Mark LCA as PAF generated
    if (pafData.lcaId) {
      const { error } = await supabase
        .from('lca_disclosure')
        .update({ 
          paf_generated: true, 
          paf_generated_at: new Date().toISOString() 
        })
        .eq('id', pafData.lcaId);

      if (error) {
        toast({
          title: "Error updating LCA status",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Invalidate queries to refresh the LCA lists
      queryClient.invalidateQueries({ queryKey: ['pending-lcas'] });
      queryClient.invalidateQueries({ queryKey: ['generated-lcas'] });
    }

    toast({
      title: "PAF Generated Successfully!",
      description: "Your Public Access File has been created and is ready for download.",
    });

    // Reset wizard for next PAF
    setPafData(initialPAFData);
    setSelectedLca(null);
    setCurrentStep(0);
  };

  const goBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <WizardProgress 
          steps={steps} 
          currentStep={currentStep}
          onStepClick={(step) => step < currentStep && setCurrentStep(step)}
        />
      </div>

      <div className="paf-section">
        {currentStep === 0 && (
          <LCASelectionStep onSelect={handleLCASelect} />
        )}

        {currentStep === 1 && (
          <EmployerInfoStep 
            data={pafData.employer || {}} 
            onNext={handleEmployerNext}
            onBack={goBack}
          />
        )}

        {currentStep === 2 && (
          <JobDetailsStep 
            data={pafData.job || {}} 
            onNext={handleJobNext}
            onBack={goBack}
          />
        )}

        {currentStep === 3 && (
          <WorksiteStep 
            data={pafData.worksite || {}} 
            onNext={handleWorksiteNext}
            onBack={goBack}
          />
        )}

        {currentStep === 4 && (
          <WageInfoStep 
            data={pafData.wage || {}} 
            worksite={pafData.worksite}
            onNext={handleWageNext}
            onBack={goBack}
          />
        )}

        {currentStep === 5 && (
          <SupportingDocsStep
            data={pafData.supportingDocs || {}}
            onNext={handleSupportingDocsNext}
            onBack={goBack}
          />
        )}

        {currentStep === 6 && pafData.employer && pafData.job && pafData.worksite && pafData.wage && (
          <ReviewStep 
            data={pafData as PAFData}
            supportingDocs={pafData.supportingDocs}
            onBack={goBack}
            onGenerate={handleGenerate}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
}
