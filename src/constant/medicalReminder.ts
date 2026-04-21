import { PostMedicalRemindersSchedulesData } from "@/@types/backend-api";

type PostMedicalRemindersSchedulesDataBody =
  PostMedicalRemindersSchedulesData["requestBody"];

export const MEDICINE_UNIT_OPTIONS = ["เม็ด", "น้ำ"] as const;
export type MedicineUnitType = (typeof MEDICINE_UNIT_OPTIONS)[number];

export type MedicineConsumeSuggestionType = {
  key: string;
  label: string;
  hasInput?: boolean;
  inputKey?: string;
  unit?: string;
};

export const MEDICINE_CONSUME_SUGGESTIONS: MedicineConsumeSuggestionType[] = [
  { key: "finishAllDoses", label: "ควรรับประทานให้หมด" },
  { key: "notForPregnancy", label: "ห้ามใช้ในหญิงตั้งครรภ์หรือให้นมบุตร" },
  { key: "externalUseOnly", label: "ใช้ภายนอกเท่านั้น ห้ามรับประทาน" },
  { key: "shakeBeforeUse", label: "เขย่าขวดก่อนใช้" },
  { key: "avoidAlcohol", label: "ห้ามใช้ร่วมกับแอลกอฮอล์" },
  { key: "discardIfExpired", label: "ห้ามใช้ถ้ายาเปลี่ยนสีหรือหมดอายุ" },
  {
    key: "intervalWithOtherMed",
    label: "ต้องเว้นระยะห่างจากยาชนิดอื่นอย่างน้อย 2 ชั่วโมง",
  },
  { key: "dissolveBeforeUse", label: "ละลายน้ำก่อนใช้" },
  { key: "mayCauseDrowsiness", label: "อาจทำให้ง่วงซึม" },
  { key: "doNotShare", label: "ห้ามแบ่ง บด หรือเคี้ยวยานี้" },
  { key: "useAsDirected", label: "ใช้ตามแพทย์สั่งเท่านั้น" },

  {
    key: "consultBeforeExceeding",
    label: "ห้ามใช้ต่อเนื่องเกิน",
    hasInput: true,
    inputKey: "days",
    unit: "วันโดยไม่ปรึกษาแพทย์",
  },
  {
    key: "storeBelowTemp",
    label: "เก็บที่อุณหภูมิไม่เกิน",
    hasInput: true,
    inputKey: "temperature",
    unit: "°C และให้พ้นแสงแดด",
  },
  {
    key: "notForChildrenBelowAge",
    label: "ห้ามใช้ในเด็กอายุต่ำกว่า",
    hasInput: true,
    inputKey: "years",
    unit: "ปี",
  },

  {
    key: "stopIfAllergic",
    label: "หากมีผื่น คัน หายใจลำบาก ให้หยุดใช้และพบแพทย์ทันที",
  },
  { key: "useImmediatelyAfterMix", label: "ใช้ทันทีหลังผสม" },
] as const;

export const REPEAT_TYPE = {
  does_not_repeat: "ไม่เตือนซ้ำ",
  daily: "ทุกวัน",
  weekly: "ทุกสัปดาห์",
  monthly: "ทุกเดือน",
} as const;
export type RepeatTypeKey = keyof typeof REPEAT_TYPE;
export const REPEAT_TYPE_LIST = Object.keys(REPEAT_TYPE) as [
  RepeatTypeKey,
  ...RepeatTypeKey[],
];

export const MEAL_PERIOD = {
  breakfast: "อาหารเช้า",
  lunch: "อาหารกลางวัน",
  dinner: "อาหารเย็น",
  bedtime: "ก่อนนอน",
} as const;
export type MealPeriodKey = keyof typeof MEAL_PERIOD;
export const MEAL_PERIOD_LIST = Object.keys(MEAL_PERIOD) as [
  MealPeriodKey,
  ...MealPeriodKey[],
];

export const MEAL_TIMING = {
  before_meal: "ก่อนอาหาร",
  with_meal: "พร้อมมื้ออาหาร",
  after_meal: "หลังอาหาร",
};
export type MealTimingKey = keyof typeof MEAL_TIMING;
export const MEAL_TIMING_LIST = Object.keys(MEAL_TIMING) as [
  MealTimingKey,
  ...MealTimingKey[],
];
