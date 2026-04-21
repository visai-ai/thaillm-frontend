import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };

// format date to thai date ex.) 30 มิ.ย. 2568 17:00
export const formatThaiDate = (
  time: Date,
  props?: Intl.DateTimeFormatOptions,
) => {
  if (!time) return time;
  return time.toLocaleString("th-TH", {
    ...(props || { dateStyle: "medium" }),
  });
};

// format date to thai date ex.) 30 มิ.ย. 2568 17:00
export const formatThaiDateWithTime = (time: Date) => {
  if (!time) return time;
  return time.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const formatTime = (time: Date) => {
  if (!time) return time;
  return time.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    second: "2-digit",
  });
};

// check is date1 is the same day as date2
export const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// format from "1" to "01"
export const formatTwoDigit = <T extends { toString(): string }>(
  index: T,
): string => {
  return index.toString().padStart(2, "0");
};

// format date by toLocaleDateString. default locale is "en-CA": YYYY-MM-DD
export const formatLocaleDate = (date: Date, locale = "en-CA") => {
  return date.toLocaleDateString(locale);
};
