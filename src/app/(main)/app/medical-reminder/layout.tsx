import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "รายการแจ้งเตือนยา",
  description: "จัดการการแจ้งเตือนการทานยาของคุณ",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
