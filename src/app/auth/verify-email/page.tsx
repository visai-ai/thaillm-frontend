"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/use-auth";

// This is a client component that will be used inside Suspense
function VerifyEmailContent() {
  const START_TIME = 61;
  const router = useRouter();
  const [resendCountdown, setResendCountdown] = useState<number>(START_TIME);
  const { getMe, resendEmailVerification } = useAuth();
  const interval = useRef<NodeJS.Timeout | null>(null);
  const intervalPoll = useRef<NodeJS.Timeout | null>(null);
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  useEffect(() => {
    const handleFetchMe = async () => {
      const resp = await getMe();
      if (resp.ok) {
        if (resp.data.emailVerified) {
          const VERIFIED_PAGE = "/auth/verified-email";
          if (intervalPoll.current) clearInterval(intervalPoll.current);
          router.push(VERIFIED_PAGE);
        }
      }
    };

    intervalPoll.current = setInterval(() => {
      handleFetchMe();
    }, 5000); // Poll every 5 seconds

    return () => {
      if (intervalPoll.current) clearInterval(intervalPoll.current);
    };
  }, [getMe, router]);

  const handleResendEmail = async () => {
    try {
      resendEmailVerification(email as string);
      interval.current = setInterval(() => {
        setResendCountdown((prevState) => prevState - 1);
      }, 1000);
    } catch (error) {}
  };

  useEffect(() => {
    if (resendCountdown === 0) {
      if (interval.current) clearInterval(interval.current);
      setResendCountdown(START_TIME);
    }
  }, [resendCountdown]);

  useEffect(() => {
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-custom-linear-primary-dark font-semibold tracking-[-2%] py-2">
        โปรดยืนยันอีเมล
      </h1>
      <p className="text-sm sm:text-lg text-gray-700">
        ขอบคุณที่ลงทะเบียนใช้งานกับเรา
        <br />
        เราได้ส่งลิงก์ยืนยันตัวตนไปที่อีเมล {email}
        <br />
        <br />
        โปรดยืนยันตัวตนภายใน 1 ชั่วโมง เพื่อให้การลงทะเบียนเสร็จสมบูรณ์
      </p>
      <div className="flex sm:block flex-col">
        <span className="text-xs sm:text-base text-gray-500">
          ไม่ได้รับอีเมลยืนยันตัวตน?
        </span>
        <div className="text-xs sm:text-sm text-primary-700 font-semibold inline ml-2">
          <Button
            variant={`link`}
            className="disabled:text-primary-700"
            onClick={handleResendEmail}
            disabled={resendCountdown !== START_TIME}
          >
            ส่งอีเมลใหม่อีกครั้ง
          </Button>
          {resendCountdown !== START_TIME ? (
            <span className="cursor-default">ใน {resendCountdown} วินาที</span>
          ) : (
            <></>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function VerifyEmailLoading() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-5xl bg-clip-text text-transparent bg-custom-linear-primary-dark font-semibold tracking-[-2%] py-2">
        โปรดรอสักครู่...
      </h1>
      <p className="text-lg text-gray-700">กำลังโหลดข้อมูล</p>
    </div>
  );
}

const VerifyEmail = () => {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  );
};

export default VerifyEmail;
