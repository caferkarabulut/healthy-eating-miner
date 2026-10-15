import type { NutritionValues } from "./portion.ts";

export type DiaryInput = { mealId: number; grams: number; date: string };
export type DiaryEntry = DiaryInput & {
  id: string; mealName: string; createdAtUtc: string;
  nutrition: NutritionValues & { approximate: boolean };
};
export type DiaryDay = { date: string; timeZone: string; items: DiaryEntry[] };

export function istanbulDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function isDiaryDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isDiaryInput(value: unknown): value is DiaryInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return Object.keys(input).every((key) => ["mealId", "grams", "date"].includes(key))
    && typeof input.mealId === "number" && Number.isInteger(input.mealId) && input.mealId > 0 && input.mealId <= 2147483647
    && typeof input.grams === "number" && Number.isFinite(input.grams) && input.grams >= 0.01 && input.grams <= 10000
    && Number(input.grams.toFixed(2)) === input.grams && isDiaryDate(input.date);
}
