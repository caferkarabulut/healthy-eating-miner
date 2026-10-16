import assert from "node:assert/strict";
import test from "node:test";
import { amountValue, normalizePortionGrams, parseQuantity, amountLabel, snapshotPortion, type FoodPortion } from "./food-amount.ts";
import { isDiaryInput, isDiaryUpdate } from "./diary.ts";
const p: FoodPortion = { id: 11, mealId: 1, measureName: "Orta adet", amount: 0.5, gramWeight: 22, gramsPerUnit: 44,
  approximate: true, source: "USDA", sourceFoodId: "171287", sourceId: "88378", sourceDescription: "medium", sourceUrl: "https://example.test" };
test("Turkish fractional units normalize source totals and keep gram fallback", () => {
  assert.equal(parseQuantity("1,5"), 1.5);
  assert.deepEqual(amountValue("11", "1,5", [p]), { payload: { portionId: 11, quantity: 1.5 }, grams: 66 });
  assert.deepEqual(amountValue("grams", "150,25", []), { payload: { grams: 150.25 }, grams: 150.25 });
  assert.equal(amountValue("11", "1", []), null);
  for (const value of ["", "0", "-1", "1/2", "1,2.3", "NaN"]) assert.equal(parseQuantity(value), null);
  assert.equal(normalizePortionGrams(1, 1.005, 1), 1.01);
  assert.equal(normalizePortionGrams(0.005, 1, 1), 0.01);
  assert.equal(normalizePortionGrams(0.004, 1, 1), null);
  assert.equal(normalizePortionGrams(10000.01, 1, 1), null);
});
test("API input accepts exactly one amount mode; date-only editing preserves the stored copy", () => {
  const base = { mealId: 1, date: "2026-10-16" };
  assert.equal(isDiaryInput({ ...base, portionId: 11, quantity: 1.5 }), true);
  assert.equal(isDiaryUpdate({ date: base.date, mealSlot: "lunch" }), true);
  assert.equal(isDiaryInput(base), false);
  for (const bad of [{ grams: 1, portionId: 11, quantity: 1 }, { quantity: 1 }, { portionId: 11 }, { portionId: 11, quantity: 0 }, { grams: null }, { portionId: null, quantity: 1 }, { portionId: 11, quantity: 1, gramWeight: 44 }]) {
    assert.equal(isDiaryInput({ ...base, ...bad }), false);
    assert.equal(isDiaryUpdate({ date: base.date, ...bad }), false);
  }
});
test("stored measure displays its own ratio, amount, and size independently of live values", () => {
  const snapshot = { portionId: 11, quantity: 2, measureName: "Orta adet", sourceAmount: 0.5, sourceGramWeight: 22,
    source: p.source, sourceFoodId: p.sourceFoodId, sourceId: p.sourceId, sourceDescription: p.sourceDescription, sourceUrl: p.sourceUrl };
  assert.equal(amountLabel(88, snapshot), "2 Orta adet ≈ 88 g");
  assert.equal(snapshotPortion(snapshot, 1).gramsPerUnit, 44);
  assert.equal(amountLabel(150.25, null), "150,25 g");
});

test("edit nutrition preview scales the stored copy, preserving missing values and zero", async () => {
  const { nutritionForAmount } = await import("./food-amount.ts");
  assert.deepEqual(nutritionForAmount({ caloriesKcal: 60, proteinG: null, carbsG: 0, fatG: 2 }, 50, 75), { caloriesKcal: 90, proteinG: null, carbsG: 0, fatG: 3 });
});
