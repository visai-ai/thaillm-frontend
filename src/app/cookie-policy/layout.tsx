import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "นโยบายการใช้คุกกี้",
  description: "นโยบายการใช้คุกกี้ (Cookie Policy) ของบริษัท วิสัย เอไอ จำกัด",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex p-4 bg-sidebar h-screen">
      <div className="bg-white w-full rounded-2xl overflow-auto">
        {children}
      </div>
    </div>
  );
}
