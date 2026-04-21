import { useState } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import PrescreenSubmitRow from "./PrescreenSubmitRow";

type PrescreenNumberProps = {
  question: {
    qid: string;
    question: string;
    constraints?: {
      min: number;
      max: number;
      step: number;
      default: number;
    };
  };
  onSubmit: (value: number) => void;
  disabled?: boolean;
  isLatest?: boolean;
  defaultValue?: number;
  onDraftChange?: (value: number) => void;
  onBack?: () => void;
};

export default function PrescreenNumber({
  question,
  onSubmit,
  disabled,
  isLatest = true,
  defaultValue,
  onDraftChange,
  onBack,
}: PrescreenNumberProps) {
  const min = question.constraints?.min ?? 0;
  const max = question.constraints?.max ?? 10;
  const step = question.constraints?.step ?? 1;

  const [value, setValue] = useState<number>(
    defaultValue ?? question.constraints?.default ?? min,
  );

  const handleSubmit = () => {
    onDraftChange?.(value);
    onSubmit(value);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Slider
          value={[value]}
          onValueChange={([v]) => setValue(v)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn("flex-1")}
        />
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!isNaN(v) && v >= min && v <= max) setValue(v);
          }}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="w-16 px-2 py-1.5 border border-gray-200 rounded-xl text-center text-sm font-medium
            focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
            disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed bg-white"
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400 font-medium px-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>

      {isLatest && (
        <PrescreenSubmitRow
          onSubmit={handleSubmit}
          disabled={disabled}
          onBack={onBack}
        />
      )}
    </div>
  );
}
