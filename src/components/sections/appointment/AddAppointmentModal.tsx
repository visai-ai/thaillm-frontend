import { DEPARTMENTS, PRESCREEN_DEPT_MAP } from "@/constant/hospitalInfo";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatThaiDate } from "@/utils/time";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  type Resolver,
} from "react-hook-form";

import {
  useQueryGetAppointmentsHospital,
  useQueryGetPrescreenResults,
} from "@/hooks/useQueryGetAppointments";
import type { PrescreenResultItem } from "@/lib/api/appointments";
import {
  AppointmentDetailSchemaValues,
  appointmentConfirmSchema,
  appointmentDetailsOnlySchema,
  appointmentSymptomsSchema,
} from "@/lib/schema/appointmentSchema";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";

import { Input } from "@/components/common/CustomInput";
import { Modal } from "@/components/common/CustomModal";
import DatePicker from "@/components/common/DatePicker";
import TextDropdown from "@/components/common/TextDropdown";
import TimePicker from "@/components/common/TimePicker";
import Turn from "@/components/common/Turn";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import {
  GetAppointmentsResponse,
  PostAppointmentsData,
} from "@/@types/backend-api";
import {
  CalendarHeart,
  CalendarPlus2Icon,
  CheckCircleIcon,
  Clock2Icon,
  PlusIcon,
  XIcon,
} from "lucide-react";

export type NewAppointmentMethod = "default" | "from-chat-history";
export type AppointmentFormStep = "details" | "symptoms" | "confirm";

const STEP_DESCRIPTIONS: Record<
  AppointmentFormStep,
  { title: string; description: string }
> = {
  details: {
    title: "",
    description: "ระบุรายละเอียดการนัดหมายแพทย์",
  },
  symptoms: {
    title: "ข้อมูลอาการสำหรับอีเมลถึงโรงพยาบาล",
    description: "ระบุอาการและรายละเอียดเพิ่มเติมที่จะส่งในอีเมลถึงโรงพยาบาล",
  },
  confirm: {
    title: "ข้อมูลติดต่อสำหรับอีเมลถึงโรงพยาบาล",
    description:
      "ตรวจสอบและแก้ไขข้อมูลด้านล่างได้ตามต้องการ อีเมลที่จะส่งถึงโรงพยาบาลจะใช้ข้อมูลนี้",
  },
};

const STEP_RESOLVERS: Record<
  AppointmentFormStep,
  Resolver<AppointmentDetailSchemaValues>
> = {
  details: zodResolver(
    appointmentDetailsOnlySchema,
  ) as Resolver<AppointmentDetailSchemaValues>,
  symptoms: zodResolver(
    appointmentSymptomsSchema,
  ) as Resolver<AppointmentDetailSchemaValues>,
  confirm: zodResolver(
    appointmentConfirmSchema,
  ) as Resolver<AppointmentDetailSchemaValues>,
};
type NewAppointmentFormProps = {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  method?: NewAppointmentMethod;
  selectedAppointmentDate?: Date;
  onRefetch?: () => void;
  defaultValues?: GetAppointmentsResponse["data"][number] | null;
  pendingId?: string | null;
  onPendingIdCleared?: () => void;
  sendToolResponse?: (data: {
    id: string;
    cancelled?: boolean;
    data?: { appointmentId?: string; error?: string };
  }) => Promise<void>;
};

const AddAppointmentModal = ({
  open,
  onOpenChange,
  method: inputMethod = "default",
  selectedAppointmentDate,
  onRefetch,
  defaultValues,
  pendingId,
  onPendingIdCleared,
  sendToolResponse,
}: NewAppointmentFormProps) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  let defaultAppointmentTime = { hour: "08", minute: "00" };
  if (defaultValues?.expectedTimeSlot) {
    const splitTimeSlot = defaultValues.expectedTimeSlot?.split(":");
    defaultAppointmentTime.hour = splitTimeSlot?.[0] || "08";
    defaultAppointmentTime.minute = splitTimeSlot?.[1] || "00";
  }

  const [method, setMethod] = useState<NewAppointmentMethod>(
    inputMethod || "default",
  );
  const [step, setStep] = useState<AppointmentFormStep>("details");

  const appointmentForm = useForm<AppointmentDetailSchemaValues>({
    resolver: STEP_RESOLVERS[step],
    mode: "onChange",
    defaultValues: {
      appointmentDate: defaultValues?.date
        ? new Date(defaultValues.date)
        : selectedAppointmentDate || tomorrow,
      appointmentTime: defaultAppointmentTime,
      department: defaultValues?.departmentName || "",
      hospitalName: defaultValues?.hospitalName || "",
      hospitalEmail: defaultValues?.hospitalEmail || "",
      reason: defaultValues?.reason || "",
      reasonDetail: defaultValues?.reasonDetail || "",
      note: defaultValues?.note || "",
      alternativeDates: defaultValues?.alternativeDates?.map((alt) => {
        const [h, m] = (alt.time || "08:00:00").split(":");
        return {
          date: new Date(alt.date),
          time: { hour: h || "08", minute: m || "00" },
        };
      }),
    },
  });
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [submittedValues, setSubmittedValues] =
    useState<AppointmentDetailSchemaValues | null>(null);

  const selectedChatId = appointmentForm.watch("selectedChatId");
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { addNotification } = useNotificationStore();

  const isEditMode = useMemo(
    () => defaultValues !== null && !!defaultValues?.id,
    [defaultValues],
  );
  const mode = isEditMode ? "แก้ไข" : "ทำ";

  useEffect(() => {
    if (inputMethod) {
      setMethod(inputMethod);
    }
  }, [inputMethod]);

  useEffect(() => {
    if (!open) {
      setStep("details");
      setIsSuccess(false);
      setSubmittedValues(null);
      setMethod(inputMethod || "default");
    }
  }, [open, inputMethod]);

  const onClose = () => {
    onOpenChange(false);
  };

  const goToNextStep = async () => {
    const valid = await appointmentForm.trigger(undefined, {
      shouldFocus: true,
    });
    if (!valid) {
      console.debug(
        "[AddAppointmentModal] Form invalid on ต่อไป:",
        appointmentForm.formState.errors,
      );
      return;
    }
    if (step === "details") {
      setStep("symptoms");
    } else if (step === "symptoms") {
      // Prefill contact info before going to confirm
      if (user) {
        const v = appointmentForm.getValues();
        if (!v.contactFirstName)
          appointmentForm.setValue("contactFirstName", user.firstName ?? "");
        if (!v.contactLastName)
          appointmentForm.setValue("contactLastName", user.lastName ?? "");
        if (!v.contactEmail)
          appointmentForm.setValue("contactEmail", user.email ?? "");
        if (!v.contactAge && user.personalInfo?.age)
          appointmentForm.setValue("contactAge", String(user.personalInfo.age));
        if (!v.contactPhone) {
          const phone = user.personalInfo?.phone || "";
          if (phone) appointmentForm.setValue("contactPhone", phone);
        }
      }
      setStep("confirm");
    }
  };

  const goToPrevStep = () => {
    if (step === "confirm") setStep("symptoms");
    else if (step === "symptoms") setStep("details");
    else onClose();
  };

  const onSubmit = async () => {
    const schema = appointmentConfirmSchema;
    const result = schema.safeParse(appointmentForm.getValues());
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.join(
          ".",
        ) as keyof AppointmentDetailSchemaValues;
        appointmentForm.setError(path, { message: issue.message });
      }
      return;
    }
    startTransition(async () => {
      const values = appointmentForm.getValues();
      const appointmentDateTime = new Date(values.appointmentDate);
      appointmentDateTime.setHours(
        Number(values.appointmentTime.hour),
        Number(values.appointmentTime.minute),
        0,
        0,
      );

      const contactFullName =
        [values.contactFirstName, values.contactLastName]
          .filter(Boolean)
          .join(" ")
          .trim() || undefined;
      const alternativeDates =
        values.alternativeDates?.map((alt) => {
          const altDate = new Date(alt.date);
          altDate.setHours(
            Number(alt.time.hour),
            Number(alt.time.minute),
            0,
            0,
          );
          return {
            date: altDate.toISOString(),
            time: `${alt.time.hour}:${alt.time.minute}:00`,
          };
        }) || null;

      const requestBody = {
        status: "active",
        expectedTimeSlot: `${values.appointmentTime.hour}:${values.appointmentTime.minute}:00`,
        reason: values.reason,
        reasonDetail: values.reasonDetail || "",
        note: values?.note || "",
        departmentName: values.department,
        hospitalName: values.hospitalName,
        date: appointmentDateTime.toISOString(),
        hospitalEmail: values.hospitalEmail,
        alternativeDates,
        contactFullName,
        contactAge: values.contactAge || undefined,
        contactEmail: values.contactEmail || undefined,
        contactPhone: values.contactPhone || undefined,
      } as PostAppointmentsData["requestBody"];

      if (isEditMode) {
        const res = await api.appointments.putAppointmentsById({
          id: defaultValues?.id || "",
          requestBody,
        });
        if (!res.ok) {
          addNotification({
            state: "error",
            title: `แก้ไขนัดหมายแพทย์ไม่สำเร็จ`,
            description: `${res.data.error}: แก้ไขนัดหมายแพทย์ไม่สำเร็จ`,
          });
          return;
        }
      } else {
        const res = await api.appointments.postAppointments({ requestBody });
        if (!res.ok) {
          addNotification({
            state: "error",
            title: `เพิ่มนัดหมายแพทย์ไม่สำเร็จ`,
            description: `${res.data.error}: เพิ่มนัดหมายแพทย์ไม่สำเร็จ`,
          });
          if (pendingId && sendToolResponse) {
            await sendToolResponse({
              id: pendingId,
              cancelled: false,
              data: {
                error:
                  (res.data as { error?: string })?.error ||
                  "Failed to add appointment",
              },
            });
            onPendingIdCleared?.();
          }
          return;
        }
        if (pendingId && sendToolResponse) {
          await sendToolResponse({
            id: pendingId,
            cancelled: false,
            data: { appointmentId: res.data?.id },
          });
          onPendingIdCleared?.();
        }
      }

      onRefetch?.();
      // Refresh user data so updated age/phone are available next time
      api.auth.getMe().then((res) => {
        if (res.ok) setUser(res.data);
      });
      setSubmittedValues(appointmentForm.getValues());
      setIsSuccess(true);
    });
  };

  const successValues = submittedValues ?? appointmentForm.getValues();
  if (isSuccess) {
    return (
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        icon={CheckCircleIcon}
        variant={"success"}
        className={cn(`w-full md:max-w-[640px]`)}
        title={`${mode}รายการนัดหมายแพทย์สำเร็จ`}
        description={`การนัดหมายแพทย์ ณ ${
          successValues.hospitalName
        }\nวันที่นัดหมาย ${formatThaiDate(successValues.appointmentDate)} ${
          successValues.appointmentTime.hour
        }:${successValues.appointmentTime.minute} ${isEditMode ? "ได้ถูกแก้ไขเรียบร้อย" : "ได้ถูกเพิ่มในระบบ"}
        `}
        footer={
          <Button className="grow basis-0" type="button" onClick={onClose}>
            ยืนยัน
          </Button>
        }
      />
    );
  }

  const stepTitle =
    step === "details"
      ? `${mode}รายการนัดหมายแพทย์`
      : STEP_DESCRIPTIONS[step].title;

  const renderBody = () => {
    if (method === "from-chat-history") return <SelectFromChatHistory />;
    if (step === "symptoms") return <SymptomsForm />;
    if (step === "confirm") return <EmailPreviewAndContactForm />;
    return <NewAppointmentForm />;
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      icon={CalendarHeart}
      iconShape={`square`}
      title={stepTitle}
      description={STEP_DESCRIPTIONS[step].description}
      body={<FormProvider {...appointmentForm}>{renderBody()}</FormProvider>}
      footer={
        <div className="flex items-center gap-3 w-full">
          <Button
            variant={"secondary"}
            className="grow basis-0"
            onClick={step === "details" ? onClose : goToPrevStep}
          >
            {step === "details" ? "ยกเลิก" : "ย้อนกลับ"}
          </Button>
          {method === "from-chat-history" ? (
            <Button
              className="grow basis-0"
              type="button"
              onClick={() => selectedChatId && setMethod("default")}
            >
              ต่อไป
            </Button>
          ) : step === "confirm" ? (
            <Button
              className="grow basis-0"
              type="button"
              disabled={isPending}
              onClick={onSubmit}
            >
              {mode}การนัดหมายแพทย์
            </Button>
          ) : (
            <Button
              className="grow basis-0"
              type="button"
              onClick={goToNextStep}
            >
              ต่อไป
            </Button>
          )}
        </div>
      }
      className={cn(`w-full md:max-w-[640px]`)}
    ></Modal>
  );
};

const formatDiagnoses = (result: Pick<PrescreenResultItem, "diagnoses">) =>
  result.diagnoses
    .slice(0, 3)
    .map((d) => d.name_th || d.disease_name)
    .filter(Boolean)
    .join(", ");

const formatDepartments = (result: PrescreenResultItem) =>
  result.departments
    ?.map((d) => d.name_th || d.name)
    .filter(Boolean)
    .join(", ") ?? "";

const ENUM_TH: Record<string, string> = {
  Male: "ชาย",
  Female: "หญิง",
  pregnant: "ตั้งครรภ์",
  not_pregnant: "ไม่ได้ตั้งครรภ์",
  complete: "ครบ",
  incomplete: "ไม่ครบ",
  normal: "ปกติ",
  delayed: "ล่าช้า",
  same: "เท่าเดิม",
  more: "มากขึ้น",
  less: "น้อยลง",
};

const cleanUnderscores = (text: string): string => text.replace(/_/g, " ");

const formatAnswer = (answer: any, questionType: string | null): string => {
  if (questionType === "yes_no") {
    return answer ? "ใช่" : "ไม่ใช่";
  }
  if (
    questionType === "yes_no_detail" &&
    typeof answer === "object" &&
    answer?.answer !== undefined
  ) {
    if (!answer.answer) return "ไม่มี";
    return answer.detail ? `มี (${cleanUnderscores(answer.detail)})` : "มี";
  }
  if (Array.isArray(answer)) {
    return answer.length === 0
      ? "ไม่มี"
      : answer.map((a) => cleanUnderscores(String(a))).join(", ");
  }
  if (
    questionType === "enum" &&
    typeof answer === "string" &&
    ENUM_TH[answer]
  ) {
    return ENUM_TH[answer];
  }
  return cleanUnderscores(String(answer));
};

const formatHistoryReadable = (history?: PrescreenResultItem["history"]) => {
  if (!history?.length) return "";
  return history
    .map(
      (qa) => `- ${qa.question}: ${formatAnswer(qa.answer, qa.question_type)}`,
    )
    .join("\n");
};

const formatReasonFromPrescreen = (
  result: PrescreenResultItem,
): { reason: string; reasonDetail: string } => {
  // Part 1: AI assessment summary (goes in "อาการที่พบในปัจจุบัน:")
  const reasonSections: string[] = [];
  reasonSections.push("ต้องการนัดหมายแพทย์เพื่อตรวจสอบอาการเพิ่มเติม");
  reasonSections.push("");
  reasonSections.push("ผลการประเมินเบื้องต้นด้วย AI");
  reasonSections.push("");

  const summaryLines: string[] = [];
  if (result.severity?.name_th) {
    summaryLines.push(`ความรุนแรง: ${result.severity.name_th}`);
  }
  const deptText = formatDepartments(result);
  if (deptText) {
    summaryLines.push(`แผนกแนะนำ: ${deptText}`);
  }
  if (result.primarySymptom) {
    summaryLines.push(`อาการหลัก: ${result.primarySymptom}`);
  }
  const diagnosesText = formatDiagnoses(result);
  if (diagnosesText) {
    summaryLines.push(`การวินิจฉัย: ${diagnosesText}`);
  }
  if (summaryLines.length) {
    reasonSections.push(summaryLines.join("\n"));
  }

  // Part 2: Detailed history (goes at bottom of email)
  const detailSections: string[] = [];
  if (result.historySummary) {
    detailSections.push(result.historySummary);
    detailSections.push("");
  }
  const historyText = formatHistoryReadable(result.history);
  if (historyText) {
    detailSections.push("ประวัติการซักถาม");
    detailSections.push(historyText);
  }

  return {
    reason: reasonSections.join("\n"),
    reasonDetail: detailSections.join("\n"),
  };
};

const SelectFromChatHistory = () => {
  const { setValue, watch } = useFormContext<AppointmentDetailSchemaValues>();
  const { data, isLoading } = useQueryGetPrescreenResults();
  const prescreenResults = data?.data ?? [];
  const selectedChatId = watch("selectedChatId");

  const handleSelect = (result: PrescreenResultItem) => {
    const isSelected = selectedChatId === result.id;
    if (isSelected) {
      setValue("selectedChatId", "");
      setValue("reason", "");
      setValue("reasonDetail", "");
      setValue("department", "");
      return;
    }
    setValue("selectedChatId", result.id);
    const formatted = formatReasonFromPrescreen(result);
    setValue("reason", formatted.reason);
    setValue("reasonDetail", formatted.reasonDetail);
    const deptTh = result.departments?.[0]?.name_th || "";
    setValue("department", PRESCREEN_DEPT_MAP[deptTh] || deptTh);
  };

  return (
    <div className="flex flex-col gap-4 my-2">
      <h4 className="text-gray-700 font-semibold">
        เลือกข้อมูลจากประวัติการสนทนากับแชทบอท
      </h4>
      {isLoading ? (
        <div className="text-center text-gray-500 py-8">กำลังโหลด...</div>
      ) : prescreenResults.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          ไม่พบประวัติการคัดกรอง
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4 p-1">
          {prescreenResults.map((result) => {
            const isSelected = selectedChatId === result.id;
            const diagnosesText = formatDiagnoses(result);
            const departmentsText = formatDepartments(result);

            return (
              <li key={result.id}>
                <Turn
                  role={"assistant"}
                  className={cn(
                    "flex flex-col text-left cursor-pointer hover:ring-[5px] ring-error-300 h-full",
                    isSelected && "ring-[5px]",
                  )}
                  onClick={() => handleSelect(result)}
                >
                  {/* header */}
                  <div className="flex flex-col gap-1 pb-2 border-b border-secondary-300">
                    <div className="text-secondary-700 font-bold">
                      {result.chatRoomTitle}
                    </div>
                    <span className="text-secondary-300 text-sm">
                      {formatThaiDate(new Date(result.createdAt))}
                    </span>
                  </div>
                  {/* body */}
                  <div className="text-secondary-700 text-sm flex flex-col gap-1 pt-2">
                    {result.severity?.name_th && (
                      <p>⚠️ ความรุนแรง: {result.severity.name_th}</p>
                    )}
                    {departmentsText && <p>🏥 แผนกแนะนำ: {departmentsText}</p>}
                    {result.primarySymptom && (
                      <p>🩺 อาการหลัก: {result.primarySymptom}</p>
                    )}
                    {!!result.secondarySymptoms?.length && (
                      <p>🤒 อาการร่วม: {result.secondarySymptoms.join(", ")}</p>
                    )}
                    {diagnosesText && <p>📋 การวินิจฉัย: {diagnosesText}</p>}
                    {result.advice && (
                      <p className="text-secondary-500">💡 {result.advice}</p>
                    )}
                  </div>
                </Turn>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

function buildEmailPreview(values: AppointmentDetailSchemaValues): string {
  const fullName =
    [values.contactFirstName, values.contactLastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "-";
  const age = values.contactAge || "-";
  const email = values.contactEmail || "-";
  const contactPhone = values.contactPhone || "-";
  const formatSlot = (
    date: Date | undefined,
    time: { hour?: string; minute?: string } | undefined,
  ) => {
    const d = date ? formatThaiDate(date, { dateStyle: "long" }) : "-";
    const t =
      time?.hour && time?.minute ? `${time.hour}:${time.minute} น.` : "-";
    return `${d} เวลา ${t}`;
  };

  const primarySlot = formatSlot(
    values.appointmentDate,
    values.appointmentTime,
  );
  const altSlots =
    values.alternativeDates?.map((alt) => formatSlot(alt.date, alt.time)) ?? [];

  let dateLines: string[];
  if (altSlots.length === 0) {
    dateLines = [primarySlot];
  } else {
    dateLines = [
      `- เวลานัดหมายหลัก: ${primarySlot}`,
      ...altSlots.map((s, i) => {
        const label =
          altSlots.length === 1
            ? "เวลานัดหมายสำรอง"
            : `เวลานัดหมายสำรอง ${i + 1}`;
        return `- ${label}: ${s}`;
      }),
    ];
  }

  const lines = [
    `เรียน เจ้าหน้าที่ฝ่ายนัดหมาย โรงพยาบาล ${values.hospitalName || "-"}`,
    "",
    `ข้าพเจ้า ${fullName} อายุ ${age} ปี มีความประสงค์ขอนัดหมายพบแพทย์เพื่อรับการตรวจวินิจฉัยอาการเพิ่มเติม`,
    "",
    "อาการที่พบในปัจจุบัน:",
    values.reason || "-",
    "",
    "แผนกที่ต้องการนัดหมาย:",
    values.department || "-",
    "",
    "วันและเวลาที่สะดวก:",
    ...dateLines,
    "",
    "ข้อมูลติดต่อ:",
    `- เบอร์โทรศัพท์: ${contactPhone}`,
    `- อีเมล: ${email}`,
  ];

  if (values.reasonDetail) {
    lines.push("", values.reasonDetail);
  }

  return lines.join("\n");
}

const TEXTAREA_BASE_CLASS =
  "box-border bg-white disabled:bg-gray-100 flex text-md text-gray-900 border rounded-lg shadow-xs outline-none w-full py-2.5 pl-3.5 pr-12";

const SymptomsForm = () => {
  const {
    watch,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<AppointmentDetailSchemaValues>();
  const reasonId = useId();
  const reasonDetailId = useId();
  const reason = watch("reason");
  const reasonDetail = watch("reasonDetail");

  return (
    <div className="flex flex-col gap-4 my-2">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={reasonId} className="gap-0">
            อาการที่พบในปัจจุบัน{" "}
            <span className="text-error-600 inline font-medium">*</span>
          </Label>
          {(reason || reasonDetail) && (
            <button
              type="button"
              onClick={() => {
                setValue("reason", "");
                setValue("reasonDetail", "");
                setValue("selectedChatId", "");
              }}
              className="-mb-1 text-xs text-gray-400 hover:text-error-500"
            >
              ล้างข้อมูล
            </button>
          )}
        </div>
        <textarea
          id={reasonId}
          {...register("reason")}
          rows={5}
          placeholder="กรอกอาการที่พบในปัจจุบัน"
          className={cn(
            TEXTAREA_BASE_CLASS,
            errors.reason ? "border-error-300" : "border-gray-300",
          )}
        />
        {errors.reason?.message && (
          <p className="text-sm text-error-600 mt-0.5">
            {errors.reason.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={reasonDetailId}>ประวัติและรายละเอียดเพิ่มเติม</Label>
          {reasonDetail && (
            <button
              type="button"
              onClick={() => setValue("reasonDetail", "")}
              className="-mb-1 text-xs text-gray-400 hover:text-error-500"
            >
              ล้างข้อมูล
            </button>
          )}
        </div>
        <textarea
          id={reasonDetailId}
          {...register("reasonDetail")}
          rows={5}
          placeholder="กรอกรายละเอียดเพิ่มเติม เช่น ประวัติการซักถาม ผลการประเมิน"
          className={cn(TEXTAREA_BASE_CLASS, "border-gray-300")}
        />
      </div>
      <Input
        type="text"
        label="หมายเหตุ"
        placeholder="กรอกหมายเหตุ"
        {...register("note")}
        hint={errors.note?.message}
        variant={errors.note ? "error" : "default"}
      />
    </div>
  );
};

const EmailPreviewAndContactForm = () => {
  const {
    watch,
    register,
    formState: { errors },
  } = useFormContext<AppointmentDetailSchemaValues>();
  const values = watch();
  const previewText = buildEmailPreview(values);

  return (
    <div className="flex flex-col gap-4 my-2">
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          type="text"
          label="ชื่อ"
          placeholder="ชื่อ"
          requiredLabel={true}
          hint={errors.contactFirstName?.message}
          variant={errors.contactFirstName ? "error" : "default"}
          {...register("contactFirstName")}
        />
        <Input
          type="text"
          label="นามสกุล"
          placeholder="นามสกุล"
          requiredLabel={true}
          hint={errors.contactLastName?.message}
          variant={errors.contactLastName ? "error" : "default"}
          {...register("contactLastName")}
        />
        <Input
          type="text"
          label="อายุ"
          placeholder="อายุ (ปี)"
          requiredLabel={true}
          hint={errors.contactAge?.message}
          variant={errors.contactAge ? "error" : "default"}
          {...register("contactAge")}
        />
        <Input
          type="email"
          label="อีเมล"
          placeholder="อีเมล"
          className="sm:col-span-2"
          requiredLabel={true}
          hint={errors.contactEmail?.message}
          variant={errors.contactEmail ? "error" : "default"}
          {...register("contactEmail")}
        />
        <Input
          type="tel"
          label="เบอร์โทรติดต่อกลับ"
          placeholder="เบอร์โทรติดต่อกลับ"
          className="sm:col-span-2"
          requiredLabel={true}
          hint={errors.contactPhone?.message}
          variant={errors.contactPhone ? "error" : "default"}
          {...register("contactPhone")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium text-gray-700">
          ตัวอย่างอีเมลที่จะส่งถึงโรงพยาบาล
        </Label>
        <pre className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap font-sans max-h-[280px] overflow-y-auto">
          {previewText}
        </pre>
      </div>
    </div>
  );
};

const NewAppointmentForm = () => {
  const medicineDetailFormId = useId();

  const {
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useFormContext<AppointmentDetailSchemaValues>();

  const { data, isLoading } = useQueryGetAppointmentsHospital();
  const { data: prescreenData } = useQueryGetPrescreenResults();
  const latestPrescreen = prescreenData?.data?.[0] ?? null;

  useEffect(() => {
    if (!latestPrescreen) return;

    const {
      reason: currentReason,
      department: currentDept,
      selectedChatId,
    } = getValues();
    if (currentReason || selectedChatId) return;

    const formatted = formatReasonFromPrescreen(latestPrescreen);
    if (formatted.reason) {
      setValue("reason", formatted.reason);
      setValue("reasonDetail", formatted.reasonDetail);
    }

    if (!currentDept && latestPrescreen.departments?.length) {
      const deptNameTh = latestPrescreen.departments[0].name_th;
      if (deptNameTh) {
        const mapped = PRESCREEN_DEPT_MAP[deptNameTh];
        if (mapped) {
          setValue("department", mapped);
        } else if (DEPARTMENTS.some((d) => d.name === deptNameTh)) {
          setValue("department", deptNameTh);
        }
      }
    }
  }, [latestPrescreen]);

  const DEPARTMENT_LIST = DEPARTMENTS.map((department) => department.name);
  const hospitalNameList = useMemo(() => {
    return data?.list ? data?.list.map((d) => d.nameTh) : [];
  }, [data]);

  const hospitalName = watch("hospitalName");
  const department = watch("department");

  return (
    <form id={medicineDetailFormId} className="flex flex-col gap-2" noValidate>
      <h4 className="text-gray-700 font-semibold mb-3">ข้อมูลการนัดหมาย</h4>
      <div className="flex flex-col gap-4 pb-4">
        <TextDropdown
          items={hospitalNameList}
          selectedItem={hospitalName}
          handleSetSelectedItem={(item: string, index: number) => {
            setValue("hospitalName", item);
            const hospitalInfo = data?.list[index];
            setValue("hospitalEmail", hospitalInfo?.email);
          }}
          label="โรงพยาบาล"
          placeholder="เลือกโรงพยาบาล"
          requiredLabel={true}
          isItemsFullWidth={true}
          disabled={isLoading}
          hint={errors.hospitalName?.message}
          variant={errors.hospitalName ? "error" : "default"}
        />
        <TextDropdown
          items={DEPARTMENT_LIST}
          selectedItem={department}
          handleSetSelectedItem={(item: string) => {
            setValue("department", item);
          }}
          label="แผนก"
          placeholder="เลือกแผนก"
          requiredLabel={true}
          isItemsFullWidth={true}
          hint={errors.department?.message}
          variant={errors.department ? "error" : "default"}
        />
        <AppointmentDateTimeFields />
      </div>
    </form>
  );
};

const AppointmentDateTimeFields = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const {
    setValue,
    watch,
    control,
    formState: { errors },
  } = useFormContext<AppointmentDetailSchemaValues>();

  const appointmentDate = watch("appointmentDate");
  const appointmentTime = watch("appointmentTime");
  const watchedAlternatives = watch("alternativeDates");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "alternativeDates",
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Primary date/time */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="gap-0">
            วันที่นัดหมาย <span className="text-error-600">*</span>
          </Label>
          <DatePicker
            selectedDate={appointmentDate}
            handleSetSelectedDate={(d: Date | undefined) => {
              if (d) setValue("appointmentDate", d);
            }}
            disabled={{ before: tomorrow }}
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-fit"
            >
              <CalendarPlus2Icon className="size-4" />
              {appointmentDate ? (
                <span>{formatThaiDate(appointmentDate)}</span>
              ) : (
                <span>เลือกวันที่</span>
              )}
            </Button>
          </DatePicker>
          {errors.appointmentDate?.message && (
            <p className="text-sm text-error-600 mt-0.5">
              {errors.appointmentDate.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="gap-0">
            เวลานัดหมาย <span className="text-error-600">*</span>
          </Label>
          <TimePicker
            selectedTime={{
              hour: appointmentTime?.hour,
              minute: appointmentTime?.minute,
            }}
            handleSetSelectedTime={(time) => {
              setValue("appointmentTime.hour", time.hour, {
                shouldDirty: true,
              });
              setValue("appointmentTime.minute", time.minute, {
                shouldDirty: true,
              });
            }}
            minHour={6}
            maxHour={21}
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-fit"
            >
              <Clock2Icon className="size-4" />
              {appointmentTime?.hour && appointmentTime?.minute ? (
                <span>
                  {appointmentTime.hour}:{appointmentTime.minute}
                </span>
              ) : (
                <span>เลือกเวลา</span>
              )}
            </Button>
          </TimePicker>
          {(errors.appointmentTime?.hour?.message ||
            errors.appointmentTime?.minute?.message) && (
            <p className="text-sm text-error-600 mt-0.5">
              {errors.appointmentTime?.hour?.message ||
                errors.appointmentTime?.minute?.message}
            </p>
          )}
        </div>
      </div>

      {/* Alternative date/time slots */}
      {fields.map((field, index) => {
        const alt = watchedAlternatives?.[index];
        return (
          <div key={field.id} className="grid md:grid-cols-2 gap-4 relative">
            <div className="flex flex-col gap-1.5">
              <Label className="gap-0 text-sm text-gray-500">
                {fields.length === 1
                  ? "ตัวเลือกสำรอง"
                  : `ตัวเลือกสำรอง ${index + 1}`}
              </Label>
              <DatePicker
                selectedDate={alt?.date}
                handleSetSelectedDate={(d: Date | undefined) => {
                  if (d) setValue(`alternativeDates.${index}.date`, d);
                }}
                disabled={{ before: tomorrow }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-fit"
                >
                  <CalendarPlus2Icon className="size-4" />
                  {alt?.date ? (
                    <span>{formatThaiDate(alt.date)}</span>
                  ) : (
                    <span>เลือกวันที่</span>
                  )}
                </Button>
              </DatePicker>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="gap-0 text-sm text-gray-500">เวลา</Label>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-gray-400 hover:text-error-500 transition-colors p-0.5"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
              <TimePicker
                selectedTime={{
                  hour: alt?.time?.hour ?? "0",
                  minute: alt?.time?.minute ?? "0",
                }}
                handleSetSelectedTime={(time) => {
                  setValue(`alternativeDates.${index}.time.hour`, time.hour, {
                    shouldDirty: true,
                  });
                  setValue(
                    `alternativeDates.${index}.time.minute`,
                    time.minute,
                    {
                      shouldDirty: true,
                    },
                  );
                }}
                minHour={6}
                maxHour={21}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-fit"
                >
                  <Clock2Icon className="size-4" />
                  {alt?.time?.hour && alt?.time?.minute ? (
                    <span>
                      {alt.time.hour}:{alt.time.minute}
                    </span>
                  ) : (
                    <span>เลือกเวลา</span>
                  )}
                </Button>
              </TimePicker>
            </div>
          </div>
        );
      })}

      {/* Add button */}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="w-fit"
        onClick={() =>
          append({ date: tomorrow, time: { hour: "08", minute: "00" } })
        }
      >
        <PlusIcon className="size-4" />
        เพิ่มตัวเลือกวัน/เวลาสำรอง
      </Button>
    </div>
  );
};

export default AddAppointmentModal;
