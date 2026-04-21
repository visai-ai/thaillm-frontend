import { Suspense } from "react";
import ResetPasswordForm from "@/components/sections/auth/ResetPasswordForm";

const ForgetPasswordPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl sm:text-5xl bg-clip-text text-transparent bg-custom-linear-primary-dark font-semibold tracking-[-2%] py-2">
        ตั้งค่ารหัสผ่านใหม่
      </h1>
      <Suspense
        fallback={
          <div className="max-w-md mx-auto w-full p-6 bg-white border border-gray-200 shadow-xl rounded-xl">
            กำลังโหลด...
          </div>
        }
      >
        <ResetPasswordForm className="max-w-md mx-auto w-full p-6 bg-white border border-gray-200 shadow-xl rounded-xl" />
      </Suspense>
    </div>
  );
};

export default ForgetPasswordPage;
