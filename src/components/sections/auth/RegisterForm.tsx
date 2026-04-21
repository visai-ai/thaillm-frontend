"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useCheckScrollToBottom } from "@/hooks/use-scroll";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
  RegisterFormValues,
} from "@/lib/schema/validationSchema";

import { cn } from "@/lib/utils";
import { passwordValidationRules, isPasswordValid } from "@/utils/validation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { PasswordInput, Input } from "@/components/common/CustomInput";
import { CloseModalButton, Modal } from "@/components/common/CustomModal";

import GoogleIcon from "@/../public/icons/google.svg";
import TermsOfUse from "./TermsOfUse";
import PrivacyNotice from "./PrivacyNotice";
import { LoadingSpinner } from "@/components/common/Loading";
import { authClient } from "@/lib/auth-client";
import { getBasePath } from "@/lib/config";
import appConfig from "@/config/appConfig";

interface RegisterFormProps extends React.ComponentProps<"form"> {
  isLoading?: boolean;
  className?: string;
  onHandleSubmit?: (data: RegisterFormValues) => void;
}

const RegisterForm = ({
  isLoading,
  className,
  onHandleSubmit,
  ...props
}: RegisterFormProps) => {
  const {
    control,
    setValue,
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    defaultValues: {
      acceptTermsCondition: false,
    },
  });

  const registerFormId = useId();
  const acceptTermsConditionId = useId();

  const email = watch("email");
  const password = watch("password");
  const acceptTermsCondition = watch("acceptTermsCondition");

  const [openTermConditionModal, setOpenTermConditionModal] = useState(false);

  const handleRegisterSubmit = (data: RegisterFormValues) => {
    if (!isValid) return;
    if (onHandleSubmit) {
      onHandleSubmit(data);
    }
  };

  const handleGoogleLogin = () => {
    const callbackURL = appConfig.appBaseUrl + "/login/callback";
    authClient.signIn.social({
      provider: "google",
      callbackURL: callbackURL,
    });
  };

  const handleAcceptTermsConditionClick = () => {
    if (acceptTermsCondition) {
      setValue("acceptTermsCondition", false, {
        shouldValidate: true,
      });
      return;
    }
    setOpenTermConditionModal(!openTermConditionModal);
  };

  return (
    <form
      id={registerFormId}
      onSubmit={handleSubmit(handleRegisterSubmit)}
      className={cn("flex flex-col gap-4", className)}
      noValidate
      {...props}
    >
      <div className="flex flex-col items-start gap-1 text-left">
        <h1 className="text-lg font-semibold text-gray-900">
          สร้างบัญชีเพื่อเริ่มต้นใช้งาน
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
            disabled={isLoading}
            label={"อีเมล"}
            type="email"
            placeholder="กรอกอีเมล"
            {...register("email", {
              required: "กรุณากรอกอีเมล",
            })}
            variant={errors.email ? "error" : "default"}
            hint={errors.email?.message}
          />
        </div>
        <div className="grid gap-1.5">
          <PasswordInput
            value={password}
            disabled={isLoading}
            label={"รหัสผ่าน"}
            placeholder="สร้างรหัสผ่าน"
            variant={errors.password ? "error" : "default"}
            hint={errors.password?.message}
            {...register("password", {
              required: "กรุณากรอกรหัสผ่าน",
            })}
          />
        </div>
        {password && (
          <>
            {openTermConditionModal && (
              <TermsConditionsModal
                open={openTermConditionModal}
                onTermsConditionSubmit={() => {
                  setValue("acceptTermsCondition", true, {
                    shouldValidate: true,
                  });
                  setOpenTermConditionModal(false);
                }}
              />
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <Checkbox
                disabled={isLoading}
                className="cursor-pointer"
                id={acceptTermsConditionId}
                checked={acceptTermsCondition}
                aria-labelledby={acceptTermsConditionId}
                onClick={handleAcceptTermsConditionClick}
              />
              <Label
                htmlFor={acceptTermsConditionId}
                className="cursor-[inherit] text-left gap-0.5"
              >
                <div className="font-normal gap-0.5">
                  ข้าพเจ้ายอมรับ{" "}
                  <span className="font-semibold inline">
                    ข้อกำหนดการใช้งาน
                  </span>{" "}
                  และ{" "}
                  <span className="font-semibold inline">
                    นโยบายความเป็นส่วนตัว
                  </span>
                </div>
              </Label>
            </div>
          </>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={
            !email ||
            !password ||
            !acceptTermsCondition ||
            !isPasswordValid(password) ||
            isLoading
          }
        >
          {isLoading && <LoadingSpinner size={16} className="mr-2" />}
          สมัครสมาชิก
        </Button>
      </div>
      <div className="flex justify-end mt-2">
        <p className="text-gray-600 font-medium text-sm text-balance">
          มีบัญชีใช้งานอยู่แล้ว?{" "}
          <Button type="button" variant={`link`} asChild>
            <Link
              href={`/auth/login`}
              className="text-primary-600 font-semibold"
            >
              เข้าสู่ระบบ
            </Link>
          </Button>
        </p>
      </div>
    </form>
  );
};

const TERMS_CONDITION_WIDTH = "878px";

interface TermsConditionsProps {
  open?: boolean;
  onTermsConditionSubmit: () => void;
}
const TermsConditionsModal = ({
  onTermsConditionSubmit,
  open = false,
}: TermsConditionsProps) => {
  const { scrollRef, isAtBottom, setTriggerScrollToBottom } =
    useCheckScrollToBottom();

  return (
    <Modal
      open={open}
      className="max-w-[max(min(1080px,90vw),600px)]"
      onOpenChange={() => {
        setTriggerScrollToBottom(true);
      }}
      showCloseButton={false}
      title={
        <div className="text-center text-gray-900 font-semibold">
          ข้อกำหนดการใช้งาน
        </div>
      }
      body={
        <section
          ref={scrollRef}
          className="border overflow-auto border-gray-200 rounded-lg p-4"
        >
          <TermsOfUse />
          <hr className="mb-6" />
          <PrivacyNotice />
        </section>
      }
      footer={
        <>
          <div className="mt-8 flex justify-center grow">
            <CloseModalButton
              variant={`default`}
              className="max-w-[250px] w-full"
              disabled={!isAtBottom}
              onClick={() => {
                onTermsConditionSubmit();
              }}
            >
              ยอมรับ
            </CloseModalButton>
          </div>
        </>
      }
    />
  );
};

export default RegisterForm;
