"use client";

import { GetAppointmentsResponse } from "@/@types/backend-api";
import { Modal } from "@/components/common/CustomModal";
import { Button } from "@/components/ui/button";
import { useQueryGetFutureAppointments } from "@/hooks/useQueryGetAppointments";
import api from "@/lib/api";
import { useNotificationStore } from "@/stores/useNotificationStore";
import clsx from "clsx";
import dayjs from "dayjs";
import "dayjs/locale/th";
import buddhistEra from "dayjs/plugin/buddhistEra";
import {
  AlertCircleIcon,
  AlertTriangle,
  Calendar,
  PenIcon,
  TrashIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import AddAppointmentModal from "./AddAppointmentModal";

dayjs.extend(buddhistEra);

export type AppointmentSchedule = GetAppointmentsResponse["data"];
export type AppointmentScheduleItem = AppointmentSchedule[number];

const EditAppointmentModal = ({
  open,
  onOpenChange,
  onRefetch,
}: {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  onRefetch?: () => void;
}) => {
  const { data, refetch, error, isLoading } = useQueryGetFutureAppointments();
  const [editingItem, setEditingItem] =
    useState<AppointmentScheduleItem | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string>("");
  const { addNotification } = useNotificationStore();

  const appointments = data?.data || [];

  // Refetch data when modal opens
  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const handleEdit = (item: AppointmentScheduleItem) => {
    setEditingItem(item);
    setShowEditForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteItemId(id);
  };

  const handleDelete = async () => {
    try {
      const response =
        await api.appointments.deleteAppointmentsById(deleteItemId);
      if (response.ok) {
        addNotification({
          state: "success",
          title: "ลบการนัดหมายสำเร็จ",
          description: "การนัดหมายแพทย์ถูกลบออกจากระบบแล้ว",
        });
        refetch();
        onRefetch?.();
      } else {
        const details = response.data?.details;
        let description = `ลบข้อมูลการนัดหมายแพทย์ ไม่สำเร็จ`;

        if (details && Array.isArray(details)) {
          const timeRestrictionMessage = details.find(
            (detail: any) =>
              detail.message &&
              detail.message.includes(
                "Cannot cancel appointment within 24 hours",
              ),
          );

          const afterScheduledMessage = details.find(
            (detail: any) =>
              detail.message &&
              detail.message.includes(
                "Cannot cancel appointment after the scheduled time",
              ),
          );

          if (timeRestrictionMessage) {
            description =
              "ไม่สามารถยกเลิกการนัดหมายได้ภายใน 24 ชั่วโมงก่อนเวลานัดหมาย";
          } else if (afterScheduledMessage) {
            description = "ไม่สามารถยกเลิกการนัดหมายที่ผ่านมาแล้วได้";
          } else if (details[0]?.message) {
            description = details[0].message;
          }
        }

        addNotification({
          state: "error",
          title: "ลบการนัดหมายแพทย์ไม่สำเร็จ",
          description: description,
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

  const deleteItem = appointments.find((item) => item.id === deleteItemId);

  if (showEditForm && editingItem) {
    return (
      <AddAppointmentModal
        open={showEditForm}
        onOpenChange={setShowEditForm}
        onRefetch={handleEditComplete}
        defaultValues={editingItem}
      />
    );
  }

  if (deleteItem) {
    return (
      <ConfirmationDeleteAppointmentModal
        open={deleteItemId !== ""}
        onOpenChange={(state) => {
          if (!state) {
            setDeleteItemId("");
          }
        }}
        hospitalName={deleteItem.hospitalName}
        departmentName={deleteItem.departmentName}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        icon={Calendar}
        iconShape="square"
        maskClosable={false}
        title="แก้ไขการนัดหมายแพทย์"
        description="จัดการการนัดหมายแพทย์ของคุณ"
        className={clsx(
          "w-full md:w-full",
          appointments.length <= 1 && " md:max-w-[min(450px,90vw)]",
          appointments.length === 2 && " md:max-w-[min(700px,90vw)]",
          appointments.length >= 3 && " md:max-w-[min(1000px,90vw)]",
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
            ) : appointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>ไม่มีรายการนัดหมายแพทย์</p>
              </div>
            ) : (
              <div
                className={clsx(
                  "grid gap-4",
                  appointments.length === 1 && "grid-cols-1",
                  appointments.length === 2 && "grid-cols-1 sm:grid-cols-2",
                  appointments.length >= 3 &&
                    "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
                )}
              >
                {appointments.map((item) => (
                  <div
                    key={item.id}
                    className="relative bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col gap-3"
                  >
                    <div className="p-4 pb-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            {item.hospitalName}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            แผนก{item.departmentName}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grow">
                      <div className="space-y-2 max-h-48 overflow-y-auto px-4">
                        {/* Date and Time */}
                        <div className="flex flex-row gap-2">
                          <div className="text-sm text-gray-600">
                            {item.date
                              ? dayjs(item.date)
                                  .locale("th-TH")
                                  .format("D MMM BB")
                              : "-"}
                          </div>
                          <div className="text-sm text-gray-600">
                            เวลา: {item.expectedTimeSlot?.slice(0, 5) || "-"}
                          </div>
                        </div>
                        {/* Reason + optional detail */}
                        <div>
                          <div className="text-sm text-gray-600 whitespace-pre-line">
                            อาการ: {item.reason || "-"}
                            {item.reasonDetail
                              ? `\n\n${item.reasonDetail}`
                              : ""}
                          </div>
                        </div>
                        {/* Note */}
                        {item.note && (
                          <div>
                            <div className="text-xs text-gray-600">
                              หมายเหตุ: {item.note}
                            </div>
                          </div>
                        )}
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

const ConfirmationDeleteAppointmentModal = ({
  open,
  onOpenChange,
  hospitalName,
  departmentName,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  hospitalName?: string;
  departmentName?: string;
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
      title="ยืนยันการลบการนัดหมายแพทย์"
      description={`คุณต้องการลบการนัดหมายแพทย์ที่ ${hospitalName} แผนก${departmentName} ใช่หรือไม่\nข้อมูลการนัดหมายจะถูกลบออกจากระบบ`}
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

export default EditAppointmentModal;
