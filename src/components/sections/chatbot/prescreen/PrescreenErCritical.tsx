import { useState } from "react";
import { cn } from "@/lib/utils";
import PrescreenSubmitRow from "./PrescreenSubmitRow";

type QuestionPayload = {
  qid: string;
  question: string;
  question_type: string;
  options?: { id: string; label: string }[];
};

type PrescreenErCriticalProps = {
  questions: QuestionPayload[];
  phaseName: string;
  onSubmit: (value: Record<string, boolean>) => void;
  disabled?: boolean;
  isLatest?: boolean;
  defaultFlags?: Record<string, boolean>;
  onDraftChange?: (flags: Record<string, boolean>) => void;
  onBack?: () => void;
};

/**
 * Phase 1: ER Critical Screen — yes/no toggle switches.
 * Any "Yes" triggers immediate emergency termination.
 * Similar to the simulator's ErCriticalForm.tsx.
 */
export default function PrescreenErCritical({
  questions,
  phaseName,
  onSubmit,
  disabled,
  isLatest = true,
  defaultFlags,
  onDraftChange,
  onBack,
}: PrescreenErCriticalProps) {
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    if (defaultFlags && Object.keys(defaultFlags).length > 0)
      return defaultFlags;
    const init: Record<string, boolean> = {};
    for (const q of questions) init[q.qid] = false;
    return init;
  });

  const toggle = (qid: string) => {
    setFlags((prev) => ({ ...prev, [qid]: !prev[qid] }));
  };

  const handleSubmit = () => {
    onDraftChange?.(flags);
    onSubmit(flags);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Urgency header */}
      <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r">
        <h3 className="text-base font-semibold text-red-800">{phaseName}</h3>
        <p className="text-sm text-red-600">
          หากตอบ &quot;ใช่&quot; ข้อใดข้อหนึ่ง ผู้ป่วยจะถูกส่งไปห้องฉุกเฉินทันที
        </p>
      </div>

      <p className="text-xs text-gray-400 text-right">
        {questions.length} รายการ
      </p>

      <div className="space-y-2">
        {questions.map((q, idx) => {
          const isYes = flags[q.qid];
          return (
            <div
              key={q.qid}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-colors",
                isYes ? "bg-red-50 border-red-300" : "bg-white border-gray-200",
              )}
            >
              <div className="flex-1 mr-3">
                <span className="text-xs text-gray-400 mr-1">{idx + 1}.</span>
                <span className="text-sm text-gray-700">{q.question}</span>
              </div>
              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => toggle(q.qid)}
                disabled={disabled}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors flex-shrink-0",
                  isYes ? "bg-red-500" : "bg-gray-300",
                  disabled && "opacity-50 cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    isYes && "translate-x-6",
                  )}
                />
              </button>
              <span
                className={cn(
                  "ml-2 text-xs font-semibold w-10",
                  isYes ? "text-red-600" : "text-gray-400",
                )}
              >
                {isYes ? "ใช่" : "ไม่ใช่"}
              </span>
            </div>
          );
        })}
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
