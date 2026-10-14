export type NutritionValues = {
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type Nutrition = NutritionValues & {
  basisGrams: number;
  source: string;
  sourceUrl: string;
};

export type CatalogMeal = {
  mealId: number;
  mealName: string;
  mealType: string | null;
  nutrition: Nutrition | null;
};

export const MAX_PORTION_GRAMS = 10_000;
const kcalFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });
const gramFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export function formatMetric(value: number | null | undefined, unit: "kcal" | "g"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Veri yok";
  const formatter = unit === "kcal" ? kcalFormatter : gramFormatter;
  return `${formatter.format(value)} ${unit}`;
}

export function parseGrams(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(trimmed)) return null;

  const grams = Number(trimmed.replace(",", "."));
  return Number.isFinite(grams) && grams > 0 && grams <= MAX_PORTION_GRAMS
    ? grams
    : null;
}

export function calculatePortion(
  nutrition: NutritionValues,
  grams: number,
): NutritionValues | null {
  if (!Number.isFinite(grams) || grams <= 0 || grams > MAX_PORTION_GRAMS) {
    return null;
  }

  const ratio = grams / 100;
  const scale = (value: number | null): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value * ratio : null;

  return {
    caloriesKcal: scale(nutrition.caloriesKcal),
    proteinG: scale(nutrition.proteinG),
    carbsG: scale(nutrition.carbsG),
    fatG: scale(nutrition.fatG),
  };
}
