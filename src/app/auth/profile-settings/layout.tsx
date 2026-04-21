import type { Metadata } from "next";

import { AuthFullLayout } from "@/components/layout/auth/Layout";

export const metadata: Metadata = {
  title: "ตั้งค่าโปรไฟล์",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthFullLayout>{children}</AuthFullLayout>;
}
