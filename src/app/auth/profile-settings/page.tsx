import { getUser } from "@/lib/api/util";

import ProfileSettingsForm from "@/components/sections/auth/ProfileSettingsForm";

const ProfileSettingsPage = async () => {
  const user = await getUser();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-5xl bg-clip-text text-transparent bg-custom-linear-primary-dark font-semibold tracking-[-2%] py-2">
        ตั้งค่าโปรไฟล์
      </h1>
      <ProfileSettingsForm
        userId={user?.id || ""}
        className="max-w-2xl mx-auto w-full p-6 bg-white border border-gray-200 shadow-xl rounded-xl"
      />
    </div>
  );
};

export default ProfileSettingsPage;
