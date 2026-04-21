import type { Metadata } from "next";

import { AuthFormLayout } from "@/components/layout/auth/Layout";

export const metadata: Metadata = {
  title: "สมัครสมาชิก",
  description:
    "สมัครสมาชิกเพื่อเริ่มต้นการประเมินอาการกับผู้ช่วย AI พร้อมแจ้งเตือนทานยา และแนะนำการรักษาเบื้องต้น ในที่เดียว",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthFormLayout>{children}</AuthFormLayout>;
}
