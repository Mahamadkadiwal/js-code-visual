import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

let _idCounter = 0;
export function uniqueId(prefix = "id"): string {
  return `${prefix}_${++_idCounter}`;
}

export function resetIdCounter() {
  _idCounter = 0;
}
