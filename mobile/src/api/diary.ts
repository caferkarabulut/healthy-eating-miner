import { getJson } from "./catalog.ts";
import { AuthError, type SessionClient } from "../auth/session.ts";
export const MEAL_SLOTS = [
  { value: "breakfast", label: "Kahvaltı" }, { value: "lunch", label: "Öğle" },
  { value: "dinner", label: "Akşam" }, { value: "snack", label: "Ara öğün" }, { value: "other", label: "Diğer" },
] as const;
export type MealSlot = typeof MEAL_SLOTS[number]["value"];
export type Nutrients = { caloriesKcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null };
export type Summary = Nutrients & { entryCount: number };
export type Portion = { id: number; mealId: number; measureName: string; gramsPerUnit: number; approximate: boolean; source: string; sourceUrl: string };
export type Entry = { id: string; mealId: number; mealName: string; grams: number; date: string; mealSlot: MealSlot; nutrition: Nutrients; portion: { measureName: string; quantity: number } | null };
export type DiaryDay = { date: string; timeZone: string; items: Entry[]; summary: Summary; mealSummaries: { mealSlot: MealSlot; summary: Summary }[] };
export type DiaryInput = { mealId: number; date: string; mealSlot: MealSlot } & ({ grams: number; portionId?: never; quantity?: never } | { portionId: number; quantity: number; grams?: never });
export function istanbulDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find(p => p.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function isDiaryDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function moveDay(value: string, offset: number) {
  if (!isDiaryDate(value)) return value;
  const d = new Date(`${value}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + offset);
  const result = d.toISOString().slice(0, 10); return isDiaryDate(result) ? result : value;
}
export function parseAmount(value: string, grams: boolean): number | null {
  if (!(grams ? /^\d+(?:[.,]\d{1,2})?$/ : /^\d+(?:[.,]\d+)?$/).test(value.trim())) return null;
  const number = Number(value.trim().replace(",", "."));
  return Number.isFinite(number) && number > 0 && (!grams || number >= 0.01 && number <= 10000) ? number : null;
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const nutrients = (v: unknown): v is Nutrients => object(v) && ["caloriesKcal", "proteinG", "carbsG", "fatG"].every(k => v[k] === null || typeof v[k] === "number" && Number.isFinite(v[k]) && Number(v[k]) >= 0);
const summary = (v: unknown): v is Summary => nutrients(v) && "entryCount" in v && Number.isSafeInteger(v.entryCount) && Number(v.entryCount) >= 0;
export function isEntry(v: unknown): v is Entry {
  return object(v) && typeof v.id === "string" && Number.isInteger(v.mealId) && typeof v.mealName === "string" && typeof v.grams === "number" && Number.isFinite(v.grams) && v.grams > 0 && typeof v.date === "string" && isDiaryDate(v.date) && MEAL_SLOTS.some(s => s.value === v.mealSlot) && nutrients(v.nutrition)
    && (v.portion === null || object(v.portion) && typeof v.portion.measureName === "string" && typeof v.portion.quantity === "number" && Number.isFinite(v.portion.quantity) && v.portion.quantity > 0);
}
export async function loadDiary(client: SessionClient, date: string): Promise<DiaryDay> {
  if (!isDiaryDate(date)) throw new Error("Günü YYYY-AA-GG biçiminde girin.");
  const v = await client.authorizedJson(`/me/diary-entries?date=${date}`);
  if (!object(v) || v.date !== date || v.timeZone !== "Europe/Istanbul" || !Array.isArray(v.items) || !v.items.every(e => isEntry(e) && e.date === date) || !summary(v.summary) || !Array.isArray(v.mealSummaries)
    || v.mealSummaries.length !== MEAL_SLOTS.length || !MEAL_SLOTS.every(s => (v.mealSummaries as unknown[]).filter((m: unknown) => object(m) && m.mealSlot === s.value && summary(m.summary)).length === 1)) throw new Error("Günlük yanıtı okunamadı. Yeniden deneyin.");
  return v as DiaryDay;
}
export class UncertainDiaryError extends Error {}
export async function addEntry(client: SessionClient, input: DiaryInput): Promise<Entry> {
  try {
    const v = await client.authorizedJson("/me/diary-entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    if (!isEntry(v)) throw new UncertainDiaryError();
    return v;
  } catch (error) {
    if (error instanceof AuthError && ["invalid", "cancelled"].includes(error.kind)) throw error;
    if (error instanceof AuthError && error.status !== undefined && error.status >= 400 && error.status < 500) throw error;
    throw new UncertainDiaryError("Kayıt eklenmiş olabilir. Tekrar göndermeden önce seçilen günün günlüğünü kontrol edin.");
  }
}
export async function loadPortions(base: string | undefined, mealId: number, signal: AbortSignal): Promise<Portion[]> {
  const v = await getJson(base, `/meals/${mealId}/portions`, signal);
  if (!object(v) || v.mealId !== mealId || !Array.isArray(v.items) || !v.items.every(p => object(p) && Number.isInteger(p.id) && p.mealId === mealId && typeof p.measureName === "string" && typeof p.gramsPerUnit === "number" && Number.isFinite(p.gramsPerUnit) && p.gramsPerUnit > 0 && p.approximate === true && typeof p.source === "string" && typeof p.sourceUrl === "string")) throw new Error("Ölçüler alınamadı; gramla devam edebilirsiniz.");
  return v.items as Portion[];
}
