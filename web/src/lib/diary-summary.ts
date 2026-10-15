import type { DiarySummary } from "./diary.ts";
import { formatMetric } from "./portion.ts";

export function summaryMetrics(summary: DiarySummary) {
  return [
    { label: "Kalori", value: summary.caloriesKcal, unit: "kcal" as const },
    { label: "Protein", value: summary.proteinG, unit: "g" as const },
    { label: "Karbonhidrat", value: summary.carbsG, unit: "g" as const },
    { label: "Yağ", value: summary.fatG, unit: "g" as const },
  ].map(({ label, value, unit }) => ({ label, text: value === null ? "Eksik veri" : formatMetric(value, unit) }));
}
