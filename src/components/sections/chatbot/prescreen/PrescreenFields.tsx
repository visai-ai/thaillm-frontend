import { useState } from "react";
import { Label } from "@/components/ui/label";
import PrescreenSubmitRow from "./PrescreenSubmitRow";

type QuestionField = {
  id: string;
  label: string;
  kind: string;
};

type PrescreenFieldsProps = {
  id: string;
  question: {
    qid: string;
    question: string;
    fields?: QuestionField[];
  };
  onSubmit: (value: Record<string, string>) => void;
  disabled?: boolean;
  isLatest?: boolean;
  defaultValues?: Record<string, string>;
  onDraftChange?: (values: Record<string, string>) => void;
  onBack?: () => void;
};

export default function PrescreenFields({
  id,
  question,
  onSubmit,
  disabled,
  isLatest = true,
  defaultValues,
  onDraftChange,
  onBack,
}: PrescreenFieldsProps) {
  const fields = question.fields || [];
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (defaultValues) return defaultValues;
    const init: Record<string, string> = {};
    fields.forEach((f) => (init[f.id] = ""));
    return init;
  });

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = () => {
    onDraftChange?.(values);
    onSubmit(values);
  };

  const hasAnyValue = Object.values(values).some((v) => v.trim() !== "");

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field) => (
        <div key={`${field.id}-${id}`} className="flex flex-col gap-1">
          <Label
            htmlFor={`${field.id}-${id}`}
            className="text-sm text-gray-700"
          >
            {field.label}
          </Label>
          <textarea
            id={`${field.id}-${id}`}
            value={values[field.id] || ""}
            onChange={(e) => handleChange(field.id, e.target.value)}
            disabled={disabled}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed bg-white"
            placeholder={field.label}
          />
        </div>
      ))}

      {isLatest && (
        <PrescreenSubmitRow
          onSubmit={handleSubmit}
          disabled={disabled || !hasAnyValue}
          onBack={onBack}
        />
      )}
    </div>
  );
}
