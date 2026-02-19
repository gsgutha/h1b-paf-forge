import { useState } from 'react';
import { WizardProgress } from './WizardProgress';
import { LCASelectionStep, type LCARecord } from './steps/LCASelectionStep';
import { EmployerInfoStep } from './steps/EmployerInfoStep';
import { JobDetailsStep } from './steps/JobDetailsStep';
import { WorksiteStep } from './steps/WorksiteStep';
import { WageInfoStep } from './steps/WageInfoStep';
import { SupportingDocsStep, type SupportingDocs, type LCAScanResult } from './steps/SupportingDocsStep';
import { LCAScanStep } from './steps/LCAScanStep';
import { ReviewStep } from './steps/ReviewStep';
import type { PAFData, Employer, JobDetails, WorksiteLocation, WageInfo } from '@/types/paf';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const lcaSteps = [
  { id: 0, title: 'Select LCA', description: 'Choose case' },
  { id: 1, title: 'Scan LCA', description: 'Upload & extract' },
  { id: 2, title: 'Employer', description: 'Company info' },
  { id: 3, title: 'Job Details', description: 'Position & SOC' },
  { id: 4, title: 'Worksite', description: 'Location' },
  { id: 5, title: 'Wages', description: 'Prevailing wage' },
  { id: 6, title: 'Documents', description: 'LCA & Supporting' },
  { id: 7, title: 'Review', description: 'Generate PAF' },
];

const manualSteps = [
  { id: 0, title: 'Employer', description: 'Company info' },
  { id: 1, title: 'Scan LCA', description: 'Upload & extract' },
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

// Pre-populated employer for manual mode (same company, just no LCA linkage)
const DEFAULT_EMPLOYER: Employer = {
  legalBusinessName: 'Sai Business Solutions LLC',
  tradeName: 'SBS Corp',
  address1: '16001 Park Ten Pl',
  address2: 'Suite 400L',
  city: 'Houston',
  state: 'Texas',
  postalCode: '77084',
  country: 'United States Of America',
  telephone: '+12814776467',
  fein: '20-3420634',
  naicsCode: '541511',
};

const manualInitialPAFData: Partial<ExtendedPAFData> = {
  visaType: 'H-1B',
  isH1BDependent: false,
  isWillfulViolator: false,
  employer: DEFAULT_EMPLOYER,
  job: {} as JobDetails,
  worksite: {} as WorksiteLocation,
  wage: {} as WageInfo,
  supportingDocs: undefined,
  lcaId: undefined,
};

// Helper to map LCA wage unit to PAF wage unit
function mapWageUnit(unit: string | null): 'Hour' | 'Week' | 'Bi-Weekly' | 'Month' | 'Year' {
  if (!unit) return 'Year';
  const lower = unit.toLowerCase().replace(/[-\s]/g, '');
  if (lower.includes('hour')) return 'Hour';
  if (lower.includes('biweekly') || lower.includes('bi-weekly')) return 'Bi-Weekly';
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

// Calculate wage source date based on LCA begin date
// Rule: Always use July 1st of the PREVIOUS year
// Example: Oct 1, 2025 → July 1, 2024
function calculateWageSourceDate(lcaBeginDate: string | null): string {
  if (!lcaBeginDate) {
    // Fallback: use July 1 of previous year
    const currentYear = new Date().getFullYear();
    return `${currentYear - 1}-07-01`;
  }
  
  const beginDate = new Date(lcaBeginDate);
  const year = beginDate.getFullYear();
  
  // Always use July 1 of the previous year
  return `${year - 1}-07-01`;
}

// Default employer constants
const DEFAULT_FEIN = '20-3420634';
const DEFAULT_TRADE_NAME = 'SBS Corp';

interface PAFWizardProps {
  mode?: 'lca' | 'manual';
}

export function PAFWizard({ mode = 'lca' }: PAFWizardProps) {
  const isManual = mode === 'manual';
  const steps = isManual ? manualSteps : lcaSteps;
  const [currentStep, setCurrentStep] = useState(0);
  const [pafData, setPafData] = useState<Partial<ExtendedPAFData>>(isManual ? manualInitialPAFData : initialPAFData);
  const [selectedLca, setSelectedLca] = useState<LCARecord | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleLCASelect = (lca: LCARecord) => {
    setSelectedLca(lca);
    
    // Auto-fill all available fields from LCA
    // Use default FEIN and Trade Name for all cases
    const employer: Employer = {
      legalBusinessName: lca.employer_name,
      tradeName: DEFAULT_TRADE_NAME,
      address1: lca.employer_address1 || '',
      address2: lca.employer_address2 || undefined,
      city: lca.employer_city || '',
      state: lca.employer_state || '',
      postalCode: lca.employer_postal_code || '',
      country: lca.employer_country || 'United States',
      telephone: lca.employer_phone || '',
      fein: DEFAULT_FEIN,
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

    // Calculate wage source date based on LCA begin date
    const wageSourceDate = calculateWageSourceDate(lca.begin_date);

    const wage: Partial<WageInfo> = {
      prevailingWage: lca.prevailing_wage || 0,
      prevailingWageUnit: mapWageUnit(lca.wage_unit),
      wageLevel: mapWageLevel(lca.pw_wage_level),
      wageSource: 'OFLC Online Wage Library',
      wageSourceDate: wageSourceDate,
    };
    // Note: h1b_dependent may be null in older LCA imports — scan step will override from PDF
    setPafData((prev) => ({
      ...prev,
      lcaId: lca.id,
      caseNumber: lca.case_number,
      caseStatus: 'Certified',
      visaType: 'H-1B',
      isH1BDependent: lca.h1b_dependent === true, // only true if explicitly true; scan step overrides from PDF
      isWillfulViolator: lca.willful_violator === true,
      employer,
      job,
      worksite,
      wage: wage as WageInfo,
    }));

    setCurrentStep(1); // Go to LCA Scan step
  };

  // Step indices differ based on mode
  // LCA mode:    0=LCA, 1=ScanLCA, 2=Employer, 3=Job, 4=Worksite, 5=Wages, 6=Docs, 7=Review
  // Manual mode: 0=Employer, 1=ScanLCA, 2=Job, 3=Worksite, 4=Wages, 5=Docs, 6=Review
  const stepIndex = {
    employer: isManual ? 0 : 2,
    lcaScan: 1, // step 1 in both modes (after LCA selection in lca mode, after employer in manual mode)
    job: isManual ? 2 : 3,
    worksite: isManual ? 3 : 4,
    wages: isManual ? 4 : 5,
    docs: isManual ? 5 : 6,
    review: isManual ? 6 : 7,
  };

  const handleEmployerNext = (employer: Employer) => {
    setPafData((prev) => ({ ...prev, employer }));
    setCurrentStep(stepIndex.job);
  };

  const handleLCAScanNext = (file: File | null, scanResult: LCAScanResult | null) => {
    // Store the LCA file and apply scan result data to pafData
    setPafData((prev) => {
      const updated: Partial<ExtendedPAFData> = {
        ...prev,
        supportingDocs: {
          ...(prev.supportingDocs || {}),
          lcaFile: file,
          lcaCaseNumber: scanResult?.caseNumber || prev.supportingDocs?.lcaCaseNumber || '',
        } as SupportingDocs,
      };

      // Apply h1bDependent and willfulViolator from scan result if available
      if (scanResult?.h1bDependent !== undefined && scanResult?.h1bDependent !== null) {
        updated.isH1BDependent = scanResult.h1bDependent;
      }
      if (scanResult?.willfulViolator !== undefined && scanResult?.willfulViolator !== null) {
        updated.isWillfulViolator = scanResult.willfulViolator;
      }

      return updated;
    });
    // In LCA mode go to employer step; in manual mode go directly to job step
    setCurrentStep(isManual ? stepIndex.job : stepIndex.employer);
  };

  const handleJobNext = (job: JobDetails) => {
    setPafData((prev) => ({ ...prev, job }));
    setCurrentStep(stepIndex.worksite);
  };

  const handleWorksiteNext = (worksite: WorksiteLocation) => {
    setPafData((prev) => ({ ...prev, worksite }));
    setCurrentStep(stepIndex.wages);
  };

  const handleWageNext = (wage: WageInfo) => {
    setPafData((prev) => ({ ...prev, wage }));
    setCurrentStep(stepIndex.docs);
  };

  const handleSupportingDocsNext = (supportingDocs: SupportingDocs) => {
    setPafData((prev) => ({
      ...prev,
      supportingDocs,
      isH1BDependent: supportingDocs.isH1BDependent ?? prev.isH1BDependent,
      caseStatus: isManual
        ? (supportingDocs.isCertifiedLCA === false ? 'In Process' : 'Certified')
        : prev.caseStatus ?? 'Certified',
    }));
    setCurrentStep(stepIndex.review);
  };

  const handleLCAScanComplete = (scanData: LCAScanResult) => {
    setPafData((prev) => {
      const updated = { ...prev };

      if (scanData.caseNumber) updated.caseNumber = scanData.caseNumber;
      if (scanData.h1bDependent !== undefined) updated.isH1BDependent = scanData.h1bDependent;
      if (scanData.willfulViolator !== undefined) updated.isWillfulViolator = scanData.willfulViolator;

      // Update employer info (preserve defaults like FEIN and trade name)
      if (scanData.employerName || scanData.naicsCode) {
        updated.employer = {
          ...(updated.employer || ({} as Employer)),
          ...(scanData.employerName && { legalBusinessName: scanData.employerName }),
          ...(scanData.naicsCode && { naicsCode: scanData.naicsCode }),
        };
      }

      // Update job details
      if (scanData.jobTitle || scanData.socCode) {
        updated.job = {
          ...(updated.job || ({} as JobDetails)),
          ...(scanData.jobTitle && { jobTitle: scanData.jobTitle }),
          ...(scanData.socCode && { socCode: scanData.socCode }),
          ...(scanData.socTitle && { socTitle: scanData.socTitle }),
          ...(scanData.isFullTime !== undefined && { isFullTime: scanData.isFullTime }),
          ...(scanData.beginDate && { beginDate: scanData.beginDate }),
          ...(scanData.endDate && { endDate: scanData.endDate }),
          ...(scanData.wageRateFrom !== undefined && { wageRateFrom: scanData.wageRateFrom }),
          ...(scanData.wageRateTo !== undefined && { wageRateTo: scanData.wageRateTo }),
          ...(scanData.wageUnit && { wageUnit: mapWageUnit(scanData.wageUnit) }),
          ...(scanData.totalWorkers && { workersNeeded: scanData.totalWorkers }),
        };
      }

      // Update worksite
      if (scanData.worksiteCity || scanData.worksiteState || scanData.worksiteAddress) {
        const hasSecondary = scanData.hasSecondaryWorksite && (scanData.secondaryWorksiteCity || scanData.secondaryWorksiteState);
        updated.worksite = {
          ...(updated.worksite || ({} as WorksiteLocation)),
          ...(scanData.worksiteAddress && { address1: scanData.worksiteAddress }),
          ...(scanData.worksiteCity && { city: scanData.worksiteCity }),
          ...(scanData.worksiteState && { state: scanData.worksiteState }),
          ...(scanData.worksitePostalCode && { postalCode: scanData.worksitePostalCode }),
          ...(scanData.worksiteCounty && { county: scanData.worksiteCounty }),
          ...(scanData.worksiteName && { worksiteName: scanData.worksiteName }),
          ...(hasSecondary && {
            hasSecondaryWorksite: true,
            secondaryWorksite: {
              ...(scanData.secondaryWorksiteAddress && { address1: scanData.secondaryWorksiteAddress }),
              ...(scanData.secondaryWorksiteCity && { city: scanData.secondaryWorksiteCity }),
              ...(scanData.secondaryWorksiteState && { state: scanData.secondaryWorksiteState }),
              ...(scanData.secondaryWorksitePostalCode && { postalCode: scanData.secondaryWorksitePostalCode }),
              ...(scanData.secondaryWorksiteCounty && { county: scanData.secondaryWorksiteCounty }),
              ...(scanData.secondaryWorksiteName && { worksiteName: scanData.secondaryWorksiteName }),
            },
          }),
        };
      }

      // Update wage info
      if (scanData.prevailingWage !== undefined || scanData.wageSourceYear) {
        updated.wage = {
          ...(updated.wage || ({} as WageInfo)),
          ...(scanData.prevailingWage !== undefined && { prevailingWage: scanData.prevailingWage }),
          ...(scanData.prevailingWageUnit && { prevailingWageUnit: mapWageUnit(scanData.prevailingWageUnit) }),
          ...(scanData.wageLevel && { wageLevel: mapWageLevel(scanData.wageLevel) }),
          ...(scanData.wageSourceYear && { wageSourceDate: scanData.wageSourceYear }),
        };
      }

      return updated;
    });
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
  };

  const handleGenerate = async () => {
    // IMPORTANT: Persist the generated PAF into paf_records so it shows up on
    // /generated-pafs and can be opened via /edit/:id.
    try {
      if (!pafData.employer || !pafData.job || !pafData.worksite || !pafData.wage) {
        throw new Error('Missing PAF data');
      }

      const employer = pafData.employer;
      const job = pafData.job;
      const worksite = pafData.worksite;
      const wage = pafData.wage;

      // Determine LCA status: manual mode uses the certified toggle, LCA mode is always certified
      const lcaStatus = isManual 
        ? (pafData.supportingDocs?.isCertifiedLCA === false ? 'in_process' : 'certified')
        : 'certified';

      // Upload posting proof file if provided (optional)
      let noticePostingProofPath: string | null = null;
      if (pafData.supportingDocs?.noticePostingProof) {
        const proofFile = pafData.supportingDocs.noticePostingProof;
        const ext = proofFile.name.split('.').pop() || 'pdf';
        const filePath = `posting-proofs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('paf-documents')
          .upload(filePath, proofFile, { contentType: proofFile.type });
        if (!uploadError) {
          noticePostingProofPath = filePath;
        } else {
          console.warn('Posting proof upload failed (non-fatal):', uploadError.message);
        }
      }

      const { data: created, error: insertError } = await supabase
        .from('paf_records')
        .insert({
          visa_type: pafData.visaType ?? 'H-1B',
          lca_case_number: pafData.caseNumber ?? pafData.supportingDocs?.lcaCaseNumber ?? null,
          lca_status: lcaStatus,

          is_h1b_dependent: pafData.isH1BDependent ?? false,
          is_willful_violator: pafData.isWillfulViolator ?? false,
          is_full_time: job.isFullTime ?? true,
          is_rd: job.isRD ?? false,

          employer_legal_name: employer.legalBusinessName,
          employer_trade_name: employer.tradeName ?? null,
          employer_address1: employer.address1,
          employer_address2: employer.address2 ?? null,
          employer_city: employer.city,
          employer_state: employer.state,
          employer_postal_code: employer.postalCode,
          employer_country: employer.country,
          employer_telephone: employer.telephone,
          employer_fein: employer.fein,
          employer_naics_code: employer.naicsCode,

          job_title: job.jobTitle,
          soc_code: job.socCode,
          soc_title: job.socTitle,
          onet_code: job.onetCode ?? null,
          onet_title: job.onetTitle ?? null,

          begin_date: job.beginDate,
          end_date: job.endDate,
          wage_rate_from: job.wageRateFrom,
          wage_rate_to: job.wageRateTo ?? null,
          wage_unit: job.wageUnit,
          workers_needed: job.workersNeeded ?? 1,

          worksite_address1: worksite.address1,
          worksite_address2: worksite.address2 ?? null,
          worksite_city: worksite.city,
          worksite_state: worksite.state,
          worksite_postal_code: worksite.postalCode,
          worksite_county: worksite.county ?? null,
          worksite_area_code: worksite.areaCode ?? null,
          worksite_area_name: worksite.areaName ?? null,

          prevailing_wage: wage.prevailingWage,
          prevailing_wage_unit: wage.prevailingWageUnit,
          wage_level: wage.wageLevel,
          wage_source: wage.wageSource,
          wage_source_date: wage.wageSourceDate,
          actual_wage: wage.actualWage,
          actual_wage_unit: wage.actualWageUnit,

          // Posting dates and locations
          notice_posting_start_date: pafData.supportingDocs?.noticePostingStartDate || null,
          notice_posting_end_date: (isManual && pafData.supportingDocs?.isCertifiedLCA === false)
            ? null  // Leave blank for in-process LCAs
            : pafData.supportingDocs?.noticePostingEndDate || null,
          notice_posting_location: pafData.supportingDocs?.noticePostingLocation || null,
          notice_posting_location2: pafData.supportingDocs?.noticePostingLocation2 || null,
          notice_posting_location3: pafData.supportingDocs?.noticePostingLocation3 || null,
          notice_posting_location4: pafData.supportingDocs?.noticePostingLocation4 || null,

          // File paths
          lca_file_path: null,
          actual_wage_memo_path: null,
          notice_posting_proof_path: noticePostingProofPath,
          benefits_comparison_path: null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Mark LCA as PAF generated *only after* paf_records is created.
      if (pafData.lcaId) {
        const { error: lcaError } = await supabase
          .from('lca_disclosure')
          .update({
            paf_generated: true,
            paf_generated_at: new Date().toISOString(),
          })
          .eq('id', pafData.lcaId);

        if (lcaError) throw lcaError;
      }

      // Refresh dashboard + lists
      queryClient.invalidateQueries({ queryKey: ['recent-pafs'] });
      queryClient.invalidateQueries({ queryKey: ['all-pafs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pending-lcas'] });
      queryClient.invalidateQueries({ queryKey: ['generated-lcas'] });

      toast({
        title: 'PAF Saved Successfully',
        description: `Saved as an editable record${created?.id ? ` (ID: ${created.id})` : ''}.`,
      });

      // Reset wizard for next PAF
      setPafData(initialPAFData);
      setSelectedLca(null);
      setCurrentStep(0);
    } catch (error: any) {
      console.error('PAF save error:', error);
      toast({
        title: 'Could not save generated PAF',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
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
        {!isManual && currentStep === 0 && (
          <LCASelectionStep onSelect={handleLCASelect} />
        )}

        {currentStep === stepIndex.lcaScan && (
          <LCAScanStep
            onNext={handleLCAScanNext}
            onBack={goBack}
            onScanComplete={handleLCAScanComplete}
          />
        )}

        {currentStep === stepIndex.employer && (
          <EmployerInfoStep 
            data={pafData.employer || {}} 
            onNext={handleEmployerNext}
            onBack={goBack}
          />
        )}

        {currentStep === stepIndex.job && (
          <JobDetailsStep 
            data={pafData.job || {}} 
            onNext={handleJobNext}
            onBack={goBack}
          />
        )}

        {currentStep === stepIndex.worksite && (
          <WorksiteStep 
            data={pafData.worksite || {}} 
            onNext={handleWorksiteNext}
            onBack={goBack}
          />
        )}

        {currentStep === stepIndex.wages && (
          <WageInfoStep 
            data={pafData.wage || {}} 
            worksite={pafData.worksite}
            onNext={handleWageNext}
            onBack={goBack}
          />
        )}

        {currentStep === stepIndex.docs && (
          <SupportingDocsStep
            data={pafData.supportingDocs || {}}
            onNext={handleSupportingDocsNext}
            onBack={goBack}
            isManualMode={isManual}
            hasSecondaryWorksite={pafData.worksite?.hasSecondaryWorksite ?? false}
            onScanComplete={handleLCAScanComplete}
          />
        )}

        {currentStep === stepIndex.review && pafData.employer && pafData.job && pafData.worksite && pafData.wage && (
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
