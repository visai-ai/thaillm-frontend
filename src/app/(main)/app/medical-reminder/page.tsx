"use client";

import Link from "next/link";
import { useState } from "react";

import { PADDING_X_LAYOUT } from "@/constant/common";
import { cn } from "@/lib/utils";

import { Modal } from "@/components/common/CustomModal";
import EmptyState from "@/components/common/EmptyState";
import { LoadingFullScreen } from "@/components/common/Loading";
import {
  MedicalListTable,
  MedicalReminderScheduleItem,
} from "@/components/sections/medical-reminder/MedicalListTable";
import UpcomingReminder from "@/components/sections/medical-reminder/UpcomingReminder";
import AddMedicalReminderModal from "@/components/sections/medical-reminder/add-medical-form/AddMedicalReminderModal";
import { Button } from "@/components/ui/button";

import { useQueryGetUpcomingMedicalReminders } from "@/hooks/useQueryGetUpcomingMedicalReminders";
import {
  useQueryListMedicalSchedule,
  useQueryListMedicalScheduleById,
} from "@/hooks/useQueryListMedicalSchedule";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { AlertTriangle, History, PlusIcon } from "lucide-react";

import { LoadingSpinner } from "@/components/common/Loading";
import api from "@/lib/api";

export default function Page() {
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [editMedicalReminderId, setEditMedicalReminderId] =
    useState<string>("");
  const [deleteMedicalReminderId, setDeleteMedicalReminderId] =
    useState<string>("");

  const { data, refetch, error, isLoading } = useQueryListMedicalSchedule();
  const { data: upcomingData, refetch: refetchUpcomingData } =
    useQueryGetUpcomingMedicalReminders();
  const { addNotification } = useNotificationStore();

  const medicalReminderScheduleList = data?.list || [];

  const addMedicalReminderButton = (
    <Button onClick={() => setOpenModal(true)}>
      <PlusIcon className="size-5 shrink-0" /> เพิ่มรายการแจ้งเตือนยา
    </Button>
  );

  const queryById = useQueryListMedicalScheduleById(
    editMedicalReminderId || "",
  );
  const isLoadingEditData = queryById.isLoading;
  const editData = queryById.data;
  const showModal = openModal || editData?.item !== undefined;

  const deleteData = data?.list.find(
    (item: MedicalReminderScheduleItem) => item.id === deleteMedicalReminderId,
  );

  const handleFetchData = () => {
    refetch();
    refetchUpcomingData();
  };

  const onDelete = async () => {
    try {
      const res = await api.medicalReminder.deleteMedicalReminderScheduleById(
        deleteData?.id || "",
      );
      if (!res.ok) {
        addNotification({
          state: "error",
          title: "ลบการแจ้งเตือนยาไม่สำเร็จ",
          description: `${res.data.error}: ลบการแจ้งเตือนยาไม่สำเร็จ`,
        });
        return;
      }
      handleFetchData();
      addNotification({
        state: "success",
        title: "ลบการแจ้งเตือนยาสำเร็จ",
        description: `ลบการแจ้งเตือนทานยา '${deleteData?.medicalName || ""}' สำเร็จ`,
      });
    } catch (error) {
      addNotification({
        state: "error",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบการแจ้งเตือนยาได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setDeleteMedicalReminderId("");
    }
  };

  return (
    <>
      {isLoadingEditData ? (
        <LoadingFullScreen />
      ) : (
        <>
          {showModal && (
            <AddMedicalReminderModal
              open={showModal}
              onOpenChange={(state) => {
                if (!state) {
                  setEditMedicalReminderId("");
                }
                setOpenModal(state);
              }}
              onRefetch={handleFetchData}
              defaultValues={editData?.item}
            />
          )}
        </>
      )}

      {deleteData && (
        <ConfirmationDeleteMedicalReminderModal
          open={deleteMedicalReminderId !== ""}
          onOpenChange={(state) => {
            if (!state) {
              setDeleteMedicalReminderId("");
            }
          }}
          medicalName={deleteData.medicalName || ""}
          onDelete={onDelete}
        />
      )}

      <div className="flex flex-col xl:py-8 md:py-6 py-4 gap-4 overflow-auto w-full">
        <div
          className={cn(
            "flex xl:flex-row flex-col items-start gap-4",
            PADDING_X_LAYOUT,
          )}
        >
          <header className="flex flex-col gap-1 grow">
            <h1 className="text-3xl text-gray-900 font-semibold">
              รายการแจ้งเตือนยา
            </h1>
            <h4 className="text-gray-600">จัดการการแจ้งเตือนการทานยาของคุณ</h4>
          </header>
          <div className="flex flex-wrap justify-end gap-3 ml-auto">
            <Button variant={"secondary"} asChild>
              <Link href={`/app/medical-reminder/history`}>
                <History className="size-5 shrink-0" />
                ประวัติการทานยา
              </Link>
            </Button>
            {addMedicalReminderButton}
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Error display */}
            {error && (
              <div className={cn(PADDING_X_LAYOUT)}>
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="text-red-800 text-sm">{error?.message}</div>
                  </div>
                </div>
              </div>
            )}
            {medicalReminderScheduleList.length === 0 ? (
              <section className="grow flex items-center justify-center">
                <EmptyState
                  state="search"
                  title="ยังไม่มีรายการยาในระบบ"
                  description={`เพิ่มรายการยาเพื่อให้เราช่วยเตือนคุณได้ตรงเวลา\nไม่พลาดทุกมื้อสำคัญ`}
                  action={<>{addMedicalReminderButton}</>}
                />
              </section>
            ) : (
              <>
                <UpcomingReminder
                  schedulesUpcomingList={upcomingData || []}
                  onRefresh={refetchUpcomingData}
                />
                <section
                  className={cn("flex flex-col gap-4", PADDING_X_LAYOUT)}
                >
                  <h3 className="font-semibold text-gray-900">
                    รายการยา ({medicalReminderScheduleList.length})
                  </h3>
                  <MedicalListTable
                    data={medicalReminderScheduleList}
                    onEdit={(id: string) => {
                      setEditMedicalReminderId(id);
                    }}
                    onDelete={(id: string) => {
                      setDeleteMedicalReminderId(id);
                    }}
                  />
                </section>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

const ConfirmationDeleteMedicalReminderModal = ({
  open,
  onOpenChange,
  medicalName,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  medicalName: string;
  onDelete?: () => void;
}) => {
  const handleCloseModal = () => {
    onOpenChange(false);
  };

  return (
    <Modal
      className="w-100"
      open={open}
      onOpenChange={onOpenChange}
      icon={AlertTriangle}
      variant={"warning"}
      title="ยืนยันการลบการแจ้งเตือนยา"
      description={`คุณต้องการลบการแจ้งเตือนการทานยา ‘${medicalName}’  ใช่หรือไม่\nข้อมูลการแจ้งเตือนที่จะเกิดขึ้นในภายหน้าจะถูกลบ`}
      footer={
        <>
          <Button
            variant={`secondary`}
            className="grow basis-0"
            onClick={handleCloseModal}
          >
            ยกเลิก
          </Button>
          <Button
            variant={`destructive`}
            autoFocus
            className="grow basis-0"
            onClick={onDelete}
          >
            ลบ
          </Button>
        </>
      }
    />
  );
};
