import type { AmountInput, PortionSnapshot } from "./food-amount.ts";
import type { NutritionValues } from "./portion.ts";

export const MEAL_SLOTS = [
  { value: "breakfast", label: "Kahvaltı" },
  { value: "lunch", label: "Öğle" },
  { value: "dinner", label: "Akşam" },
  { value: "snack", label: "Ara öğün" },
  { value: "other", label: "Diğer" },
] as const;
export type MealSlot = typeof MEAL_SLOTS[number]["value"];
export function isMealSlot(value: unknown): value is MealSlot {
  return MEAL_SLOTS.some((slot) => slot.value === value);
}
export type DiaryInput = { mealId: number; date: string; mealSlot?: MealSlot } & AmountInput;
export type DiaryUpdate = { date: string; mealSlot?: MealSlot } & (AmountInput | { grams?: never; portionId?: never; quantity?: never });
export type DiaryEntry = { mealId: number; grams: number; date: string; portion?: PortionSnapshot | null;
  source?: string | null; sourceId?: string | null; sourceUrl?: string | null;
  mealSlot: MealSlot; id: string; mealName: string; createdAtUtc: string;
  nutrition: NutritionValues & { approximate: boolean };
};
export type DiarySummary = NutritionValues & { entryCount: number };
export type DiaryMealSummary = { mealSlot: MealSlot; summary: DiarySummary };
export type DiaryDay = { date: string; timeZone: string; items: DiaryEntry[]; summary: DiarySummary; mealSummaries: DiaryMealSummary[] };

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

function validAmount(input: Record<string, unknown>, allowOmission: boolean) {
  const has = (key: string) => Object.hasOwn(input, key);
  if (!has("grams") && !has("portionId") && !has("quantity")) return allowOmission;
  if (has("grams")) return !has("portionId") && !has("quantity")
    && typeof input.grams === "number" && Number.isFinite(input.grams) && input.grams >= 0.01 && input.grams <= 10000
    && Number(input.grams.toFixed(2)) === input.grams;
  return typeof input.portionId === "number" && Number.isSafeInteger(input.portionId) && input.portionId > 0
    && typeof input.quantity === "number" && Number.isFinite(input.quantity) && input.quantity > 0;
}
export function isDiaryInput(value: unknown): value is DiaryInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  return Object.keys(input).every(key => ["mealId", "grams", "portionId", "quantity", "date", "mealSlot"].includes(key))
    && (!("mealSlot" in input) || isMealSlot(input.mealSlot))
    && typeof input.mealId === "number" && Number.isInteger(input.mealId) && input.mealId > 0 && input.mealId <= 2147483647
    && validAmount(input, false) && isDiaryDate(input.date);
}
export function isDiaryUpdate(value: unknown): value is DiaryUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  return Object.keys(input).every(key => ["grams", "portionId", "quantity", "date", "mealSlot"].includes(key))
    && (!("mealSlot" in input) || isMealSlot(input.mealSlot)) && isDiaryDate(input.date) && validAmount(input, true);
}

export function groupDiaryEntries(entries: DiaryEntry[]) {
  return MEAL_SLOTS.map((slot) => ({ ...slot, items: entries.filter((entry) => entry.mealSlot === slot.value) }))
    .filter((group) => group.items.length > 0);
}

export function groupDiaryDay(day: DiaryDay) {
  return groupDiaryEntries(day.items).map((group) => ({ ...group,
    summary: day.mealSummaries.find((item) => item.mealSlot === group.value)?.summary,
  }));
}
