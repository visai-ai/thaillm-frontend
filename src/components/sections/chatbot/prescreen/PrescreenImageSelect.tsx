import { useState } from "react";
import { cn } from "@/lib/utils";
import { getBasePath } from "@/lib/config";
import { CheckIcon } from "lucide-react";
import PrescreenSubmitRow from "./PrescreenSubmitRow";

type QuestionOption = {
  id: string;
  label: string;
};

type PrescreenImageSelectProps = {
  id: string;
  question: {
    qid: string;
    question: string;
    options?: QuestionOption[];
    image?: string;
  };
  multi: boolean;
  onSubmit: (value: string | string[]) => void;
  disabled?: boolean;
  isLatest?: boolean;
  onBack?: () => void;
};

export default function PrescreenImageSelect({
  id,
  question,
  multi,
  onSubmit,
  disabled,
  isLatest = true,
  onBack,
}: PrescreenImageSelectProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const options = question.options || [];

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
    if (multi) {
      onSubmit(selected);
    } else {
      onSubmit(selected[0]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Image */}
      {question.image && (
        <div className="rounded-lg overflow-hidden border border-gray-200 max-w-md">
          <img
            src={`${getBasePath()}/prescreen-images/${question.image}`}
            alt={question.question}
            className="w-full h-auto max-h-96 object-contain bg-gray-50"
          />
        </div>
      )}

      {/* Options */}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={`${option.id}-${id}`}
              type="button"
              className={cn(
                "py-2 px-3 rounded-lg cursor-pointer border font-medium text-sm flex items-center gap-1 transition-colors",
                isSelected
                  ? "bg-primary-500 text-white border-primary-500"
                  : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300",
                disabled && "opacity-50 cursor-not-allowed",
                !isLatest && "pointer-events-none opacity-70",
              )}
              onClick={() => handleToggle(option.id)}
              disabled={disabled}
            >
              {isSelected && <CheckIcon className="size-4" />}
              {option.label}
            </button>
          );
        })}
      </div>

      {isLatest && (
        <PrescreenSubmitRow
          onSubmit={handleSubmit}
          disabled={disabled || selected.length === 0}
          onBack={onBack}
        >
          ยืนยัน{multi && selected.length > 0 && ` (${selected.length})`}
        </PrescreenSubmitRow>
      )}
    </div>
  );
}
