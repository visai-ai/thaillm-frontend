import Image from "next/image";

import { cn } from "@/lib/utils";
import Illustration from "@/../public/images/illustration.webp";
import { LucideIcon, Search } from "lucide-react";

type State = "search" | "empty";

type EmptyStateProps = {
  title: string;
  description?: string;
  state?: State;
  className?: string;
  customIcon?: LucideIcon;
  action?: React.ReactNode;
};

const EmptyState = ({
  title,
  description,
  state,
  className,
  action,
  customIcon: CustomIcon,
}: EmptyStateProps) => {
  let Icon: LucideIcon | null = null;
  if (CustomIcon) {
    Icon = CustomIcon;
  } else {
    switch (state) {
      case "search":
        Icon = Search;
        break;
    }
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center md:space-y-8 space-y-6",
        className,
      )}
    >
      <div className="flex flex-col items-center justify-center md:space-y-6 space-y-4">
        <div className="relative">
          <Image
            src={Illustration}
            alt="Empty"
            width={220}
            height={160}
            className="w-auto h-[160px] object-contain"
          />

          {Icon && (
            <Icon className="size-7 text-white absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-[75%]" />
          )}
        </div>
        <div className="flex flex-col text-center">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {description && (
            <span className="text-gray-600 whitespace-pre-line mt-2">
              {description}
            </span>
          )}
        </div>
      </div>
      {action && action}
    </div>
  );
};

export default EmptyState;
