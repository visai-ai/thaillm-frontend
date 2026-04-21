import { cn } from "@/lib/utils";
import { useEffect, useState, useTransition } from "react";

import { GetMedicalRemindersSchedulesByIdResponse } from "@/@types/backend-api";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { formatLocaleDate } from "@/utils/time";

import {
  MEAL_PERIOD,
  MEAL_TIMING,
  MealPeriodKey,
  MealTimingKey,
  MedicineUnitType,
  REPEAT_TYPE,
  RepeatTypeKey,
} from "@/constant/medicalReminder";
import {
  getMedicineRecommendationCheckedList,
  getMedicineSuggestionList,
  mapRecommendationsToDefaultValues,
  medicalReminderInfo,
  MedicalReminderInfoValues,
  medicineRepeatSchema,
  MedicineRepeatSchemaValues,
} from "@/lib/schema/medicalReminderSchema";
import { useNotificationStore } from "@/stores/useNotificationStore";

import { Modal } from "@/components/common/CustomModal";
import ProgressStep from "@/components/common/ProgressStep";
import { Button } from "@/components/ui/button";

import MedicalReminderInfoForm from "./MedicalReminderInfoForm";
import ScheduleMedicineReminderForm from "./ScheduleMedicineReminderForm";

import { PostMedicalRemindersSchedulesData } from "@/@types/backend-api";
import { DAY_OF_WEEK, DayOfWeek } from "@/constant/common";
import api from "@/lib/api";
import { formatThaiDate, formatTwoDigit } from "@/utils/time";
import { CheckCircleIcon, Pill } from "lucide-react";

const SUCCESS_FORM_STATE = {
  SUCCESS_ADD_MEDICAL: "success_add_medical",
  SUCCESS_EDIT_MEDICAL: "success_edit_medical",
};

const AddMedicalReminderModal = ({
  open,
  onOpenChange,
  onRefetch,
  defaultValues,
  pendingId,
  onPendingIdCleared,
  sendToolResponse,
}: {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  onRefetch?: () => void;
  defaultValues?: GetMedicalRemindersSchedulesByIdResponse["item"];
  pendingId?: string | null;
  onPendingIdCleared?: () => void;
  sendToolResponse?: (data: {
    id: string;
    cancelled?: boolean;
    data?: any;
  }) => Promise<void>;
}) => {
  const [isPending, startTransition] = useTransition();
  const [successState, setSuccessState] = useState<
    (typeof SUCCESS_FORM_STATE)[keyof typeof SUCCESS_FORM_STATE] | null
  >(null);
  const [originalSuggestionOptions, setOriginalSuggestionOptions] = useState<
    Record<string, any> | undefined
  >();

  const { addNotification } = useNotificationStore();

  const editId = defaultValues?.id;
  const labelState = editId ? `แก้ไข` : `เพิ่ม`;

  const STEPS = [
    "ข้อมูลทั่วไป",
    "รายละเอียดการทาน/ใช้ยา",
    `สรุปการ${labelState}รายการแจ้งเตือน`,
  ];

  const getOneWeekLater = (baseDate?: string | null) =>
    new Date(
      new Date(baseDate ?? Date.now()).getTime() + 7 * 24 * 60 * 60 * 1000,
    );

  const oneWeekLater = getOneWeekLater(defaultValues?.endDate);

  const mappedRecommendation = mapRecommendationsToDefaultValues(
    defaultValues?.recommendation || [],
  );
  // step 1: ชื่อยา, หน่วย, ข่้อแนะนำการใช้ยา, start-end วันแจ้งเตือน, enable notification
  const medicalReminderInfoForm = useForm<MedicalReminderInfoValues>({
    resolver: zodResolver(medicalReminderInfo),
    mode: "onChange",
    defaultValues: {
      medicalName: defaultValues?.medicalName || "",
      enableNotification: defaultValues?.status === "inactive" ? false : true,
      startNotificationDate: defaultValues?.startDate
        ? new Date(defaultValues.startDate)
        : new Date(),
      endNotificationDate: defaultValues?.endDate
        ? new Date(defaultValues.endDate)
        : oneWeekLater,
      unit: (defaultValues?.doseUnit as MedicineUnitType) || "เม็ด",
      usageSuggestion: mappedRecommendation,
    },
  });

  const mealPeriodList = defaultValues?.medicalReminderScheduleTimes
    ? defaultValues.medicalReminderScheduleTimes.map(
        (
          m: NonNullable<
            GetMedicalRemindersSchedulesByIdResponse["item"]["medicalReminderScheduleTimes"]
          >[number],
        ) => {
          const reminderTime = m.reminderTime.split(":");
          const hour = formatTwoDigit(reminderTime?.[0]);
          const minute = formatTwoDigit(reminderTime?.[1]);
          return {
            period: m.mealPeriod as MealPeriodKey,
            hour: hour,
            minute: minute,
          };
        },
      )
    : [];
  // step 2: ความถี่การใช้ยา
  const scheduleIntakeMedicineForm = useForm<MedicineRepeatSchemaValues>({
    resolver: zodResolver(medicineRepeatSchema),
    mode: "onChange",
    defaultValues: {
      repeatType: defaultValues?.repeatType
        ? (defaultValues?.repeatType as RepeatTypeKey)
        : "daily",
      dayOfWeeks:
        (defaultValues?.dayOfWeeks as [DayOfWeek, ...DayOfWeek[]]) || [],
      dosePerTime: defaultValues?.dose ? String(defaultValues?.dose) : "",
      dateInMonths: defaultValues?.dateOfMonths
        ? defaultValues?.dateOfMonths[0]
        : undefined,
      mealTiming: (defaultValues?.mealTiming as MealTimingKey) || "before_meal",
      mealPeriod: mealPeriodList,
    },
  });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showSuggestionOptions, setShowSuggestionOptions] =
    useState<boolean>(false);

  // detail
  const medicalName = medicalReminderInfoForm.watch("medicalName");
  const unit = medicalReminderInfoForm.watch("unit");
  const startNotificationDate = medicalReminderInfoForm.watch(
    "startNotificationDate",
  );
  const endNotificationDate = medicalReminderInfoForm.watch(
    "endNotificationDate",
  );
  const usageSuggestion = medicalReminderInfoForm.watch("usageSuggestion");

  const scheduleIntakeMedicineFormValue =
    scheduleIntakeMedicineForm.watch() as MedicineRepeatSchemaValues;

  const onClose = () => {
    onOpenChange(false);
  };

  const onNextStep = async (validateForm?: () => Promise<boolean>) => {
    if (validateForm) {
      const valid = await validateForm();
      if (!valid) {
        const form =
          currentStep === 1
            ? medicalReminderInfoForm
            : scheduleIntakeMedicineForm;
        console.debug(
          `[AddMedicalReminderModal] Step ${currentStep} invalid on ต่อไป:`,
          form.formState.errors,
        );
        return;
      }
    }
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const onPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitMedicalReminder = async () => {
    const validStep1 = await medicalReminderInfoForm.trigger(undefined, {
      shouldFocus: true,
    });
    const validStep2 = await scheduleIntakeMedicineForm.trigger(undefined, {
      shouldFocus: true,
    });
    if (!validStep1 || !validStep2) {
      if (!validStep1) {
        console.debug(
          "[AddMedicalReminderModal] Step 1 invalid:",
          medicalReminderInfoForm.formState.errors,
        );
      }
      if (!validStep2) {
        console.debug(
          "[AddMedicalReminderModal] Step 2 invalid:",
          scheduleIntakeMedicineForm.formState.errors,
        );
      }
      return;
    }
    startTransition(async () => {
      const medicalReminderInfoValue = medicalReminderInfoForm.getValues();
      const recommendCheckedValues = getMedicineRecommendationCheckedList(
        medicalReminderInfoValue.usageSuggestion,
      );

      const requestBody: PostMedicalRemindersSchedulesData["requestBody"] = {
        medicalName: medicalReminderInfoValue.medicalName,
        startDate: formatLocaleDate(
          medicalReminderInfoValue.startNotificationDate,
        ),
        endDate: formatLocaleDate(medicalReminderInfoValue.endNotificationDate),
        medicalReminderScheduleTimes:
          scheduleIntakeMedicineFormValue.mealPeriod.map((consume) => {
            return {
              reminderTime: `${consume.hour}:${consume.minute}`,
              mealTiming:
                scheduleIntakeMedicineFormValue.mealTiming as MealTimingKey, // "breakfast" | "lunch" | "dinner" | "bedtime",
              mealPeriod: consume.period, // "before" | "after" | "with"
            };
          }),
        dose: +scheduleIntakeMedicineFormValue.dosePerTime,
        doseUnit: medicalReminderInfoValue.unit,
        status: medicalReminderInfoValue.enableNotification
          ? "active"
          : "inactive",
        repeatType: scheduleIntakeMedicineFormValue.repeatType,
        recommendation: recommendCheckedValues,
        ...(scheduleIntakeMedicineFormValue.repeatType === "weekly" && {
          dayOfWeeks: scheduleIntakeMedicineFormValue.dayOfWeeks as (
            | "sunday"
            | "monday"
            | "tuesday"
            | "wednesday"
            | "thursday"
            | "friday"
            | "saturday"
          )[],
        }),
        ...(scheduleIntakeMedicineFormValue.repeatType === "monthly" && {
          dateOfMonths: scheduleIntakeMedicineFormValue.dateInMonths
            ? [scheduleIntakeMedicineFormValue.dateInMonths]
            : undefined,
        }),
      };

      if (editId) {
        const respEdit =
          await api.medicalReminder.updateMedicalReminderScheduleById({
            id: editId,
            requestBody,
          });
        if (!respEdit.ok) {
          addNotification({
            state: "error",
            title: "แก้ไขการแจ้งเตือนทานยาไม่สำเร็จ",
            description: `${respEdit.data.error}: แก้ไขการแจ้งเตือนทานยาไม่สำเร็จ`,
          });
          if (pendingId && sendToolResponse) {
            await sendToolResponse({
              id: pendingId,
              cancelled: false,
              data: {
                error:
                  respEdit.data.error || "Failed to update medical reminder",
              },
            });
            onPendingIdCleared?.();
          }
          return;
        }
        setSuccessState(SUCCESS_FORM_STATE.SUCCESS_EDIT_MEDICAL);
        if (pendingId && sendToolResponse) {
          await sendToolResponse({
            id: pendingId,
            cancelled: false,
            data: {
              reminderId: editId,
            },
          });
          onPendingIdCleared?.();
        }
      } else {
        if (pendingId) {
          const respCreate =
            await api.medicalReminder.addMedicalReminderSchedule({
              requestBody: requestBody,
            });
          if (!respCreate.ok) {
            addNotification({
              state: "error",
              title: "เพิ่มการแจ้งเตือนทานยาไม่สำเร็จ",
              description: `${respCreate.data.error}: เพิ่มการแจ้งเตือนทานยาไม่สำเร็จ`,
            });
            await sendToolResponse?.({
              id: pendingId,
              cancelled: false,
              data: {
                error:
                  respCreate.data.error || "Failed to add medical reminder",
              },
            });
            onPendingIdCleared?.();
            return;
          }

          await sendToolResponse?.({
            id: pendingId,
            cancelled: false,
            data: {
              reminderId: respCreate.data.id,
            },
          });
          onPendingIdCleared?.();
          setSuccessState(SUCCESS_FORM_STATE.SUCCESS_ADD_MEDICAL);
        } else {
          // Fallback: direct API call if no pendingId
          const respCreate =
            await api.medicalReminder.addMedicalReminderSchedule({
              requestBody: requestBody,
            });
          if (!respCreate.ok) {
            addNotification({
              state: "error",
              title: "เพิ่มการแจ้งเตือนทานยาไม่สำเร็จ",
              description: `${respCreate.data.error}: เพิ่มการแจ้งเตือนทานยาไม่สำเร็จ`,
            });
            return;
          }
          setSuccessState(SUCCESS_FORM_STATE.SUCCESS_ADD_MEDICAL);
        }
      }

      onRefetch?.();
    });
  };

  const completedMealPeriod = scheduleIntakeMedicineFormValue.mealPeriod.every(
    (period) => {
      return period.hour && period.minute && period.period;
    },
  );

  const dosePerTimeNum = Number(scheduleIntakeMedicineFormValue.dosePerTime);
  const isValidDosePerTime =
    scheduleIntakeMedicineFormValue.dosePerTime !== "" &&
    !isNaN(dosePerTimeNum) &&
    dosePerTimeNum > 0;

  let passSecondCondition =
    !!scheduleIntakeMedicineFormValue.mealTiming &&
    isValidDosePerTime &&
    !!scheduleIntakeMedicineFormValue.mealPeriod &&
    scheduleIntakeMedicineFormValue.mealPeriod.length > 0 &&
    completedMealPeriod;

  switch (scheduleIntakeMedicineFormValue.repeatType) {
    case "weekly":
      passSecondCondition =
        passSecondCondition &&
        !!scheduleIntakeMedicineFormValue?.dayOfWeeks &&
        scheduleIntakeMedicineFormValue?.dayOfWeeks.length > 0;
      break;
    case "monthly":
      passSecondCondition =
        passSecondCondition && !!scheduleIntakeMedicineFormValue?.dateInMonths;
      break;
  }

  const fistStepActions = (
    <>
      <Button variant={"secondary"} className="grow basis-0" onClick={onClose}>
        ยกเลิก
      </Button>
      <Button
        className="grow basis-0"
        type="button"
        onClick={() =>
          onNextStep(() =>
            medicalReminderInfoForm.trigger(undefined, {
              shouldFocus: true,
            }),
          )
        }
      >
        ต่อไป
      </Button>
    </>
  );
  const selectSuggestionActions = (
    <>
      <Button
        variant={"secondary"}
        className="grow basis-0"
        onClick={() => {
          const current =
            medicalReminderInfoForm.getValues("usageSuggestion") || {};

          const restoredState = Object.fromEntries(
            Object.entries(current).map(([key, value]) => {
              const original = originalSuggestionOptions?.[key];

              if (value && typeof value === "object" && "checked" in value) {
                if (original?.checked) {
                  return [key, { ...original }];
                }
                return [
                  key,
                  {
                    checked: false,
                    ...Object.fromEntries(
                      Object.keys(value)
                        .filter((k) => k !== "checked")
                        .map((k) => [k, ""]),
                    ),
                  },
                ];
              }

              return [key, Boolean(original)];
            }),
          );

          medicalReminderInfoForm.setValue("usageSuggestion", restoredState, {
            shouldDirty: true,
            shouldValidate: true,
          });

          medicalReminderInfoForm.trigger("usageSuggestion");
          setShowSuggestionOptions(false);
        }}
      >
        กลับ
      </Button>
      <Button
        className="grow basis-0"
        onClick={async () => {
          const valid =
            await medicalReminderInfoForm.trigger("usageSuggestion");
          if (valid) {
            setShowSuggestionOptions(false);
            setOriginalSuggestionOptions(
              JSON.parse(JSON.stringify(usageSuggestion)),
            );
          }
        }}
      >
        ยืนยัน
      </Button>
    </>
  );
  const secondStepActions = (
    <>
      <Button
        variant={"secondary"}
        className="grow basis-0"
        onClick={onPreviousStep}
      >
        กลับ
      </Button>
      <Button
        className="grow basis-0"
        type="button"
        onClick={() =>
          onNextStep(() =>
            scheduleIntakeMedicineForm.trigger(undefined, {
              shouldFocus: true,
            }),
          )
        }
      >
        ต่อไป
      </Button>
    </>
  );

  const lastStepActions = (
    <>
      <Button
        variant={"secondary"}
        className="grow basis-0"
        onClick={onPreviousStep}
      >
        กลับ
      </Button>
      <Button
        className="grow basis-0"
        type="button"
        disabled={isPending}
        onClick={handleSubmitMedicalReminder}
      >
        {labelState}รายการแจ้งเตือน
      </Button>
    </>
  );

  useEffect(() => {
    if (defaultValues) {
      const mappedRecommendation = mapRecommendationsToDefaultValues(
        defaultValues?.recommendation || [],
      );

      medicalReminderInfoForm.reset({
        medicalName: defaultValues?.medicalName || "",
        enableNotification: defaultValues?.status === "inactive" ? false : true,
        startNotificationDate: defaultValues?.startDate
          ? new Date(defaultValues.startDate)
          : new Date(),
        endNotificationDate: defaultValues?.endDate
          ? new Date(defaultValues.endDate)
          : getOneWeekLater(defaultValues?.endDate),
        unit: (defaultValues?.doseUnit as MedicineUnitType) || "เม็ด",
        usageSuggestion: mappedRecommendation,
      });

      const mealPeriodList = defaultValues?.medicalReminderScheduleTimes
        ? defaultValues?.medicalReminderScheduleTimes.map((m) => {
            const reminderTime = m.reminderTime.split(":");
            const hour = formatTwoDigit(reminderTime?.[0]);
            const minute = formatTwoDigit(reminderTime?.[1]);
            return {
              period: m.mealPeriod as MealPeriodKey,
              hour: hour,
              minute: minute,
            };
          })
        : [];

      scheduleIntakeMedicineForm.reset({
        repeatType: defaultValues?.repeatType
          ? (defaultValues?.repeatType as RepeatTypeKey)
          : "daily",
        dayOfWeeks:
          (defaultValues?.dayOfWeeks as [DayOfWeek, ...DayOfWeek[]]) || [],
        dosePerTime: defaultValues?.dose ? String(defaultValues?.dose) : "",
        dateInMonths: defaultValues?.dateOfMonths
          ? defaultValues?.dateOfMonths[0]
          : undefined,
        mealTiming:
          (defaultValues?.mealTiming as MealTimingKey) || "before_meal",
        mealPeriod: mealPeriodList,
      });
    }
  }, [defaultValues, medicalReminderInfoForm, scheduleIntakeMedicineForm]);

  if (successState) {
    return (
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        icon={CheckCircleIcon}
        variant={"success"}
        className={cn(`w-full md:max-w-[400px]`)}
        title={`${labelState}รายการแจ้งเตือนยาสำเร็จ`}
        description={`การแจ้งเตือนทานยา ‘${medicalName}’ ได้ถูก${labelState}ในระบบ\nโดยจะเริ่มการแจ้งเตือน ${formatThaiDate(
          startNotificationDate,
        )}`}
        footer={
          <Button className="grow basis-0" type="button" onClick={onClose}>
            ยืนยัน
          </Button>
        }
      />
    );
  }
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      icon={Pill}
      iconShape={`square`}
      maskClosable={false}
      title={
        showSuggestionOptions
          ? `เลือกข้อแนะนำการใช้งาน (หากมี)`
          : `${labelState}รายการแจ้งเตือนยา`
      }
      description={
        showSuggestionOptions ? `` : `ระบุรายละเอียดในการแจ้งเตือนทานยา`
      }
      body={
        <section className="px-1 flex flex-col">
          {/* step progress */}
          <div className="sm:sticky top-0 bg-white w-full z-10">
            <ProgressStep
              currentStep={currentStep - 1}
              stepLength={STEPS.length}
              className={cn(
                "mx-auto max-w-[368px]",
                showSuggestionOptions ? "hidden" : "",
              )}
            />
          </div>

          {/* step content */}
          <div className="space-y-4">
            <h4
              className={cn(
                "font-semibold text-gray-900",
                showSuggestionOptions ? "hidden" : "",
              )}
            >
              {STEPS[currentStep - 1]}
            </h4>
            {/* step 1 */}
            <section className={currentStep === 1 ? "block" : "hidden"}>
              <FormProvider {...medicalReminderInfoForm}>
                <MedicalReminderInfoForm
                  showSuggestionOptions={showSuggestionOptions}
                  handleShowSuggestionOptions={(state: boolean) => {
                    setShowSuggestionOptions(state);
                  }}
                />
              </FormProvider>
            </section>

            {/* step 2 */}
            <section className={currentStep === 2 ? "block" : "hidden"}>
              <FormProvider {...scheduleIntakeMedicineForm}>
                <ScheduleMedicineReminderForm unit={unit} />
              </FormProvider>
            </section>
            {currentStep === 3 && (
              <section>
                <Summary
                  medicalReminderInfoValue={medicalReminderInfoForm.getValues()}
                  scheduleIntakeMedicineValue={scheduleIntakeMedicineFormValue}
                />
              </section>
            )}
          </div>
        </section>
      }
      footer={
        <div className="flex items-center gap-3 w-full">
          {currentStep === 1 && (
            <>
              {showSuggestionOptions
                ? selectSuggestionActions
                : fistStepActions}
            </>
          )}
          {currentStep === 2 && secondStepActions}
          {currentStep === 3 && lastStepActions}
        </div>
      }
      className={cn(`w-full md:max-w-[640px]`)}
    />
  );
};

type SummaryProps = {
  medicalReminderInfoValue: MedicalReminderInfoValues;
  scheduleIntakeMedicineValue: MedicineRepeatSchemaValues;
};

const Summary = ({
  medicalReminderInfoValue,
  scheduleIntakeMedicineValue,
}: SummaryProps) => {
  const suggestionCheckedValues = getMedicineSuggestionList(
    medicalReminderInfoValue.usageSuggestion,
  );
  const repeatType = scheduleIntakeMedicineValue.repeatType;

  const getRepeatTypeDetail = (repeatType: RepeatTypeKey): string => {
    switch (repeatType) {
      case "weekly":
        const formattedDayOfWeeks =
          scheduleIntakeMedicineValue?.dayOfWeeks?.map((day) => {
            return DAY_OF_WEEK[day];
          });
        return formattedDayOfWeeks
          ? `${formattedDayOfWeeks.join(", ")} ของทุกสัปดาห์`
          : "-";
      case "monthly":
        return `ทุกๆวันที่ ${scheduleIntakeMedicineValue.dateInMonths} ของทุกเดือน`;
      default:
        return REPEAT_TYPE[repeatType] as string;
    }
  };

  const mealPeriodLabel = scheduleIntakeMedicineValue?.mealPeriod
    ? scheduleIntakeMedicineValue.mealPeriod?.map((consume) => {
        return `${MEAL_PERIOD[consume.period]} ${consume.hour}:${
          consume.minute
        }`;
      })
    : [];

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Medicine name */}
      <div className="text-gray-600 font-semibold">ชื่อยา</div>
      <div className="col-span-2 text-gray-600 font-medium">
        {medicalReminderInfoValue.medicalName}
      </div>
      {/* Suggestion name */}
      <div className="text-gray-600 font-semibold">ข้อแนะนำการใช้งาน</div>
      <div className="col-span-2 text-gray-600 font-medium">
        {suggestionCheckedValues?.length > 0
          ? suggestionCheckedValues.join(", ")
          : "-"}
      </div>
      {/* Frequncy */}
      <div className="text-gray-600 font-semibold">ความถี่ในการทานยา</div>
      <div className="col-span-2 text-gray-600 font-medium">
        {getRepeatTypeDetail(repeatType)}
      </div>
      {/* Consume time */}
      <div className="text-gray-600 font-semibold">ทานวันละ</div>
      <div className="col-span-2 text-gray-600 font-medium">
        {MEAL_TIMING[scheduleIntakeMedicineValue.mealTiming]}{" "}
        {mealPeriodLabel.length} ครั้ง ({mealPeriodLabel.join(", ")})
      </div>
      {/* Dose per time */}
      <div className="text-gray-600 font-semibold">ทานยาจำนวนครั้งละ</div>
      <div className="col-span-2 text-gray-600 font-medium">
        {scheduleIntakeMedicineValue.dosePerTime}{" "}
        {medicalReminderInfoValue.unit}
      </div>
      <div className="text-gray-600 font-semibold">วันที่เริ่มการแจ้งเตือน</div>
      <div className="col-span-2 text-gray-600 font-medium">
        {formatThaiDate(medicalReminderInfoValue.startNotificationDate)}
      </div>
      <div className="text-gray-600 font-semibold">
        วันที่สิ้นสุดการแจ้งเตือน
      </div>
      <div className="col-span-2 text-gray-600 font-medium">
        {formatThaiDate(medicalReminderInfoValue.endNotificationDate)}
      </div>
    </div>
  );
};

export default AddMedicalReminderModal;
