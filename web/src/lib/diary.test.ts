import assert from "node:assert/strict";
import test from "node:test";
import { isDiaryDate, isDiaryInput, istanbulDay } from "./diary.ts";
import { parseGrams } from "./portion.ts";

test("Istanbul day changes at 21:00 UTC, including month/year boundaries", () => {
  assert.equal(istanbulDay(new Date("2026-10-15T20:59:59.999Z")), "2026-10-15");
  assert.equal(istanbulDay(new Date("2026-10-15T21:00:00.000Z")), "2026-10-16");
  assert.equal(istanbulDay(new Date("2026-12-31T21:00:00Z")), "2027-01-01");
  assert.equal(istanbulDay(new Date("2028-02-28T21:00:00Z")), "2028-02-29");
});

test("Turkish grams become a JSON number within API precision limits", () => {
  for (const input of ["150,25", "0,01", "0,29", "10000", "1.10"]) {
    const grams = parseGrams(input);
    assert.ok(isDiaryInput({ mealId: 1, grams, date: "2026-10-15" }));
    assert.equal(typeof JSON.parse(JSON.stringify({ grams })).grams, "number");
  }
  for (const grams of ["150,25", 1.234, 0, -1, 10000.01, NaN, Infinity]) {
    assert.equal(isDiaryInput({ mealId: 1, grams, date: "2026-10-15" }), false);
  }
  assert.equal(parseGrams("1,234"), null);
  assert.equal(isDiaryInput({ mealId: 1, grams: 100, date: "2026-10-15", userId: "other" }), false);
});

test("dates are strict calendar days, without timestamp conversion", () => {
  assert.equal(isDiaryDate("2028-02-29"), true);
  for (const date of ["2026-02-29", "2026-02-30", "2026-1-01", "0000-01-01", "2026-10-15T21:00:00Z", "15.10.2026", null]) {
    assert.equal(isDiaryDate(date), false);
  }
});
