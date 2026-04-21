"use client";

import { useId, useState, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { passwordValidationRules } from "@/utils/validation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { EyeIcon, EyeOffIcon, CheckIcon } from "lucide-react";

const inputVariants = cva(
  "relative file:text-foreground placeholder:text-gray-500 selection:bg-primary-50 bg-white selection:text-gray-900 focus-within:ring-[4px] dark:bg-input/30 flex w-full min-w-0 rounded-md border text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden",
  {
    variants: {
      variant: {
        default: "focus-within:ring-gray-shadow border-gray-300",
        error: "focus-within:ring-error-shadow border-error-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type InputType = {
  label?: string;
  variant?: "default" | "error";
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
  hint?: string;
  inputClassName?: string;
  containerClassName?: string;
  hintClassName?: string;
  requiredLabel?: boolean;
} & React.ComponentProps<"input">;

function Input({
  label,
  variant = "default",
  prefixElement,
  suffixElement,
  hint,
  className,
  inputClassName,
  containerClassName,
  hintClassName,
  type,
  requiredLabel,
  ...props
}: InputType) {
  const inputId = useId();
  return (
    <div className={cn("flex flex-col", containerClassName)}>
      {label && (
        <Label htmlFor={inputId} className="mb-1.5">
          <span>
            {label}
            {requiredLabel ? (
              <span className="text-error-600 inline font-medium">*</span>
            ) : (
              ""
            )}
          </span>
        </Label>
      )}
      <div
        className={cn(
          inputVariants({ variant }),
          inputClassName,
          props.disabled &&
            "pointer-events-none cursor-not-allowed bg-gray-50 text-gray-500",
        )}
      >
        {prefixElement ? prefixElement : <></>}
        <input
          type={type}
          id={inputId}
          className={cn(
            "focus:outline-none grow py-2.5",
            prefixElement ? "pl-2" : "pl-3",
            suffixElement ? "pr-2" : "pr-3",
            className,
          )}
          {...props}
        />
        {suffixElement ? suffixElement : <></>}
      </div>
      {hint && (
        <span
          className={cn(
            "mt-1.5 text-sm text-left",
            variant === "error" && "text-error-600",
            variant === "default" && "text-gray-600",
            hintClassName,
          )}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

function PasswordInput({
  value: password,
  showValidation = true,
  ...props
}: InputType & { showValidation?: boolean }) {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return (
    <>
      <Input
        suffixElement={
          <Button
            type="button"
            variant={"icon"}
            size={"icon"}
            className="px-3 shrink-0"
            aria-label="Show/Close password"
            onClick={() => {
              setShowPassword(!showPassword);
            }}
          >
            {showPassword ? (
              <EyeOffIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
          </Button>
        }
        type={showPassword ? "text" : "password"}
        {...props}
      />
      {password && showValidation && (
        <>
          <div className="flex flex-col gap-1">
            {/* password validation */}
            {passwordValidationRules.map((rule, index) => {
              const passed = rule.test(password as string);
              return (
                <div key={index} className="flex items-center gap-3">
                  <CheckIcon
                    className={cn(
                      "w-5 h-5 p-0.5 stroke-[4px] rounded-full border-2 shrink-0 text-success-600 stroke-current",
                      passed
                        ? "text-success-600 border-success-600"
                        : "text-gray-600 border-gray-600",
                    )}
                  />
                  <span className="md:text-base text-sm text-gray-600">
                    {rule.label}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export { Input, PasswordInput };
