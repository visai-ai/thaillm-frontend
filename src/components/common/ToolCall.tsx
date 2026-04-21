"use client";

import { cn } from "@/lib/utils";
import { Wrench } from "lucide-react";

type ToolCallProps = {
  toolName: string;
  arguments?: Record<string, any>;
};

export default function ToolCall({ toolName, arguments: args }: ToolCallProps) {
  // Format tool name to be more readable
  const formatToolName = (name: string) => {
    return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Format arguments for display
  const formatArguments = (args?: Record<string, any>): string | null => {
    if (!args || Object.keys(args).length === 0) {
      return null;
    }

    // Filter out empty values and format key-value pairs
    const entries = Object.entries(args)
      .filter(
        ([_, value]) => value !== undefined && value !== null && value !== "",
      )
      .map(([key, value]) => {
        // Format key (convert snake_case to Title Case)
        const formattedKey = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

        // Format value
        let formattedValue = value;
        if (typeof value === "object") {
          formattedValue = JSON.stringify(value);
        } else if (typeof value === "string" && value.length > 30) {
          formattedValue = value.substring(0, 30) + "...";
        }

        return `${formattedKey}: ${formattedValue}`;
      });

    return entries.length > 0 ? entries.join(", ") : null;
  };

  const isFallback = args?._fallback === true;
  const displayArgs = args
    ? Object.fromEntries(
        Object.entries(args).filter(([key]) => key !== "_fallback"),
      )
    : undefined;
  const argsText = formatArguments(displayArgs);

  return (
    <div
      className={cn(
        "flex flex-col gap-0 text-xs rounded-xl px-2 py-1 w-fit max-w-full",
        "bg-gray-50 text-gray-600 border border-gray-200",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Wrench className="h-3 w-3 flex-shrink-0" />
        <span className="font-medium">{formatToolName(toolName)}</span>
      </div>
      {argsText && (
        <div className="text-[10px] text-gray-500 pl-[18px] break-words">
          {argsText}
        </div>
      )}
      {isFallback && (
        <div className="flex items-center gap-1 pl-[18px] mt-0.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-[10px] text-amber-600 font-medium italic">
            using user message as query
          </span>
        </div>
      )}
    </div>
  );
}
