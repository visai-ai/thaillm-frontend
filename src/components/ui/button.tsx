import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const linkDefault =
  "text-primary-700 hover:text-primary-800 disabled:text-gray-400 p-0 group";

const buttonVariants = cva(
  "inline-flex cursor-pointer whitespace-nowrap items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none outline-hidden aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary-600 text-white shadow-xs hover:bg-primary-700 border border-primary-600 hover:border-primary-700 focus:ring-4 ring-primary-shadow disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 disabled:ring-0",
        destructive:
          "bg-error-600 text-white shadow-xs hover:bg-error-700 border border-error-600 hover:border-error-700 focus:ring-4 ring-error-shadow disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 disabled:ring-0",
        outline:
          "bg-white text-primary-700 shadow-xs hover:bg-primary-50 border border-primary-300 focus:ring-4 ring-primary-shadow disabled:bg-white disabled:border-gray-200 disabled:text-gray-400 disabled:ring-0",
        "outline-destructive":
          "bg-white text-error-700 shadow-xs hover:bg-error-50 border border-error-300 focus:ring-4 ring-error-shadow disabled:bg-white disabled:border-gray-200 disabled:text-gray-400 disabled:ring-0",
        secondary:
          "bg-white border border-gray-300 shadow-xs text-gray-700 hover:bg-gray-50 focus:ring-4 ring-gray-shadow disabled:bg-white disabled:border-gray-200 disabled:text-gray-400 disabled:ring-0",
        ghost:
          "text-primary-700 hover:text-primary-700 hover:bg-primary-50 disabled:text-gray-400",
        "ghost-secondary":
          "text-gray-600 hover:text-gray-700 hover:bg-gray-50 disabled:text-gray-400",
        "ghost-destructive":
          "text-error-600 hover:text-error-700 hover:bg-error-50 disabled:text-gray-400",
        link: "text-primary-700 w-fit hover:text-primary-800 disabled:text-gray-400 !p-0",
        icon: "text-gray-400 hover:text-gray-600 disabled:text-gray-300",
      },
      size: {
        default: "py-2.5 px-4 font-semibold",
        sm: "py-2 px-3 text-sm font-semibold",
        lg: "py-4 px-[22px] text-lg font-semibold",
        icon: "p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonType = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonType) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
