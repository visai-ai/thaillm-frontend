import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// waiting for (ms) milliseconds
export const wait = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
