import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chatbot Arena",
  description: "ทดลองเปรียบเทียบคำตอบจาก 2 โมเดลที่แตกต่างกัน",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
