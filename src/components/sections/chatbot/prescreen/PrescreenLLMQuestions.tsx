import { useState } from "react";
import PrescreenSubmitRow from "./PrescreenSubmitRow";

type PrescreenLLMQuestionsProps = {
  questions: string[];
  onSubmit: (answers: { question: string; answer: string }[]) => void;
  disabled?: boolean;
  isLatest?: boolean;
  defaultAnswers?: Record<number, string>;
  onDraftChange?: (answers: Record<number, string>) => void;
  onBack?: () => void;
};

/**
 * LLM Follow-up Questions — shows all questions with text inputs.
 * Submits all answers at once as an array of {question, answer} pairs.
 */
export default function PrescreenLLMQuestions({
  questions,
  onSubmit,
  disabled,
  isLatest = true,
  defaultAnswers,
  onDraftChange,
  onBack,
}: PrescreenLLMQuestionsProps) {
  const [answers, setAnswers] = useState<Record<number, string>>(
    defaultAnswers ?? {},
  );

  const allFilled =
    questions.length > 0 &&
    questions.every((_, i) => (answers[i] ?? "").trim().length > 0);

  const updateAnswer = (index: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const handleSubmit = () => {
    onDraftChange?.(answers);
    const pairs = questions.map((q, i) => ({
      question: q,
      answer: (answers[i] ?? "").trim(),
    }));
    onSubmit(pairs);
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-400">ไม่มีคำถามเพิ่มเติม</p>
        {isLatest && (
          <PrescreenSubmitRow
            onSubmit={() => onSubmit([])}
            disabled={disabled}
            onBack={onBack}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 leading-snug">
            {i + 1}. {q}
          </label>
          <textarea
            value={answers[i] ?? ""}
            onChange={(e) => updateAnswer(i, e.target.value)}
            placeholder="กรุณาตอบคำถาม..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none bg-white
                focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
                disabled:opacity-50 placeholder:text-gray-400 transition-shadow duration-200"
            disabled={disabled}
          />
        </div>
      ))}

      {isLatest && (
        <PrescreenSubmitRow
          onSubmit={handleSubmit}
          disabled={disabled || !allFilled}
          onBack={onBack}
        />
      )}
    </div>
  );
}
