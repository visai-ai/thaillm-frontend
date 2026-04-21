"use client";

import dynamic from "next/dynamic";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useMemo,
} from "react";
import { GetAppointmentsResponse } from "@/@types/backend-api";
import { cn } from "@/lib/utils";
import { dayjs, isSameDay, formatThaiDate, formatTime } from "@/utils/time";
import { PADDING_X_LAYOUT } from "@/constant/common";
import { useNotificationStore } from "@/stores/useNotificationStore";

import AddAppointmentModal, {
  NewAppointmentMethod,
} from "./AddAppointmentModal";

import EmptyState from "@/components/common/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/common/CustomModal";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((cal) => cal.Calendar),
  {
    loading: () => (
      <div className="w-82 h-90 animate-pulse bg-gray-50 rounded-lg"></div>
    ),
    ssr: false,
  },
);

const CalendarDayButton = dynamic(
  () => import("@/components/ui/calendar").then((cal) => cal.CalendarDayButton),
  {
    loading: () => <></>,
    ssr: false,
  },
);

import {
  MoreVerticalIcon,
  BellRingIcon,
  PenIcon,
  TrashIcon,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import api from "@/lib/api";

type AppointmentListProps = {
  appointments: GetAppointmentsResponse;
  onRefetch?: () => void;
};

const SelectedDateContext = createContext<{
  selected?: Date;
  setSelected?: Dispatch<SetStateAction<Date | undefined>>;
  openModal?: boolean;
  setOpenModal?: Dispatch<SetStateAction<boolean>>;
  newAppointmentMethod?: NewAppointmentMethod;
  setNewAppointmentMethod?: Dispatch<SetStateAction<NewAppointmentMethod>>;
  setOpenInfoModal?: Dispatch<SetStateAction<boolean>>;
}>({});

function DayButton(props: any) {
  const { day, highlightedDate } = props;
  const {
    setSelected,
    selected,
    setOpenModal,
    setNewAppointmentMethod,
    setOpenInfoModal,
  } = useContext(SelectedDateContext);

  const isSelected = selected ? isSameDay(selected, day.date) : false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isMoreThanToday = day.date > today.getTime();
  const isHighlighted = highlightedDate?.some((date: Date) =>
    isSameDay(date, day.date),
  );

  return (
    <>
      {isMoreThanToday ? (
        <>
          <DropdownMenu
            open={isSelected}
            onOpenChange={(state) => {
              if (!state) {
                setSelected?.(undefined);
              }
            }}
          >
            <DropdownMenuTrigger asChild className="outline-none focus:ring-0">
              <CalendarDayButton
                {...props}
                className={cn("font-medium", isSelected && "!bg-gray-50")}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="sm:min-w-[240px]">
              <DropdownMenuItem
                onClick={() => {
                  setNewAppointmentMethod?.("default");
                  setOpenModal?.(true);
                }}
              >
                เพิ่มนัดหมายแพทย์ใหม่
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setNewAppointmentMethod?.("from-chat-history");
                  setOpenModal?.(true);
                }}
              >
                เพิ่มนัดหมายแพทย์จากประวัติการสนทนา
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <>
          <CalendarDayButton
            {...props}
            onClick={(event: React.MouseEvent) => {
              if (!isHighlighted) {
                event.preventDefault();
              }
              setOpenInfoModal?.(true);
              setSelected?.(day.date);
            }}
            disabled={!isHighlighted}
            className={cn("!text-gray-400", isSelected && "!bg-gray-50")}
          />
        </>
      )}
    </>
  );
}

type AppointmentItem = GetAppointmentsResponse["data"][number];

const AppointmentList = ({ appointments, onRefetch }: AppointmentListProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const [openModal, setOpenModal] = useState<boolean>(false);
  const [openInfoModal, setOpenInfoModal] = useState<boolean>(false);

  const [editAppointmentData, setEditAppointmentData] =
    useState<AppointmentItem | null>(null);
  const [newAppointmentMethod, setNewAppointmentMethod] =
    useState<NewAppointmentMethod>("default");

  const { addNotification } = useNotificationStore();

  const appointmentDate = useMemo(() => {
    return appointments.data.map((appointment) => {
      return new Date(appointment.date);
    });
  }, [appointments.data]);

  const appointmentDataBySameDate = useMemo(() => {
    const sortedAppointmentsData = appointments.data.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    const groupedAppointments = sortedAppointmentsData.reduce<
      Record<string, AppointmentItem[]>
    >((acc, appointment) => {
      const date = dayjs(appointment.date)
        .tz("Asia/Bangkok")
        .format("YYYY-MM-DD");
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(appointment);
      return acc;
    }, {});

    return groupedAppointments;
  }, [appointments.data]);

  const openAppointmentModal = openModal || editAppointmentData !== null;

  const selectedAppointmentsInfo = useMemo(() => {
    if (!selectedDate || !openInfoModal) return [];
    return appointments.data.filter((appointment) => {
      return isSameDay(selectedDate, new Date(appointment.date));
    });
  }, [openInfoModal, selectedDate, appointments.data]);

  const handleDeleteAppointment = async (appointment: AppointmentItem) => {
    const detail =
      appointment?.hospitalName && appointment?.departmentName
        ? `${appointment?.hospitalName}, แผนก${appointment?.departmentName}`
        : "-";

    if (!appointment?.id) return;
    const res = await api.appointments.deleteAppointmentsById(appointment.id);
    if (!res.ok) {
      // Check if the error is about cancellation within 24 hours
      const errorData = res.data as any;
      const details = errorData?.details;
      let description = `ลบข้อมูลการนัดหมายแพทย์ ณ ${detail} ไม่สำเร็จ`;

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
      return;
    }
    onRefetch?.();
    addNotification({
      state: "success",
      title: "ลบการนัดหมายแพทย์สำเร็จ",
      description: `ลบข้อมูลการนัดหมายแพทย์ ณ ${detail} สำเร็จ`,
    });
  };

  return (
    <>
      {openAppointmentModal && (
        <AddAppointmentModal
          selectedAppointmentDate={selectedDate}
          open={openAppointmentModal}
          onOpenChange={(state) => {
            if (!state) {
              setEditAppointmentData(null);
              setNewAppointmentMethod("default");
            }
            setOpenModal(state);
          }}
          method={newAppointmentMethod}
          onRefetch={onRefetch}
          defaultValues={editAppointmentData}
        />
      )}
      {openInfoModal && selectedDate && (
        <AppointmentInfoModal
          open={openInfoModal}
          onOpenChange={(state) => {
            if (!state) setSelectedDate(undefined);
            setOpenInfoModal(state);
          }}
          date={selectedDate}
          appointments={selectedAppointmentsInfo}
        />
      )}
      <div
        className={cn(
          "relative flex lg:flex-row flex-col-reverse w-full xl:gap-8 md:gap-6 gap-4 sm:overflow-auto -mb-8 pb-8",
          PADDING_X_LAYOUT,
        )}
      >
        <section className="flex flex-col grow">
          {appointments.data.length === 0 ? (
            <EmptyState
              title={"ยังไม่มีรายการนัดหมายในระบบ"}
              description={`ทำนัดหมายแพทย์และจัดการรายการนัดหมายแพทย์ได้ที่นี่`}
              className="grow"
              state="search"
            />
          ) : (
            <div className="w-full flex flex-col gap-4">
              {Object.entries(appointmentDataBySameDate).map(
                ([key, value], index) => {
                  const isToday = isSameDay(new Date(key), new Date());
                  return (
                    <article
                      key={`${key}-${index}`}
                      className="relative space-y-4"
                    >
                      <h3 className="text-gray-900 font-semibold">
                        {isToday ? "วันนี้" : formatThaiDate(new Date(key))}
                      </h3>
                      {value.map((appointment, index) => {
                        return (
                          <AppointmentSection
                            key={index}
                            appointment={appointment}
                            onEdit={setEditAppointmentData}
                            onDelete={handleDeleteAppointment}
                          />
                        );
                      })}

                      <hr className="border-gray-200" />
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
        {/* calendar overview */}
        <section className="shrink-0 lg:mx-0 mx-auto">
          <SelectedDateContext.Provider
            value={{
              selected: selectedDate,
              setSelected: setSelectedDate,
              openModal: openModal,
              setOpenModal: setOpenModal,
              newAppointmentMethod: newAppointmentMethod,
              setNewAppointmentMethod: setNewAppointmentMethod,
              setOpenInfoModal: setOpenInfoModal,
            }}
          >
            <Calendar
              mode="single"
              className="rounded-xl border shadow-xl"
              highlightedDate={appointmentDate}
              onSelect={setSelectedDate}
              components={{
                DayButton: (dayButtonProps) => (
                  <DayButton
                    {...dayButtonProps}
                    highlightedDate={appointmentDate}
                  />
                ),
              }}
            />
          </SelectedDateContext.Provider>
        </section>
      </div>
    </>
  );
};

const AppointmentInfoModal = ({
  open,
  onOpenChange,
  date,
  appointments,
}: {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  date: Date;
  appointments: AppointmentItem[];
}) => {
  const sortedAppointments = appointments.sort((a, b) => {
    const timeA = a?.expectedTimeSlot?.split(":").map(Number);
    const timeB = b?.expectedTimeSlot?.split(":").map(Number);

    if (!timeA || !timeB) return 0;

    if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
    if (timeA[1] !== timeB[1]) return timeA[1] - timeB[1];
    return timeA[2] - timeB[2];
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`นัดหมายวันที่ ${formatThaiDate(date)}`}
      description={``}
      body={
        <>
          {appointments.length === 0 ? (
            <div>ไม่มีรายการนัดหมายแพทย์ในวันนี้</div>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedAppointments.map((appointment, index) => {
                return (
                  <article
                    key={index}
                    className="pb-3 border-b border-gray-200 last:border-transparent flex flex-col gap-2"
                  >
                    <div className="font-semibold text-gray-900">
                      นัดหมายที่ {index + 1}
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-sm">
                      {/* Hospital name */}
                      <span className="font-semibold col-span-2">
                        โรงพยาบาล:{" "}
                      </span>
                      <span className="col-span-3">
                        {appointment.hospitalName}
                      </span>
                      {/* Department name */}
                      <span className="font-semibold col-span-2">แผนก: </span>
                      <span className="col-span-3">
                        {appointment.departmentName}
                      </span>
                      {/* Time */}
                      <span className="font-semibold col-span-2">เวลา: </span>
                      <span className="col-span-3">
                        {appointment.expectedTimeSlot?.slice(0, 5)}
                      </span>
                      {/* Reason + optional detail */}
                      <span className="font-semibold col-span-2">อาการ: </span>
                      <span className="col-span-3 whitespace-pre-line">
                        {appointment?.reason || "-"}
                        {appointment?.reasonDetail
                          ? `\n\n${appointment.reasonDetail}`
                          : ""}
                      </span>
                      {/* Note */}
                      <span className="font-semibold col-span-2">
                        หมายเหตุ:{" "}
                      </span>
                      <span className="col-span-3">
                        {appointment?.note || "-"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      }
      footer={
        <Button
          variant={`secondary`}
          className="grow basis-0"
          onClick={() => onOpenChange(false)}
        >
          ปิด
        </Button>
      }
    />
  );
};

type AppointmentSectionProps = {
  appointment: AppointmentItem;
  onEdit?: (appointment: AppointmentItem) => void;
  onDelete?: (appointment: AppointmentItem) => void;
};

const COLLAPSED_MAX_HEIGHT = 120; // px – roughly 5-6 lines of text

const AppointmentSection = ({
  appointment,
  onEdit,
  onDelete,
}: AppointmentSectionProps) => {
  const [showConfirmationModal, setShowConfirmationModal] =
    useState<boolean>(false);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const checkOverflow = useCallback(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > COLLAPSED_MAX_HEIGHT);
    }
  }, []);

  useEffect(() => {
    checkOverflow();
  }, [
    appointment.reason,
    appointment.reasonDetail,
    appointment.note,
    checkOverflow,
  ]);

  const appointmentDate = new Date(appointment.date);
  const detail =
    appointment?.hospitalName && appointment?.departmentName
      ? `${appointment?.hospitalName}, แผนก${appointment?.departmentName}`
      : "-";
  const isToday = isSameDay(appointmentDate, new Date());

  return (
    <>
      {showConfirmationModal && (
        <ConfirmationDeleteAppointmentModal
          open={showConfirmationModal}
          onOpenChange={setShowConfirmationModal}
          onDelete={() => onDelete?.(appointment)}
          hospitalName={appointment.hospitalName}
          expectedTimeSlot={appointment.expectedTimeSlot}
        />
      )}

      <section className="flex items-start gap-4">
        <div className="text-gray-700 text-sm font-semibold">
          {appointment.expectedTimeSlot?.slice(0, 5)}
        </div>

        <div
          className={cn(
            "relative rounded-xl p-4 grow text-sm overflow-hidden",
            isToday
              ? "border-4 border-transparent text-primary-700 bg-custom-gradient-primary"
              : "border border-gray-300 bg-white",
          )}
        >
          {isToday && (
            <div className="absolute z-0 top-1/2 -translate-y-1/2 rotate-[-15deg] right-[-8%] text-white mix-blend-overlay opacity-40">
              <BellRingIcon className="w-[130px] h-[130px]" />
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="icon"
                className="absolute p-2 right-2 h-5 w-5 z-1"
              >
                <span className="sr-only">Open menu</span>
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="sm:min-w-[240px]">
              <DropdownMenuItem onClick={() => onEdit?.(appointment)}>
                <PenIcon className="text-gray-500 group-hover:text-gray-600" />
                แก้ไข
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setShowConfirmationModal(true)}
              >
                <TrashIcon className="text-error-500 group-hover:text-error-600" />
                ลบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative pr-4 word-break flex flex-col gap-1.5">
            <span className="text-gray-900 font-semibold">{detail}</span>
            <div
              ref={contentRef}
              className={cn(
                "relative overflow-hidden transition-[max-height] duration-300 ease-in-out",
                !expanded && isOverflowing && "max-h-[120px]",
              )}
              style={
                expanded && contentRef.current
                  ? { maxHeight: contentRef.current.scrollHeight }
                  : undefined
              }
            >
              <div className="text-sm text-gray-700 whitespace-pre-line">
                {appointment.reason}
                {appointment?.reasonDetail
                  ? `\n\n${appointment.reasonDetail}`
                  : ""}
              </div>
              {appointment?.note && (
                <div className="text-xs text-gray-600 mt-1.5">
                  หมายเหตุ: {appointment.note}
                </div>
              )}
              {!expanded && isOverflowing && !isToday && (
                <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none bg-gradient-to-t from-white to-transparent" />
              )}
            </div>
            {isOverflowing && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className={cn(
                  "flex items-center justify-center w-full mt-1 cursor-pointer transition-colors",
                  isToday
                    ? "text-primary-600 hover:text-primary-800"
                    : "text-gray-400 hover:text-gray-600",
                )}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    expanded && "rotate-180",
                  )}
                />
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

const ConfirmationDeleteAppointmentModal = ({
  open,
  onOpenChange,
  onDelete,
  hospitalName,
  expectedTimeSlot,
}: {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  onDelete?: () => Promise<void> | void;
  hospitalName?: string;
  expectedTimeSlot?: string;
}) => {
  const handleCloseModal = () => {
    onOpenChange(false);
  };

  const handleConfirmation = async () => {
    await onDelete?.();
    handleCloseModal();
  };

  const displayTime = expectedTimeSlot?.slice(0, 5) || "-";
  const displayHospital = hospitalName || "-";

  return (
    <Modal
      className="w-100"
      open={open}
      onOpenChange={onOpenChange}
      icon={AlertTriangle}
      variant={"warning"}
      title="ยืนยันการลบการแจ้งนัดหมาย"
      description={`คุณต้องการลบการนัดหมายแพทย์ ณ ‘${displayHospital} เวลา ${displayTime}’  ใช่หรือไม่`}
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
            onClick={handleConfirmation}
          >
            ลบ
          </Button>
        </>
      }
    />
  );
};

export default AppointmentList;
