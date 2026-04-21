import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import useAuth from "@/hooks/use-auth";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  CloseModalButton,
  CustomTriggerModal,
} from "@/components/common/CustomModal";

export const DeleteAccountSection = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { logout } = useAuth();

  const deleteUser = async () => {
    const response = await api.user.deleteUser(user?.id || "");
    if (response.ok) {
      addNotification({
        state: "success",
        title: "ลบบัญชีการใช้งาน",
        description: "ลบบัญชีการใช้งานสำเร็จ",
      });
      await logout();
      router.push("/auth/login");
    } else {
      addNotification({
        state: "error",
        title: "ลบบัญชีการใช้งาน",
        description: "เกิดข้อผิดพลาดในการลบบัญชีการใช้งาน",
      });
    }
  };

  return (
    <CustomTriggerModal
      title="ยืนยันการลบบัญชีการใช้งาน"
      description="คุณต้องการลบบัญชีการใช้งานและข้อมูลทั้งหมดถาวร ใช่หรือไม่"
      icon={AlertTriangle}
      variant="warning"
      className={`w-full sm:max-w-[400px]`}
      footer={
        <div className="flex gap-3 w-full">
          <CloseModalButton variant={"secondary"} className="grow basis-0">
            ยกเลิก
          </CloseModalButton>
          <Button
            variant="destructive"
            className="grow basis-0"
            onClick={deleteUser}
          >
            ลบ
          </Button>
        </div>
      }
    >
      <Button variant="outline-destructive" className="w-fit">
        ลบบัญชีการใช้งาน
      </Button>
    </CustomTriggerModal>
  );
};
