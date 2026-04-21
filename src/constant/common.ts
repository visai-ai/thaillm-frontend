export const THAI_WEEK_DAYS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
] as const;

export const DAY_OF_WEEK: Record<string, string> = {
  sunday: "อาทิตย์",
  monday: "จันทร์",
  tuesday: "อังคาร",
  wednesday: "พุธ",
  thursday: "พฤหัสบดี",
  friday: "ศุกร์",
  saturday: "เสาร์",
};
export type DayOfWeek = keyof typeof DAY_OF_WEEK;
export const DAY_OF_WEEK_LIST = Object.keys(DAY_OF_WEEK) as [
  DayOfWeek,
  ...DayOfWeek[],
];

export const PADDING_X_LAYOUT = "xl:px-8 md:px-6 px-4";

export const GENDER_LIST = ["ชาย", "หญิง"] as const;
