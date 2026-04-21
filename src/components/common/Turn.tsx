import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const turnVariants = cva("p-4 flex gap-2", {
  variants: {
    role: {
      default: "bg-white text-gray-700 border border-gray-300",
      user: "text-primary-700 bg-primary-50 rounded-l-3xl rounded-tr-3xl",
      assistant:
        "text-secondary-700 bg-secondary-50 rounded-r-3xl rounded-bl-3xl",
    },
    size: {
      default: "text-base p-4",
    },
  },
  defaultVariants: {
    role: "default",
    size: "default",
  },
});

function Turn({
  className,
  role,
  size,
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof turnVariants>) {
  return (
    <div className={cn(turnVariants({ role, size, className }))} {...props}>
      {children}
    </div>
  );
}

export default Turn;
