import { PostMedicalRemindersSchedulesData } from "@/@types/backend-api";
import { DAY_OF_WEEK_LIST } from "@/constant/common";
import {
  MEAL_PERIOD_LIST,
  MEAL_TIMING_LIST,
  MEDICINE_CONSUME_SUGGESTIONS,
  MEDICINE_UNIT_OPTIONS,
  MedicineConsumeSuggestionType,
  REPEAT_TYPE_LIST,
} from "@/constant/medicalReminder";
import { z } from "zod";

const suggestionsSchemaShape: Record<string, z.ZodTypeAny> = {};
MEDICINE_CONSUME_SUGGESTIONS.forEach(
  (sug: (typeof MEDICINE_CONSUME_SUGGESTIONS)[number]) => {
    if (sug.hasInput && sug.inputKey) {
      const inputKey = sug.inputKey;
      suggestionsSchemaShape[sug.key] = z
        .object({
          checked: z.boolean().optional(),
          [inputKey]: z.string().optional(),
        })
        .optional();
    } else {
      suggestionsSchemaShape[sug.key] = z.boolean().optional();
    }
  },
);

export const mapRecommendationsToDefaultValues = (
  recommendations: NonNullable<
    PostMedicalRemindersSchedulesData["requestBody"]
  >["recommendation"],
) => {
  const defaults: Record<string, any> = {};

  recommendations?.forEach((rec) => {
    if (rec.hasInput && rec.inputKey) {
      defaults[rec.key] = {
        checked: true,
        [rec.inputKey]: rec.inputValue || "",
      };
    } else {
      defaults[rec.key] = true;
    }
  });

  return defaults;
};

const medicineConsumeSuggestionByKey = MEDICINE_CONSUME_SUGGESTIONS.reduce<
  Record<string, MedicineConsumeSuggestionType>
>((acc, val) => {
  acc[val.key] = val;
  return acc;
}, {});

export const getMedicineRecommendationCheckedList = (
  obj: { [x: string]: any } | undefined,
) => {
  return obj
    ? Object.entries(obj)
        .filter(([_, value]) => {
          if (value === undefined || value === false) return false;
          if (typeof value === "object" && value !== null) {
            return value.checked !== undefined && value.checked === true;
          }
          return true;
        })
        .map(([key, value]) => {
          const info = medicineConsumeSuggestionByKey[key];
          return {
            key: key,
            label: info.label,
            hasInput: !!info.hasInput,
            inputValue: !!info.hasInput
              ? value?.[info.inputKey as string] || ""
              : "",
            inputKey: info.inputKey,
            unit: info.unit,
          };
        })
    : [];
};

export const getMedicineSuggestionList = (
  obj: { [x: string]: any } | undefined,
) => {
  return obj
    ? Object.entries(obj)
        .filter(([_, value]) => {
          if (value === undefined || value === false) return false;
          if (typeof value === "object" && value !== null) {
            return value.checked !== undefined && value.checked === true;
          }
          return true;
        })
        .map(([key, value]) => {
          const info = medicineConsumeSuggestionByKey[key];
          if (info.hasInput) {
            return `${info.label} ${value?.[info.inputKey as string] || ""} ${
              info.unit
            }`;
          }
          return info.label;
        })
    : [];
};

// Validate input when user selects options that require a value (days, temperature, years)
const INPUT_SUGGESTION_KEYS = MEDICINE_CONSUME_SUGGESTIONS.filter(
  (
    s,
  ): s is (typeof MEDICINE_CONSUME_SUGGESTIONS)[number] & {
    hasInput: true;
    inputKey: string;
  } => !!s.hasInput && !!s.inputKey,
);

function validateSuggestionInput(value: string | undefined): {
  ok: boolean;
  message?: string;
} {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { ok: false, message: "กรุณากรอกข้อมูล" };
  const num = Number(trimmed);
  if (Number.isNaN(num)) return { ok: false, message: "กรุณากรอกเป็นตัวเลข" };
  return { ok: true };
}

// step 1: ชื่อยา, หน่วย, ข่้อแนะนำการใช้ยา, start-end วันแจ้งเตือน, enable noti
export const medicalReminderInfo = z
  .object({
    medicalName: z.string().nonempty("กรุณาระบุชื่อยา"),
    unit: z.enum(MEDICINE_UNIT_OPTIONS),
    usageSuggestion: z.object(suggestionsSchemaShape).optional(),
    startNotificationDate: z.date(),
    endNotificationDate: z.date(),
    consumeDays: z.string().optional(),
    enableNotification: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.endNotificationDate < data.startNotificationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น",
        path: ["endNotificationDate"],
      });
    }

    const usage = data.usageSuggestion;
    if (!usage) return;
    for (const sug of INPUT_SUGGESTION_KEYS) {
      const item = usage[sug.key];
      if (
        item &&
        typeof item === "object" &&
        (item as { checked?: boolean }).checked === true
      ) {
        const val = (item as Record<string, unknown>)[sug.inputKey];
        const str = typeof val === "string" ? val : "";
        const result = validateSuggestionInput(str);
        if (!result.ok) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: result.message ?? "กรุณากรอกข้อมูล",
            path: ["usageSuggestion", sug.key, sug.inputKey],
          });
        }
      }
    }
  });
export type MedicalReminderInfoValues = z.infer<typeof medicalReminderInfo>;

// step 2: ความถี่การใช้ยา
export const medicineRepeatSchema = z
  .object({
    repeatType: z.enum(REPEAT_TYPE_LIST),
    dayOfWeeks: z.array(z.enum(DAY_OF_WEEK_LIST)).optional(),
    dateInMonths: z.number().int().min(1).max(31).optional(),
    mealTiming: z.enum(MEAL_TIMING_LIST, {
      errorMap: () => ({ message: "กรุณาเลือกเวลาทานยา" }),
    }),
    dosePerTime: z
      .string()
      .nonempty("กรุณาระบุจำนวนยาที่ใช้ต่อครั้ง")
      .refine(
        (val) => {
          const num = Number(val);
          return !isNaN(num) && num > 0;
        },
        {
          message: "กรุณาระบุจำนวนยาเป็นตัวเลข",
        },
      ),
    mealPeriod: z
      .array(
        z.object({
          period: z.enum(MEAL_PERIOD_LIST, {
            errorMap: () => ({ message: "กรุณาเลือกเวลาทานยา" }),
          }),
          hour: z.string().nonempty("กรุณาระบุเวลา"),
          minute: z.string().nonempty("กรุณาระบุเวลา"),
        }),
      )
      .min(1, { message: "กรุณาเลือกอย่างน้อยหนึ่งช่วงเวลาในการทานยา" }),
  })
  .refine(
    (data) => {
      if (data.repeatType === "weekly") {
        return Array.isArray(data.dayOfWeeks) && data.dayOfWeeks.length > 0;
      }
      return true;
    },
    {
      message: "กรุณาเลือกวันในสัปดาห์",
      path: ["dayOfWeeks"],
    },
  )
  .refine(
    (data) => {
      if (data.repeatType === "monthly") {
        if (
          !data.dateInMonths ||
          data.dateInMonths < 1 ||
          data.dateInMonths > 31
        ) {
          return false;
        }
        return true;
      }
      return true;
    },
    {
      message: "กรุณาระบุวันที่ในเดือน (1-31)",
      path: ["dateInMonths"],
    },
  );
export type MedicineRepeatSchemaValues = z.infer<typeof medicineRepeatSchema>;
