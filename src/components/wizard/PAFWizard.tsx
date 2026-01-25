import { useState } from 'react';
import { WizardProgress } from './WizardProgress';
import { EmployerInfoStep } from './steps/EmployerInfoStep';
import { JobDetailsStep } from './steps/JobDetailsStep';
import { WorksiteStep } from './steps/WorksiteStep';
import { WageInfoStep } from './steps/WageInfoStep';
import { ReviewStep } from './steps/ReviewStep';
import type { PAFData, Employer, JobDetails, WorksiteLocation, WageInfo } from '@/types/paf';
import { useToast } from '@/hooks/use-toast';

const steps = [
  { id: 1, title: 'Employer', description: 'Company info' },
  { id: 2, title: 'Job Details', description: 'Position & SOC' },
  { id: 3, title: 'Worksite', description: 'Location' },
  { id: 4, title: 'Wages', description: 'Prevailing wage' },
  { id: 5, title: 'Review', description: 'Generate PAF' },
];

const initialPAFData: Partial<PAFData> = {
  visaType: 'H-1B',
  isH1BDependent: false,
  isWillfulViolator: false,
  employer: {} as Employer,
  job: {} as JobDetails,
  worksite: {} as WorksiteLocation,
  wage: {} as WageInfo,
};

export function PAFWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [pafData, setPafData] = useState<Partial<PAFData>>(initialPAFData);
  const { toast } = useToast();

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

  const handleEdit = (step: number) => {
    setCurrentStep(step);
  };

  const handleGenerate = () => {
    toast({
      title: "PAF Generated Successfully!",
      description: "Your Public Access File has been created and is ready for download.",
    });
    // In a real implementation, this would generate and download the PAF document
  };

  const goBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
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
        {currentStep === 1 && (
          <EmployerInfoStep 
            data={pafData.employer || {}} 
            onNext={handleEmployerNext} 
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
            onNext={handleWageNext}
            onBack={goBack}
          />
        )}

        {currentStep === 5 && pafData.employer && pafData.job && pafData.worksite && pafData.wage && (
          <ReviewStep 
            data={pafData as PAFData}
            onBack={goBack}
            onGenerate={handleGenerate}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
}
