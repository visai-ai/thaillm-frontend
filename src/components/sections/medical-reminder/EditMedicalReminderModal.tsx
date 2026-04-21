"use client";

import { GetMedicalRemindersSchedulesResponse } from "@/@types/backend-api";
import { Modal } from "@/components/common/CustomModal";
import { Button } from "@/components/ui/button";
import { MEAL_TIMING, MealTimingKey } from "@/constant/medicalReminder";
import { useQueryListMedicalSchedule } from "@/hooks/useQueryListMedicalSchedule";
import api from "@/lib/api";
import { useNotificationStore } from "@/stores/useNotificationStore";
import clsx from "clsx";
import dayjs from "dayjs";
import "dayjs/locale/th";
import buddhistEra from "dayjs/plugin/buddhistEra";
import {
  AlertCircleIcon,
  AlertTriangle,
  PenIcon,
  Pill,
  TrashIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import AddMedicalReminderModal from "./add-medical-form/AddMedicalReminderModal";

dayjs.extend(buddhistEra);

export type MedicalReminderSchedule =
  GetMedicalRemindersSchedulesResponse["list"];
export type MedicalReminderScheduleItem = MedicalReminderSchedule[number];

const EditMedicalReminderModal = ({
  open,
  onOpenChange,
  onRefetch,
}: {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  onRefetch?: () => void;
}) => {
  const { data, refetch, error, isLoading } = useQueryListMedicalSchedule();
  const [editingItem, setEditingItem] =
    useState<MedicalReminderScheduleItem | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string>("");
  const { addNotification } = useNotificationStore();

  const medicalReminders = data?.list || [];

  // Refetch data when modal opens
  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const handleEdit = (item: MedicalReminderScheduleItem) => {
    setEditingItem(item);
    setShowEditForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteItemId(id);
  };

  const handleDelete = async () => {
    try {
      const response =
        await api.medicalReminder.deleteMedicalReminderScheduleById(
          deleteItemId,
        );
      if (response.ok) {
        addNotification({
          state: "success",
          title: "ลบการแจ้งเตือนสำเร็จ",
          description: "การแจ้งเตือนทานยาถูกลบออกจากระบบแล้ว",
        });
        refetch();
        onRefetch?.();
      } else {
        addNotification({
          state: "error",
          title: "ไม่สามารถลบได้",
          description: response.data.error || "เกิดข้อผิดพลาดในการลบ",
        });
      }
    } catch (error) {
      addNotification({
        state: "error",
        title: "ไม่สามารถลบได้",
        description: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      });
    } finally {
      setDeleteItemId("");
    }
  };

  const handleEditComplete = () => {
    setShowEditForm(false);
    setEditingItem(null);
    refetch();
    onRefetch?.();
  };

  const deleteItem = medicalReminders.find((item) => item.id === deleteItemId);

  if (showEditForm && editingItem) {
    return (
      <AddMedicalReminderModal
        open={showEditForm}
        onOpenChange={setShowEditForm}
        onRefetch={handleEditComplete}
        defaultValues={editingItem}
      />
    );
  }

  if (deleteItem) {
    return (
      <ConfirmationDeleteMedicalReminderModal
        open={deleteItemId !== ""}
        onOpenChange={(state) => {
          if (!state) {
            setDeleteItemId("");
          }
        }}
        medicalName={deleteItem.medicalName}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        icon={Pill}
        iconShape="square"
        maskClosable={false}
        title="แก้ไขการแจ้งเตือนทานยา"
        description="จัดการการแจ้งเตือนทานยาของคุณ"
        className={clsx(
          "w-full md:w-full",
          medicalReminders.length <= 1 && " md:max-w-[min(450px,90vw)]",
          medicalReminders.length === 2 && " md:max-w-[min(700px,90vw)]",
          medicalReminders.length >= 3 && " md:max-w-[min(1000px,90vw)]",
        )}
        body={
          <div className="space-y-4 pb-1">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <AlertCircleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
                <p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
              </div>
            ) : medicalReminders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>ไม่มีรายการแจ้งเตือนทานยา</p>
              </div>
            ) : (
              <div
                className={clsx(
                  "grid gap-4",
                  medicalReminders.length === 1 && "grid-cols-1",
                  medicalReminders.length === 2 && "grid-cols-1 sm:grid-cols-2",
                  medicalReminders.length >= 3 &&
                    "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
                )}
              >
                {medicalReminders.map((item) => (
                  <div
                    key={item.id}
                    className="relative bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                  >
                    <div className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            {item.medicalName}
                          </h3>
                          <div className="flex items-center gap-2">
                            {MEAL_TIMING[item.mealTiming as MealTimingKey]}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-3">
                      <div className="space-y-3">
                        {/* Date Range */}
                        <div>
                          <div className="text-sm text-gray-600">
                            {item.startDate
                              ? dayjs(item.startDate)
                                  .locale("th-TH")
                                  .format("D MMM BB")
                              : "-"}
                            {item.endDate && " - "}
                            {item.endDate
                              ? dayjs(item.endDate)
                                  .locale("th-TH")
                                  .format("D MMM BB")
                              : ""}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t">
                      <div className="flex">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-none border-gray-200 border-r border-l-0 border-b-0 focus:ring-0"
                          onClick={() => handleEdit(item)}
                        >
                          <PenIcon className="h-4 w-4" />
                          แก้ไข
                        </Button>
                        <Button
                          variant="outline-destructive"
                          size="sm"
                          className="flex-1 rounded-none border-gray-200 border-x-0 border-b-0 focus:ring-0"
                          onClick={() => handleDeleteClick(item.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                          ลบ
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        }
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="secondary"
              className="grow basis-0"
              onClick={() => onOpenChange(false)}
            >
              ปิด
            </Button>
          </div>
        }
      />
    </>
  );
};

const ConfirmationDeleteMedicalReminderModal = ({
  open,
  onOpenChange,
  medicalName,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  medicalName?: string;
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
      description={`คุณต้องการลบการแจ้งเตือนการทานยา '${medicalName}' ใช่หรือไม่\nข้อมูลการแจ้งเตือนที่จะเกิดขึ้นในภายหน้าจะถูกลบ`}
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

export default EditMedicalReminderModal;
