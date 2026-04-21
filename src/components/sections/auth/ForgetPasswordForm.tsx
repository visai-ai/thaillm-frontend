"use client";

import { useState } from "react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailSchema, EmailFormValues } from "@/lib/schema/validationSchema";
import { cn } from "@/lib/utils";

import { Input } from "@/components/common/CustomInput";
import { Button } from "@/components/ui/button";
import api from "@/lib/api/auth";
import { useRouter } from "next/navigation";

const ForgetPasswordForm = ({
  className,
  ...props
}: React.ComponentProps<"form">) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const {
    watch,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    mode: "onSubmit",
  });

  const email = watch("email");
  const forgetPasswordFormId = useId();

  const handleForgetPasswordSubmit = async (data: EmailFormValues) => {
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      const response = await api.forgetPassword(data.email);
      if (response.ok) {
        setIsSuccess(true);
        setSubmitMessage(
          "ส่งอีเมลรีเซ็ตรหัสผ่านสำเร็จ กรุณาตรวจสอบอีเมลของคุณ",
        );
        setTimeout(() => {
          router.push("/auth/login");
        }, 3000);
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
      id={forgetPasswordFormId}
      onSubmit={handleSubmit(handleForgetPasswordSubmit)}
      noValidate
      className={cn("flex flex-col justify-center gap-4", className)}
      {...props}
    >
      <Input
        label={"อีเมล"}
        type="email"
        placeholder="กรอกอีเมล"
        {...register("email", {
          required: "กรุณากรอกอีเมล",
        })}
        variant={errors?.email ? "error" : "default"}
        hint={errors?.email?.message}
        containerClassName="w-full max-w-xs mx-auto"
      />
      {submitMessage && (
        <p
          className={cn(
            "text-sm text-center max-w-xs mx-auto",
            isSuccess ? "text-success-700" : "text-error-700",
          )}
        >
          {submitMessage}
        </p>
      )}
      <Button
        type="submit"
        className="w-fit mx-auto"
        disabled={!email || isSubmitting}
      >
        {isSubmitting ? "กำลังส่ง..." : "ดำเนินการต่อ"}
      </Button>
    </form>
  );
};

export default ForgetPasswordForm;
