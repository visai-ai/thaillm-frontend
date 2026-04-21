"use client";

import { useState, useEffect } from "react";

import { dayjs } from "@/utils/time";

import { GetMedicalRemindersSchedulesUpcomingResponse } from "@/@types/backend-api";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/common/CustomModal";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertTriangle, BellRingIcon, StopCircleIcon } from "lucide-react";
import api from "@/lib/api";
import { formatThaiDate } from "@/utils/time";

type MedicalRemindersUpcomingSchedules =
  GetMedicalRemindersSchedulesUpcomingResponse["list"];
type MedicalRemindersUpcomingSchedulesItem =
  MedicalRemindersUpcomingSchedules[number];

const UpcomingReminder = ({
  schedulesUpcomingList,
  onRefresh,
}: {
  schedulesUpcomingList: MedicalRemindersUpcomingSchedules;
  onRefresh?: () => void;
}) => {
  const NOTIFICATION_WIDTH = 275;
  const GAP_BETWEEN_CARD_WIDTH = 8;
  const GAP_BETWEEN_SECTION_WIDTH = 24;
  const PADDING = 16;

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  let alreadyResponseList: MedicalRemindersUpcomingSchedules = [];
  let upcomingList: MedicalRemindersUpcomingSchedules = [];
  schedulesUpcomingList.forEach((reminder) => {
    if (
      reminder.scheduleTimeStatus === "accepted" ||
      reminder.scheduleTimeStatus === "skipped"
    ) {
      alreadyResponseList.push(reminder);
    } else {
      upcomingList.push(reminder);
    }
  });

  upcomingList.sort((a, b) => {
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-gray-900 font-semibold px-4 md:px-6 xl:px-8">
        วันนี้
      </h3>
      <div className="relative flex items-stretch gap-2 overflow-auto snap-x px-4 md:px-6 xl:px-8 pb-8 scroll-px-8 shrink-0">
        {schedulesUpcomingList.length === 0 ? (
          <span className="text-gray-500">ไม่มีรายการแจ้งเตือน</span>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <h4 className="sticky left-0 top-0 text-gray-900 font-semibold whitespace-nowrap">
                รายการที่กำลังจะถึง
              </h4>

              <div className="flex items-stretch gap-2 snap-start">
                {upcomingList.map((reminder, index) => (
                  <MedicalReminderCard
                    key={index}
                    reminder={reminder}
                    onRefresh={onRefresh}
                  />
                ))}
              </div>
            </div>

            {alreadyResponseList.length > 0 && (
              <>
                <div className="shrink-0 h-full w-px mx-4 bg-gray-200"></div>
                <div className="flex flex-col gap-3">
                  <h4 className="sticky left-0 top-0 text-gray-900 font-semibold whitespace-nowrap">
                    รายการที่สำเร็จแล้ว
                  </h4>
                  <div className="flex items-stretch gap-2 snap-start">
                    {alreadyResponseList.map((reminder, index) => (
                      <MedicalReminderCard
                        key={index}
                        reminder={reminder}
                        onRefresh={onRefresh}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const MedicalReminderCard = ({
  reminder,
  onRefresh,
}: {
  reminder: MedicalRemindersUpcomingSchedulesItem;
  onRefresh?: () => void;
}) => {
  const SKIP_MINUTES_OPTIONS = [5, 10, 30];

  const [isPassedTime, setIsPassedTime] = useState<boolean>(false);
  const [showPostponeOptions, setShowPostponeOptions] =
    useState<boolean>(false);

  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!reminder.time) return;
    const [targetHour, targetMinute] = reminder.time.split(":").map(Number);

    const now = Date.now();
    const targetTimestamp = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
      targetHour ?? 0,
      targetMinute ?? 0,
    ).getTime();

    setIsPassedTime(now >= targetTimestamp);
  }, [reminder.time]);

  const detail = `${reminder.medicalName} ${reminder.time}`;
  const activeResponse =
    reminder.scheduleTimeStatus == "accepted" ||
    reminder.scheduleTimeStatus == "skipped";
  const isActiveActionState = !activeResponse && isPassedTime;

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleMakeResponseUpcomingReminder = async (
    responseType: "accepted" | "skipped" | "postponed",
    postponeUntil?: string,
  ) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.medicalReminder.makeResponseMedicalReminderResponse(
        {
          requestBody: {
            responseType: responseType,
            instanceId: reminder.instanceId,
            postponeUntil: postponeUntil,
          },
        },
      );
      if (!res.ok) {
        addNotification({
          state: "error",
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถยืนยันการทานยาได้",
        });
        return;
      }
      let title = "";
      let description = "";
      switch (responseType) {
        case "accepted":
          title = "ยืนยันการทานยาสําเร็จ";
          description = `ยืนยันการทานยา ‘${reminder.medicalName}’ สำเร็จ`;
          break;
        case "skipped":
          title = "ข้ามการแจ้งเตือนสำเร็จ";
          description = `ข้ามการแจ้งเตือนการทานยา ‘${reminder.medicalName}’ สำเร็จ`;
          break;
        case "postponed":
          title = "เลื่อนการแจ้งเตือนสำเร็จ";
          let postponeTime = "";
          if (postponeUntil) {
            const date = new Date(postponeUntil);
            const hh = date.getHours().toString().padStart(2, "0");
            const mm = date.getMinutes().toString().padStart(2, "0");
            postponeTime = `${hh}:${mm}`;
          }
          description = `การแจ้งเตือนทานยา ‘${reminder.medicalName}’ จะแจ้งเตือนอีกครั้งเมื่อ ${postponeTime}`;
          break;
      }

      addNotification({
        state: "success",
        title,
        description,
      });
      onRefresh?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostponeTakenMedicine = async (minute: number) => {
    try {
      if (!reminder.time) {
        return;
      }
      const [hourString = "0", minuteString = "0", secondString = "0"] =
        reminder.time.split(":");

      const reminderDateTime = dayjs()
        .tz("Asia/Bangkok")
        .set("hour", Number(hourString))
        .set("minute", Number(minuteString))
        .set("second", Number(secondString))
        .set("millisecond", 0);

      const postponeUntil = reminderDateTime
        .add(minute, "minute")
        .format("YYYY-MM-DDTHH:mm:ssZ");

      await handleMakeResponseUpcomingReminder("postponed", postponeUntil);
    } catch (error) {
      console.error(error);
    } finally {
      setShowPostponeOptions(false);
    }
  };

  return (
    <div
      className={cn(
        "snap-start relative overflow-hidden p-4 rounded-2xl shadow-xs flex flex-col gap-4 min-h-[170px] w-[275px] snap-x-",
        isActiveActionState
          ? "border-4 border-transparent text-primary-700 bg-custom-gradient-primary rounded-l-3xl rounded-tr-3xl"
          : activeResponse
            ? "border border-gray-200 bg-gray-50 opacity-70"
            : "border border-gray-200 bg-white",
      )}
    >
      {isActiveActionState ? (
        <div className="absolute z-0 top-[-10%] right-[-10%] rotate-[-15deg] text-white mix-blend-overlay opacity-40">
          <BellRingIcon className="w-[148px] h-[148px]" />
        </div>
      ) : null}
      {/* header */}
      <Badge>
        <BellRingIcon className="size-3 text-gray-600 stroke-[3px]" />
        {reminder.mealTiming === "before_meal" && <span>ก่อนอาหาร</span>}
        {reminder.mealTiming === "after_meal" && <span>หลังอาหาร</span>}
        {reminder.mealTiming === "with_meal" && <span>พร้อมมื้ออาหาร</span>}
      </Badge>
      {/* body */}
      <div className="flex flex-col gap-1 relative">
        {/* time notification */}
        <span className="text-sm text-gray-700 font-medium">
          {reminder.time}
        </span>
        <div className="text-gray-900 font-semibold">
          {reminder.medicalName}
        </div>
      </div>
      {!activeResponse ? (
        <div className="grid grid-cols-3 gap-2 relative">
          <Popover
            open={showPostponeOptions}
            onOpenChange={setShowPostponeOptions}
          >
            <PopoverTrigger asChild>
              <Button variant={"secondary"} size={"sm"} disabled={isSubmitting}>
                เลื่อน
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              className="flex flex-col sm:w-62 w-50"
            >
              <ul className="w-full p-1.5 text-sm">
                {SKIP_MINUTES_OPTIONS.map((minute, index) => {
                  return (
                    <li key={index}>
                      <Button
                        variant={`ghost-secondary`}
                        className="w-full text-left justify-start"
                        onClick={() => handlePostponeTakenMedicine(minute)}
                      >
                        เลื่อน {minute} นาที
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
          <SkipConsumeMedicineModal
            detail={detail}
            onSkip={() => handleMakeResponseUpcomingReminder("skipped")}
          />
          <ConfirmationConsumeMedicineModal
            detail={detail}
            onConfirm={() => handleMakeResponseUpcomingReminder("accepted")}
          />
        </div>
      ) : (
        <>
          {reminder.scheduleTimeStatus === "accepted" && (
            <span className="text-gray-700 text-xs font-medium">ทานแล้ว</span>
          )}
          {reminder.scheduleTimeStatus === "skipped" && (
            <span className="text-gray-700 text-xs font-medium">
              ข้ามการทานยา
            </span>
          )}
        </>
      )}
    </div>
  );
};

const ConfirmationConsumeMedicineModal = ({
  detail,
  onConfirm,
}: {
  detail: string;
  onConfirm?: () => void;
}) => {
  const [showConfirmationModal, setShowConfirmationModal] =
    useState<boolean>(false);

  const handleCloseModal = () => {
    setShowConfirmationModal(false);
  };

  const handleConfirmation = () => {
    onConfirm?.();
    handleCloseModal();
  };

  return (
    <>
      {showConfirmationModal && (
        <Modal
          className="w-100"
          open={showConfirmationModal}
          onOpenChange={setShowConfirmationModal}
          icon={AlertTriangle}
          variant={"warning"}
          title="ยืนยันการทานยาครั้งนี้"
          description={`คุณต้องการยืนยันการทานยา ‘${detail}’ ใช่หรือไม่`}
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
                autoFocus
                className="grow basis-0"
                onClick={handleConfirmation}
              >
                ยืนยัน
              </Button>
            </>
          }
        />
      )}
      <Button
        variant={"default"}
        size={"sm"}
        onClick={() => setShowConfirmationModal(true)}
      >
        ทานแล้ว
      </Button>
    </>
  );
};

const SkipConsumeMedicineModal = ({
  detail,
  onSkip,
}: {
  detail: string;
  onSkip?: () => void;
}) => {
  const [showSkipModal, setShowSkipModal] = useState<boolean>(false);

  const handleCloseModal = () => {
    setShowSkipModal(false);
  };

  const handleSkipConfirmation = () => {
    onSkip?.();
    handleCloseModal();
  };

  return (
    <>
      {showSkipModal && (
        <Modal
          className="w-100"
          open={showSkipModal}
          onOpenChange={setShowSkipModal}
          icon={AlertTriangle}
          variant={"warning"}
          title="ยืนยันการข้ามการทานยาครั้งนี้"
          description={`คุณต้องการข้ามการทานยา ‘${detail}’ ใช่หรือไม่`}
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
                autoFocus
                className="grow basis-0"
                onClick={handleSkipConfirmation}
              >
                ยืนยัน
              </Button>
            </>
          }
        />
      )}
      <Button
        variant={"secondary"}
        size={"sm"}
        onClick={() => setShowSkipModal(true)}
      >
        ข้าม
      </Button>
    </>
  );
};

export default UpcomingReminder;
