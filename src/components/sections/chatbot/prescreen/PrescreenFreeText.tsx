import { useState } from "react";
import PrescreenSubmitRow from "./PrescreenSubmitRow";

type PrescreenFreeTextProps = {
  id: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  isLatest?: boolean;
  defaultText?: string;
  onDraftChange?: (text: string) => void;
  onBack?: () => void;
};

export default function PrescreenFreeText({
  id,
  onSubmit,
  disabled,
  isLatest = true,
  defaultText,
  onDraftChange,
  onBack,
}: PrescreenFreeTextProps) {
  const [text, setText] = useState(defaultText ?? "");

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onDraftChange?.(trimmed);
      onSubmit(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <textarea
          id={`prescreen-freetext-${id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm resize-none bg-white
            focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
            disabled:opacity-50 disabled:bg-gray-50
            placeholder:text-gray-400 transition-shadow duration-200"
          placeholder="พิมพ์คำตอบของคุณ..."
        />
      </div>

      {isLatest && (
        <PrescreenSubmitRow
          onSubmit={handleSubmit}
          disabled={disabled || !text.trim()}
          onBack={onBack}
        />
      )}
    </div>
  );
}
