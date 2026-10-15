import assert from "node:assert/strict";
import test from "node:test";
import { summaryMetrics } from "./diary-summary.ts";

test("API totals are displayed in Turkish, with presentation rounding only", () => {
  const summary = { entryCount: 2, caloriesKcal: 196.779209, proteinG: 3.093024, carbsG: 4.409559, fatG: 0.83325 };
  assert.deepEqual(summaryMetrics(summary), [
    { label: "Kalori", text: "196,8 kcal" }, { label: "Protein", text: "3,09 g" },
    { label: "Karbonhidrat", text: "4,41 g" }, { label: "Yağ", text: "0,83 g" },
  ]);
  assert.equal(summary.caloriesKcal, 196.779209);
});

test("missing totals say Eksik veri independently; known zero and empty-day totals stay numeric", () => {
  assert.deepEqual(summaryMetrics({ entryCount: 2, caloriesKcal: null, proteinG: 0, carbsG: 10, fatG: null }), [
    { label: "Kalori", text: "Eksik veri" }, { label: "Protein", text: "0 g" },
    { label: "Karbonhidrat", text: "10 g" }, { label: "Yağ", text: "Eksik veri" },
  ]);
  assert.deepEqual(summaryMetrics({ entryCount: 0, caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }).map((x) => x.text), ["0 kcal", "0 g", "0 g", "0 g"]);
});
