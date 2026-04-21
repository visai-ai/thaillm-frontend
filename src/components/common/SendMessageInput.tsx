"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SendIcon } from "lucide-react";

type SendMessageInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  /** Disables only the send button/action while still allowing typing. */
  disableSend?: boolean;
};
const SendMessageInput = ({
  input,
  onInputChange,
  onSubmit,
  className,
  disabled,
  disableSend,
}: SendMessageInputProps) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = () => {
    onInputChange(inputRef?.current?.value || "");
  };

  const handleSubmit = () => {
    if (disableSend) return;
    onSubmit?.(inputRef?.current?.value || "");
    onInputChange("");
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn(className)}>
      <div className="relative flex h-fit grow text-gray-900 rounded-lg overflow-hidden w-full">
        <textarea
          ref={inputRef || null}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={50000}
          rows={1}
          placeholder="พิมพ์ข้อความที่นี่..."
          className="box-border bg-white disabled:bg-gray-100 flex text-md min-h-11 text-gray-900 border border-gray-300 rounded-l-lg shadow-xs outline-none w-full py-2.5 pl-3.5 pr-12"
          style={{ height: "44px" }}
          disabled={disabled}
        />
        <Button
          disabled={disabled || disableSend || !input}
          type="button"
          aria-label="ส่งคำถาม"
          className="absolute h-full w-11 shrink-0 rounded-tr-lg rounded-br-lg right-0 top-0 flex items-center justify-center rounded-l-none"
          onClick={handleSubmit}
        >
          <SendIcon className="size-5" />
        </Button>
      </div>
    </div>
  );
};

export default SendMessageInput;
