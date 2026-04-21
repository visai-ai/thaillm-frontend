import type { Metadata } from "next";

import { AuthFormLayout } from "@/components/layout/auth/Layout";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
  description:
    "เข้าสู่ระบบเพื่อเริ่มต้นการประเมินอาการกับผู้ช่วย AI พร้อมแจ้งเตือนทานยา และแนะนำการรักษาเบื้องต้น ในที่เดียว",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthFormLayout>{children}</AuthFormLayout>;
}
