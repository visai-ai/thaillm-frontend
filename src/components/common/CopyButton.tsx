"use client";

import { useNotificationStore } from "@/stores/useNotificationStore";
import { Slot } from "@radix-ui/react-slot";

import { CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const CopyButton = ({
  text,
  buttonText = "",
  className = "",
  iconClassName = "size-5",
  asChild = false,
}: {
  text: string;
  buttonText?: string;
  className?: string;
  iconClassName?: string;
  asChild?: boolean;
}) => {
  const { addNotification } = useNotificationStore();

  const handleCopyToClipboard = () => {
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const input = document.createElement("input");
      input.setAttribute("value", text);
      document.body.appendChild(input);
      input.select();
      document.body.removeChild(input);
    }

    addNotification({
      title: "คัดลอกสำเร็จ",
      state: "success",
    });
  };

  const Comp = asChild ? Slot : "button";

  return (
    <>
      <Comp
        data-slot="button"
        aria-label={buttonText || "Copy to clipboard"}
        className={cn(
          "p-2 cursor-pointer rounded-lg disabled:text-gray-400 disabled:hover:text-gray-400 text-gray-600 hover:text-gray-700 flex items-center justify-center gap-1",
          className,
        )}
        onClick={handleCopyToClipboard}
        disabled={!text}
      >
        <CopyIcon className={iconClassName} />
        {buttonText && <>{buttonText}</>}
      </Comp>
    </>
  );
};

export default CopyButton;
