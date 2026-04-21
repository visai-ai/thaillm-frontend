import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "รายการนัดหมายแพทย์",
  description: "สร้างการแจ้งเตือนตามวันที่และเวลาที่คุณต้องการ",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
