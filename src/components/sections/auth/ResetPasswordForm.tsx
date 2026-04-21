"use client";

import { useState, useEffect } from "react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PasswordFormValues,
  passwordSchema,
} from "@/lib/schema/validationSchema";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";

import { PasswordInput } from "@/components/common/CustomInput";
import { Button } from "@/components/ui/button";
import api from "@/lib/api/auth";

const ResetPasswordForm = ({
  className,
  ...props
}: React.ComponentProps<"form">) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const {
    watch,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onSubmit",
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const resetPasswordFormId = useId();

  useEffect(() => {
    // Extract token from URL query parameter
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setSubmitMessage("url ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
    }
  }, [searchParams]);

  const handleResetPasswordSubmit = async (data: PasswordFormValues) => {
    if (!token) {
      setSubmitMessage("url ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      const response = await api.resetPassword(token, data.password);
      if (response.ok) {
        setIsSuccess(true);
        setSubmitMessage(
          "ตั้งรหัสผ่านใหม่สำเร็จ กำลังนำคุณไปหน้าเข้าสู่ระบบ...",
        );
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } else {
        setIsSuccess(false);
        setSubmitMessage(
          response.data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        );
      }
    } catch (error) {
      setIsSuccess(false);
      setSubmitMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      id={resetPasswordFormId}
      onSubmit={handleSubmit(handleResetPasswordSubmit)}
      noValidate
      className={cn("flex flex-col justify-center gap-4", className)}
      {...props}
    >
      <PasswordInput
        value={password}
        label={"รหัสผ่าน"}
        placeholder="กรอกรหัสผ่าน"
        {...register("password", {
          required: "กรุณากรอกรหัสผ่าน",
        })}
      />
      <PasswordInput
        value={confirmPassword}
        label={"ยืนยันรหัสผ่าน"}
        placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
        {...register("confirmPassword", {
          required: "กรุณากรอกรหัสผ่าน",
        })}
        showValidation={false}
        hint={errors?.confirmPassword?.message}
        hintClassName="text-red-600 font-medium"
      />
      {submitMessage && (
        <p
          className={cn(
            "text-sm text-center",
            isSuccess ? "text-success-700" : "text-error-700",
          )}
        >
          {submitMessage}
        </p>
      )}
      <Button
        type="submit"
        className="w-full text-sm"
        disabled={!password || !confirmPassword || !token || isSubmitting}
      >
        {isSubmitting ? "กำลังตั้งค่ารหัสผ่าน..." : "ตั้งค่ารหัสผ่าน"}
      </Button>
    </form>
  );
};

export default ResetPasswordForm;
