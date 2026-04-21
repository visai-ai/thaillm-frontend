import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className="animate-spin" size={size} />
    </div>
  );
}

export function LoadingFullScreen({
  loadingText = "Loading...",
  className = "",
}: {
  loadingText?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 w-full h-full z-[3000] flex items-center justify-center flex-col gap-3 bg-black/40",
        className,
      )}
    >
      <LoadingSpinner />
      {loadingText && (
        <div className="text-white text-lg font-semibold animate-pulse">
          {loadingText}
        </div>
      )}
    </div>
  );
}
