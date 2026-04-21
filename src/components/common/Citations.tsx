"use client";

import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface CitationsProps {
  citations: number[];
  citationReferences?: Record<number, { url: string; title?: string }>;
  className?: string;
}

const MULTI_PART_TLDS = [
  "co.th",
  "ac.th",
  "go.th",
  "or.th",
  "co.uk",
  "ac.uk",
  "co.jp",
  "or.jp",
  "com.au",
  "co.kr",
];

function getDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const isMultiPartTld = MULTI_PART_TLDS.some((tld) =>
      hostname.endsWith(`.${tld}`),
    );
    const parts = hostname.split(".");
    const domainIndex = isMultiPartTld ? parts.length - 3 : parts.length - 2;
    return parts[domainIndex] ?? parts[0];
  } catch {
    return "link";
  }
}

const Citations = ({
  citations,
  citationReferences,
  className,
}: CitationsProps) => {
  if (!citations || citations.length === 0 || !citationReferences) {
    return null;
  }

  return (
    <div className={cn("mt-4 space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
          อ้างอิง
        </span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>

      {/* Pills */}
      <div className="flex flex-wrap gap-1.5">
        {citations.map((citationNum, index) => {
          const ref = citationReferences?.[citationNum];
          const href = ref?.url;
          const domain = href ? getDomainName(href) : null;
          const orderNum = index + 1;

          const sharedClasses =
            "group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all duration-150";

          if (href) {
            return (
              <a
                key={citationNum}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={ref?.title ?? `Citation ${citationNum}`}
                aria-label={
                  ref?.title ?? `Citation ${citationNum} - opens in new tab`
                }
                className={cn(
                  sharedClasses,
                  "border-gray-200 bg-gray-50 text-gray-500",
                  "hover:border-gray-300 hover:text-gray-700",
                )}
              >
                <span className="font-semibold text-gray-300 text-[10px]">
                  {orderNum}
                </span>
                <span className="font-medium">{domain}</span>
                <ExternalLink className="size-3 opacity-40 group-hover:opacity-70 transition-opacity" />
              </a>
            );
          }

          return (
            <span
              key={citationNum}
              className={cn(
                sharedClasses,
                "border-gray-200 bg-gray-50 text-gray-400 cursor-default",
              )}
              aria-label={`Citation ${citationNum}`}
            >
              <span className="font-semibold text-gray-300 text-[10px]">
                {orderNum}
              </span>
              <span className="font-medium">link</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default Citations;
