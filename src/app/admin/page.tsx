import { getUser } from "@/lib/api/util";
import AdminUsersHeader from "../../components/sections/admin/AdminUsersHeader";
import NoAccessSection from "../../components/common/NoAccessSection";

export default async function Page() {
  const me = await getUser();
  const isAdmin = !!me?.roles?.includes("admin");

  if (!isAdmin) {
    return <NoAccessSection />;
  }

  return (
    <div className="flex flex-col xl:py-8 md:py-6 py-4 gap-6 overflow-auto w-full xl:px-8 md:px-6 px-4">
      <AdminUsersHeader />
    </div>
  );
}
