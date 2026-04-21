import ForgetPasswordForm from "@/components/sections/auth/ForgetPasswordForm";

const ForgetPasswordPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl sm:text-5xl bg-clip-text text-transparent bg-custom-linear-primary-dark font-semibold tracking-[-2%] py-2">
        ตั้งค่ารหัสผ่านใหม่
      </h1>
      <p className="text-base sm:text-lg text-gray-700 max-w-sm mx-auto w-full">
        โปรดใส่อีเมลที่ลงทะเบียนไว้ด้านล่างและเราจะส่งลิงก์ให้คุณเพื่อรีเซ็ตรหัสผ่านของคุณ
      </p>
      <ForgetPasswordForm />
    </div>
  );
};

export default ForgetPasswordPage;
