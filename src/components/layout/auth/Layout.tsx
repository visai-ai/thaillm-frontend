import Image from "next/image";
import { Cross } from "lucide-react";

import GradientBackground from "@/../public/images/gradient_bg.webp";

export const AuthFormLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex grow h-svh overflow-hidden">
      {/* banner */}
      <div className="relative w-1/2 flex-col justify-center pb-[20%] text-left gap-4 bg-size-[auto_100%] bg-no-repeat bg-center bg-secondary-100 pl-8 pr-40 hidden sm:flex">
        <div className="absolute top-0 left-0 w-full h-full bg-secondary-100">
          <Image
            src={GradientBackground}
            alt="gradient background"
            className="w-full h-full object-right object-cover"
          />
        </div>
        <div className="max-w-md mx-auto relative">
          <h1 className="bg-clip-text text-transparent bg-custom-linear-primary text-2xl md:text-4xl lg:text-5xl font-semibold py-4 leading-[1.3]">
            ให้ทุกอาการได้รับการดูแล
            <br />
            เริ่มจากบทสนทนาที่เข้าใจคุณ{" "}
            <Cross className="size-6 text-white inline mb-8" />
          </h1>
          <div className="text-gray-700 font-medium text-md md:text-xl lg:text-2xl inline">
            เข้าสู่ระบบเพื่อเริ่มต้นการประเมินอาการกับผู้ช่วย AI
            พร้อมแจ้งเตือนทานยา และแนะนำการรักษาเบื้องต้น ในที่เดียว
          </div>
        </div>
      </div>
      {/* body */}
      <div className="w-full sm:w-1/2 overflow-auto flex items-center px-4 sm:px-1 sm:pr-6 lg:px-8 relative">
        {children}
      </div>
    </main>
  );
};

export const AuthFullLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex h-svh overflow-hidden">
      <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 bg-secondary-400 opacity-[0.8] w-[70%] h-[528px] blur-[260px] rounded-full z-1"></div>
      <div className="absolute bottom-[-10%] left-4/5 -translate-x-4/5 bg-[#233EDC] opacity-[0.8] w-1/3 h-[400px] blur-[200px] rounded-full z-2"></div>
      <div className="absolute bottom-[-50%] right-[-20%]  bg-[#8257C4] opacity-[0.08] w-full h-full blur-[260px] rounded-full z-0"></div>
      <div className="absolute left-0  bg-secondary-400 opacity-[0.3] w-1/2 h-full blur-[260px] z-0"></div>
      <div className="relative z-10 bg-white/40 border border-white w-[90svw] h-[90svh] m-auto backdrop-blur-sm rounded-xl xl:py-24 md:py-20 sm:py-16 py-12 px-4 sm:px-8 text-center">
        {children}
      </div>
    </main>
  );
};

const Layout = () => {
  return <></>;
};

export default Layout;
