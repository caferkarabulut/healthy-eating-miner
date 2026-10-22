import type { DiaryDay, Entry } from "../src/api/diary";
export const entry: Entry = { id: "e1", mealId: 1, mealName: "Yumurta (çiğ)", grams: 66, date: "2026-10-22", mealSlot: "breakfast", nutrition: { caloriesKcal: 94.38, proteinG: 8.2896, carbsG: 0, fatG: null }, portion: { measureName: "Orta adet", quantity: 1.5 } };
const summary = { entryCount: 1, ...entry.nutrition };
export const day: DiaryDay = { date: entry.date, timeZone: "Europe/Istanbul", items: [entry], summary, mealSummaries: ["breakfast", "lunch", "dinner", "snack", "other"].map(mealSlot => ({ mealSlot: mealSlot as Entry["mealSlot"], summary: mealSlot === "breakfast" ? summary : { entryCount: 0, caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 } })) };
