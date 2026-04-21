import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import PrescreenSubmitRow from "./PrescreenSubmitRow";

type QuestionOption = {
  id: string;
  label: string;
};

type PrescreenSelectProps = {
  id: string;
  question: {
    qid: string;
    question: string;
    options?: QuestionOption[];
  };
  multi: boolean;
  onSubmit: (value: string | string[]) => void;
  disabled?: boolean;
  isLatest?: boolean;
  defaultSelected?: string[];
  onDraftChange?: (selected: string[]) => void;
  onBack?: () => void;
  allowEmpty?: boolean;
};

/**
 * Single/multi select for sequential questions (phases 4, 7).
 * Renders option pills with click-to-select behavior.
 */
export default function PrescreenSelect({
  id,
  question,
  multi,
  onSubmit,
  disabled,
  isLatest = true,
  defaultSelected,
  onDraftChange,
  onBack,
  allowEmpty: allowEmptyProp,
}: PrescreenSelectProps) {
  const [selected, setSelected] = useState<string[]>(defaultSelected ?? []);
  const options = question.options || [];
  const allowEmpty = allowEmptyProp ?? multi;

  const handleToggle = (optionId: string) => {
    if (disabled) return;
    if (multi) {
      setSelected((prev) =>
        prev.includes(optionId)
          ? prev.filter((s) => s !== optionId)
          : [...prev, optionId],
      );
    } else {
      setSelected([optionId]);
    }
  };

  const handleSubmit = () => {
    if (selected.length === 0 && !allowEmpty) return;
    onDraftChange?.(selected);
    if (multi) {
      onSubmit(selected);
    } else {
      if (selected.length === 0) return;
      onSubmit(selected[0]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {multi && (
        <p className="text-xs text-gray-400 font-medium tracking-wide uppercase -mt-1">
          เลือกได้หลายข้อ (ไม่บังคับ)
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={`${option.id}-${id}`}
              type="button"
              onClick={() => handleToggle(option.id)}
              disabled={disabled}
              className={cn(
                "relative py-2 px-4 rounded-full text-sm font-medium border transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1",
                isSelected
                  ? "bg-primary-500 text-white border-primary-500 shadow-sm shadow-primary-200"
                  : "bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50",
                disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                !isLatest && "pointer-events-none opacity-60",
              )}
            >
              <span className="flex items-center gap-1.5">
                {isSelected && <CheckIcon className="size-3.5 shrink-0" />}
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {isLatest && (
        <PrescreenSubmitRow
          onSubmit={handleSubmit}
          disabled={disabled || (!allowEmpty && selected.length === 0)}
          onBack={onBack}
          className="mt-1"
        >
          ยืนยัน{multi && selected.length > 0 && ` (${selected.length})`}
        </PrescreenSubmitRow>
      )}
    </div>
  );
}
