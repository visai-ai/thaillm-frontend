import type { Metadata } from "next";

import { AuthFullLayout } from "@/components/layout/auth/Layout";

export const metadata: Metadata = {
  title: "ลงทะเบียนเสร็จสมบูรณ์",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthFullLayout>{children}</AuthFullLayout>;
}
