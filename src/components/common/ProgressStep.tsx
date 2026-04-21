import { cn } from "@/lib/utils";

import { CheckIcon } from "lucide-react";

type ProgressStepProps = {
  currentStep: number;
  stepLength: number;
  className?: string;
};

const ProgressStep = ({
  currentStep,
  stepLength,
  className,
}: ProgressStepProps) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden p-4 flex items-center justify-between",
        className,
      )}
    >
      {[...Array(stepLength)].map((_, index) => (
        <div
          className={cn("relative", index < stepLength - 1 ? "grow" : "")}
          key={index}
        >
          {index < stepLength - 1 && (
            <div
              className={cn(
                "absolute left-0.5 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-gray-200",
              )}
            >
              <div
                className={cn(
                  "absolute h-0.5 bg-primary-600",
                  index < currentStep ? "w-full" : "w-0",
                )}
              ></div>
            </div>
          )}

          <div
            className={cn(
              "relative w-6 h-6 border rounded-full flex items-center justify-center",
              index <= currentStep
                ? "bg-primary-600 border-primary-600 text-white"
                : "bg-white border-gray-200 text-gray-300",
              index === currentStep && "ring-4 ring-secondary-shadow",
            )}
          >
            {index < currentStep ? (
              <CheckIcon className="size-3" />
            ) : (
              <div className={cn("w-2 h-2 rounded-full bg-gray-200")}></div>
            )}
          </div>
        </div>
      ))}
      {/* </div> */}
    </div>
  );
};

export default ProgressStep;
