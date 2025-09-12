import { cn } from '@/lib/utils';

interface StepperProps {
  currentStep: number;
  steps: string[];
  className?: string;
}

export const Stepper = ({ currentStep, steps, className }: StepperProps) => {
  return (
    <div className={cn("flex items-center justify-center w-full max-w-5xl mx-auto px-4", className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        
        return (
          <div key={stepNumber} className="flex items-center flex-1">
            <div className="flex items-center min-w-0 flex-1">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-200 shadow-sm flex-shrink-0",
                  {
                    "bg-primary text-primary-foreground border-primary shadow-md": isActive,
                    "bg-green-500 text-white border-green-500 shadow-md": isCompleted,
                    "bg-background text-muted-foreground border-border hover:border-muted-foreground": !isActive && !isCompleted,
                  }
                )}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : stepNumber}
              </div>
              <div className="ml-4 min-w-0 flex-1">
                <span
                  className={cn(
                    "text-sm font-medium block truncate",
                    {
                      "text-primary": isActive,
                      "text-green-600": isCompleted,
                      "text-muted-foreground": !isActive && !isCompleted,
                    }
                  )}
                  title={step}
                >
                  {step}
                </span>
              </div>
            </div>
            
            {stepNumber < steps.length && (
              <div className="flex items-center px-4">
                <div
                  className={cn(
                    "h-0.5 w-20 transition-colors duration-200",
                    {
                      "bg-green-500": isCompleted,
                      "bg-border": !isCompleted,
                    }
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};