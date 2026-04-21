"use client";

import Link from "next/link";
import { useId, useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Input, PasswordInput } from "@/components/common/CustomInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import GoogleIcon from "@/../public/icons/google.svg";
import appConfig from "@/config/appConfig";
import { authClient } from "@/lib/auth-client";
import { LoginFormValues, loginSchema } from "@/lib/schema/validationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const REMEMBER_ME_EMAIL_KEY = "bdi-remember-me-email";

interface LoginFormProps extends React.ComponentProps<"form"> {
  onLoginSubmit?: (email: string, password: string) => void;
}
const LoginForm = ({ className, onLoginSubmit, ...props }: LoginFormProps) => {
  const loginFormId = useId();
  const rememberMeId = useId();
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      rememberMe: false,
    },
  });

  // Load remembered email on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const rememberedEmail = localStorage.getItem(REMEMBER_ME_EMAIL_KEY);
      if (rememberedEmail) {
        setValue("email", rememberedEmail);
        setRememberMe(true);
        setValue("rememberMe", true);
      }
    }
  }, [setValue]);

  const handleGoogleLogin = () => {
    const callbackURL = appConfig.appBaseUrl + "/login/callback";
    authClient.signIn.social({
      provider: "google",
      callbackURL: callbackURL,
    });
  };

  const onHandleSubmit = (data: LoginFormValues) => {
    if (!isValid) return;

    const rememberMeValue = data.rememberMe ?? false;

    // Store email in localStorage if rememberMe is checked
    if (rememberMeValue && typeof window !== "undefined") {
      localStorage.setItem(REMEMBER_ME_EMAIL_KEY, data.email);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem(REMEMBER_ME_EMAIL_KEY);
    }

    if (onLoginSubmit) {
      onLoginSubmit(data.email, data.password);
    }
  };

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    setValue("rememberMe", checked);
  };

  return (
    <form
      id={loginFormId}
      onSubmit={handleSubmit(onHandleSubmit)}
      className={cn("flex flex-col gap-4", className)}
      noValidate
      {...props}
    >
      <div className="flex flex-col items-start gap-1 text-left">
        <h1 className="text-lg font-semibold text-gray-900">
          เข้าสู่ระบบเพื่อใช้งาน
        </h1>
      </div>
      <Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleGoogleLogin();
        }}
        variant="secondary"
        className="w-full"
      >
        <GoogleIcon className="w-6 h-6" />
        เข้าสู่ระบบด้วย Google
      </Button>
      <div className="after:border-gray-300 relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
        <span className="bg-background text-gray-500 relative z-10 px-4">
          หรือ
        </span>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Input
            label={"อีเมล"}
            type="email"
            placeholder="กรอกอีเมล"
            variant={errors.email ? "error" : "default"}
            hint={errors.email?.message}
            {...register("email")}
          />
        </div>
        <div className="grid gap-1.5">
          <PasswordInput
            label={"รหัสผ่าน"}
            placeholder="กรอกรหัสผ่าน"
            variant={errors.password ? "error" : "default"}
            hint={errors.password?.message}
            {...register("password")}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <Checkbox
              className="cursor-pointer"
              id={rememberMeId}
              aria-labelledby={rememberMeId}
              checked={rememberMe}
              onCheckedChange={(checked) =>
                handleRememberMeChange(checked === true)
              }
            />
            <Label htmlFor={rememberMeId} className="cursor-[inherit]">
              จำฉันไว้ในระบบ
            </Label>
          </div>
          <Button type="button" variant={`link`} className="text-sm" asChild>
            <Link href={`/auth/forget-password`}>ลืมรหัสผ่าน</Link>
          </Button>
        </div>
        <Button type="submit" className="w-full">
          เข้าสู่ระบบ
        </Button>
      </div>
      <div>
        <div className="flex justify-end mt-2">
          <p className="text-gray-600 font-medium text-sm text-balance">
            ยังไม่มีบัญชีผู้ใช้?{" "}
            <Button type="button" variant={`link`} asChild>
              <Link
                href={`/auth/register`}
                className="text-primary-600 font-semibold"
              >
                สมัครสมาชิก
              </Link>
            </Button>
          </p>
        </div>
      </div>
    </form>
  );
};

export default LoginForm;
