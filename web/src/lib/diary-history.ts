import { isDiaryDate, type DiarySummary } from "./diary.ts";

export type DiaryHistory = {
  startDate: string; endDate: string; timeZone: string;
  days: { date: string; summary: DiarySummary }[];
};
export function isHistoryEnd(value: unknown): value is string {
  return isDiaryDate(value) && value >= "0001-01-07";
}
export function shiftHistoryEnd(end: string, days: number): string | null {
  if (!isHistoryEnd(end)) return null;
  const date = new Date(`${end}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  const value = date.toISOString().slice(0, 10);
  return isHistoryEnd(value) ? value : null;
}
export function historyDateLabel(date: string): string {
  return date.split("-").reverse().join(".");
}
