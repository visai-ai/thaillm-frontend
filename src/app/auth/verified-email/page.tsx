"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import appConfig from "@/config/appConfig";
import { getBasePath } from "@/lib/config";

const VerifiedEmailPage = () => {
  const START_TIME = 5;

  const [countdown, setCountdown] = useState<number>(START_TIME);
  const interval = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  useEffect(() => {
    interval.current = setInterval(() => {
      setCountdown((prevState) => prevState - 1);
    }, 1000);

    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      // window.history.pushState(null, "", "/auth/login");
      window.location.href = getBasePath() + "/";
      if (interval.current) clearInterval(interval.current);
      setCountdown(START_TIME);
    }
  }, [countdown]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-custom-linear-primary-dark font-semibold tracking-[-2%] py-2">
        ลงทะเบียนเสร็จสมบูรณ์
      </h1>
      <p className="text-sm sm:text-lg text-gray-700">
        คุณสามารถเข้าใช้งานด้วยอีเมลและรหัสผ่านของคุณ
      </p>
      <div className="text-sm sm:text-base block text-gray-500">
        เรากำลังพาคุณไปยังหน้าเข้าสู่ระบบใน {countdown} วินาที
      </div>
    </div>
  );
};

export default VerifiedEmailPage;
