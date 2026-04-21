import type { Metadata } from "next";

import { AuthFullLayout } from "@/components/layout/auth/Layout";

export const metadata: Metadata = {
  title: "โปรดยืนยันอีเมล",
  description:
    "ขอบคุณที่ลงทะเบียนใช้งานกับเรา โปรดยืนยันตัวตนที่อีเมล เพื่อให้การลงทะเบียนเสร็จสมบูรณ์",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthFullLayout>{children}</AuthFullLayout>;
}
