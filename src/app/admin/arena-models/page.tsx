import { getUser } from "@/lib/api/util";
import NoAccessSection from "@/components/common/NoAccessSection";
import ArenaModelManagementSection from "@/components/sections/admin/ArenaModelManagementSection";

export default async function ArenaModelsPage() {
  const me = await getUser();
  const isAdmin = !!me?.roles?.includes("admin");

  if (!isAdmin) return <NoAccessSection />;

  return (
    <div className="flex flex-col xl:py-8 md:py-6 py-4 gap-6 overflow-auto w-full xl:px-8 md:px-6 px-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl text-gray-900 font-semibold">
          จัดการโมเดล Arena
        </h1>
        <h4 className="text-gray-600">
          เพิ่ม แก้ไข หรือลบโมเดลที่ใช้ในระบบ Chatbot Arena
        </h4>
      </header>
      <ArenaModelManagementSection />
    </div>
  );
}
