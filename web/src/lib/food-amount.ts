import { parseGrams, MAX_PORTION_GRAMS } from "./portion.ts";

export type FoodPortion = { id: number; mealId: number; measureName: string; amount: number; gramWeight: number;
  gramsPerUnit: number; approximate: boolean; source: string; sourceFoodId: string; sourceId: string; sourceDescription: string; sourceUrl: string };
export type PortionSnapshot = { portionId: number; quantity: number; measureName: string; sourceAmount: number;
  sourceGramWeight: number; source: string; sourceFoodId: string; sourceId: string; sourceDescription: string; sourceUrl: string };
export type AmountInput = { grams: number; portionId?: never; quantity?: never } | { grams?: never; portionId: number; quantity: number };
export function parseQuantity(input: string): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(input.trim())) return null;
  const n = Number(input.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}
export function normalizePortionGrams(quantity: number, weight: number, amount: number): number | null {
  if (![quantity, weight, amount].every(n => Number.isFinite(n) && n > 0)) return null;
  // Positive midpoint rounds away from zero, matching the API; server remains authoritative.
  const raw = quantity * weight / amount;
  const grams = Math.round((raw + Number.EPSILON * Math.abs(raw)) * 100) / 100;
  return grams >= 0.01 && grams <= MAX_PORTION_GRAMS ? grams : null;
}
export function amountValue(unit: string, input: string, portions: FoodPortion[]): { payload: AmountInput; grams: number } | null {
  if (unit === "grams") { const grams = parseGrams(input); return grams === null ? null : { payload: { grams }, grams }; }
  const portion = portions.find(p => String(p.id) === unit);
  const quantity = parseQuantity(input);
  if (!portion || quantity === null) return null;
  const grams = normalizePortionGrams(quantity, portion.gramWeight, portion.amount);
  return grams === null ? null : { payload: { portionId: portion.id, quantity }, grams };
}
export function snapshotPortion(s: PortionSnapshot, mealId: number): FoodPortion {
  return { ...s, id: s.portionId, mealId, amount: s.sourceAmount, gramWeight: s.sourceGramWeight,
    gramsPerUnit: s.sourceGramWeight / s.sourceAmount, approximate: true };
}
export function amountLabel(grams: number, portion?: PortionSnapshot | null): string {
  const f = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 8 });
  return portion ? `${f.format(portion.quantity)} ${portion.measureName} ≈ ${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(grams)} g` : `${f.format(grams)} g`;
}

export function nutritionForAmount(values: import("./portion.ts").NutritionValues, originalGrams: number, grams: number) {
  const scale = (n: number | null) => typeof n === "number" && Number.isFinite(n) ? n * grams / originalGrams : null;
  return { caloriesKcal: scale(values.caloriesKcal), proteinG: scale(values.proteinG), carbsG: scale(values.carbsG), fatG: scale(values.fatG) };
}
