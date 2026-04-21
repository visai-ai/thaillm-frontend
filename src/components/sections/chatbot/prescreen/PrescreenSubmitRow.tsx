"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Context for portaling submit buttons into a fixed footer area (e.g. PrescreenModal footer)
// and for passing loading state from the modal to the submit row
export const PrescreenFooterContext = createContext<{
  ref: React.RefObject<HTMLDivElement | null>;
  isSubmitting: boolean;
} | null>(null);

type PrescreenSubmitRowProps = {
  onSubmit: () => void;
  disabled?: boolean;
  onBack?: () => void;
  children?: React.ReactNode;
  className?: string;
};

export default function PrescreenSubmitRow({
  onSubmit,
  disabled,
  onBack,
  children = "ถัดไป",
  className,
}: PrescreenSubmitRowProps) {
  const ctx = useContext(PrescreenFooterContext);
  const [mounted, setMounted] = useState(false);
  const isLoading = ctx?.isSubmitting ?? false;

  useEffect(() => {
    setMounted(true);
  }, []);

  const buttons = (
    <div
      className={cn(
        "flex items-center gap-3 w-full",
        // When not portaled, keep sticky behavior for standalone usage
        !ctx && "sticky bottom-0 bg-background pt-3 pb-1",
        className,
      )}
    >
      {onBack && (
        <Button
          variant="secondary"
          className="grow basis-0"
          onClick={onBack}
          disabled={isLoading}
        >
          ย้อนกลับ
        </Button>
      )}
      <Button
        className="grow basis-0"
        onClick={onSubmit}
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            กำลังดำเนินการ...
          </span>
        ) : (
          children
        )}
      </Button>
    </div>
  );

  // Portal into the modal footer if context is provided
  if (mounted && ctx?.ref.current) {
    return createPortal(buttons, ctx.ref.current);
  }

  return buttons;
}
