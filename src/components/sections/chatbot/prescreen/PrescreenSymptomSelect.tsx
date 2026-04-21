import { useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { CheckIcon } from "lucide-react";
import TextDropdown from "@/components/common/TextDropdown";
import PrescreenSubmitRow from "./PrescreenSubmitRow";

type QuestionPayload = {
  qid: string;
  question: string;
  question_type: string;
  options?: { id: string; label: string }[];
};

type PrescreenSymptomSelectProps = {
  questions: QuestionPayload[];
  phaseName: string;
  onSubmit: (value: Record<string, unknown>) => void;
  disabled?: boolean;
  isLatest?: boolean;
  defaultValues?: { primary?: string; secondary?: string[] };
  onDraftChange?: (values: { primary: string; secondary: string[] }) => void;
  onBack?: () => void;
};

/**
 * Phase 2: Symptom Selection — primary symptom dropdown + secondary symptoms multi-select.
 * Similar to the simulator's SymptomSelector.tsx.
 *
 * Expects exactly 2 questions:
 *   - primary_symptom (single_select)
 *   - secondary_symptoms (multi_select)
 */
export default function PrescreenSymptomSelect({
  questions,
  phaseName,
  onSubmit,
  disabled,
  isLatest = true,
  defaultValues,
  onDraftChange,
  onBack,
}: PrescreenSymptomSelectProps) {
  const primaryQ = questions.find((q) => q.qid === "primary_symptom");
  const secondaryQ = questions.find((q) => q.qid === "secondary_symptoms");

  const [primary, setPrimary] = useState(defaultValues?.primary ?? "");
  const [secondary, setSecondary] = useState<string[]>(
    defaultValues?.secondary ?? [],
  );

  const NONE_OF_THE_ABOVE_ID = "__none_of_the_above__";
  const primaryOptions = primaryQ?.options || [];
  const isNoneOfTheAbove = primary === NONE_OF_THE_ABOVE_ID;
  const skipSymptom = !primary || isNoneOfTheAbove;
  const secondaryOptions = (secondaryQ?.options || []).filter(
    (opt) => opt.id !== primary,
  );

  const toggleSecondary = (optId: string) => {
    setSecondary((prev) =>
      prev.includes(optId) ? prev.filter((s) => s !== optId) : [...prev, optId],
    );
  };

  const handleSubmit = () => {
    const skipSymptom = !primary || isNoneOfTheAbove;
    const filteredSecondary = skipSymptom
      ? []
      : secondary.filter((s) => s !== primary);
    onDraftChange?.({ primary, secondary: filteredSecondary });
    onSubmit({
      primary_symptom: skipSymptom ? null : primary,
      secondary_symptoms: filteredSecondary,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold text-gray-800">{phaseName}</h3>

      {/* Primary symptom — items are labels so placeholder shows when nothing selected */}
      <TextDropdown
        items={primaryOptions.map((o) => o.label)}
        selectedItem={primaryOptions.find((o) => o.id === primary)?.label ?? ""}
        handleSetSelectedItem={(label) => {
          const opt = primaryOptions.find((o) => o.label === label);
          if (opt) setPrimary(opt.id);
        }}
        label={primaryQ?.question || "อาการหลัก"}
        placeholder="-- เลือกอาการหลัก --"
        disabled={disabled}
        isItemsFullWidth
        dropdownClassName="py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
      />

      {/* Secondary symptoms */}
      {secondaryQ && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium text-gray-700">
            {secondaryQ.question || "อาการร่วม (ถ้ามี)"}
          </Label>
          <div className="flex flex-wrap gap-2">
            {secondaryOptions.map((opt) => {
              const isSelected = secondary.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={cn(
                    "py-1.5 px-3 rounded-lg cursor-pointer border text-sm font-medium flex items-center gap-1 transition-colors",
                    isSelected
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300",
                    disabled && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={() => toggleSecondary(opt.id)}
                  disabled={disabled}
                >
                  {isSelected && <CheckIcon className="size-4" />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
