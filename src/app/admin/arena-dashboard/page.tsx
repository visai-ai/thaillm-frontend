import { getUser } from "@/lib/api/util";
import ArenaDashboardSection from "@/components/sections/admin/ArenaDashboardSection";
import ArenaExportButton from "@/components/sections/admin/ArenaExportButton";
import NoAccessSection from "@/components/common/NoAccessSection";

export default async function ArenaDashboardPage() {
  const me = await getUser();
  const isAdmin = !!me?.roles?.includes("admin");

  if (!isAdmin) {
    return <NoAccessSection />;
  }

  return (
    <div className="flex flex-col xl:py-8 md:py-6 py-4 gap-6 overflow-auto w-full xl:px-8 md:px-6 px-4">
      <div className="flex flex-wrap items-center gap-4">
        <header className="flex flex-col gap-1 grow">
          <h1 className="text-3xl text-gray-900 font-semibold">
            แดชบอร์ด Chatbot Arena
          </h1>
          <h4 className="text-gray-600">สถิติการเปรียบเทียบและโหวตโมเดล AI</h4>
        </header>
        <ArenaExportButton />
      </div>
      <ArenaDashboardSection />
    </div>
  );
}
