import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface WizardProgressProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function WizardProgress({ steps, currentStep, onStepClick }: WizardProgressProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isComplete = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isPending = currentStep < step.id;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <button
                onClick={() => onStepClick?.(step.id)}
                disabled={isPending}
                className={cn(
                  "group flex flex-col items-center gap-2 transition-all duration-200",
                  !isPending && "cursor-pointer"
                )}
              >
                <div
                  className={cn(
                    "step-indicator",
                    isComplete && "step-indicator-complete",
                    isCurrent && "step-indicator-active",
                    isPending && "step-indicator-pending"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isCurrent ? "text-accent" : isComplete ? "text-success" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="hidden text-xs text-muted-foreground sm:block">
                    {step.description}
                  </p>
                </div>
              </button>

              {index < steps.length - 1 && (
                <div className="mx-2 h-[2px] flex-1">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      isComplete ? "bg-success" : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
