import assert from "node:assert/strict";
import test from "node:test";
import { groupDiaryDay, type DiaryDay, type DiaryEntry } from "./diary.ts";
import { summaryMetrics } from "./diary-summary.ts";
const summary = { entryCount: 1, caloriesKcal: 100.1234, proteinG: null, carbsG: 0, fatG: 2 };
const entry = (id: string, mealSlot: DiaryEntry["mealSlot"]) => ({ id, mealSlot } as DiaryEntry);
test("meal groups retain slot and entry ordering and use API totals independently", () => {
  const day: DiaryDay = { date: "2026-10-16", timeZone: "Europe/Istanbul", items: [entry("d", "dinner"), entry("b1", "breakfast"), entry("b2", "breakfast")],
    summary, mealSummaries: [{ mealSlot: "dinner", summary }, { mealSlot: "breakfast", summary: { ...summary, entryCount: 2, proteinG: 8 } }] };
  const groups = groupDiaryDay(day);
  assert.deepEqual(groups.map(x => x.value), ["breakfast", "dinner"]);
  assert.deepEqual(groups[0].items.map(x => x.id), ["b1", "b2"]);
  assert.equal(groups[1].summary, summary);
  assert.equal(summaryMetrics(groups[1].summary!)[1].text, "Eksik veri");
  assert.equal(summaryMetrics(groups[0].summary!)[1].text, "8 g");
  assert.equal(summaryMetrics(groups[1].summary!)[2].text, "0 g");
  assert.deepEqual(groupDiaryDay({ ...day, items: [] }), []);
});
