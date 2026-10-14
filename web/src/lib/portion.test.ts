import assert from "node:assert/strict";
import test from "node:test";
import { calculatePortion, formatMetric, parseGrams } from "./portion.ts";

test("Türkçe virgüllü ve noktalı geçerli gramajı kabul eder", () => {
  assert.equal(parseGrams("150"), 150);
  assert.equal(parseGrams(" 125,5 "), 125.5);
  assert.equal(parseGrams("0.01"), 0.01);
  assert.equal(parseGrams("10000"), 10_000);
});

test("boş, sıfır, negatif, belirsiz ve aşırı büyük gramajı reddeder", () => {
  for (const input of ["", "0", "-5", "abc", "1e3", "12,345", "1.000", "10000,01", "Infinity"]) {
    assert.equal(parseGrams(input), null, input);
  }
});

test("100 g değerlerini seçilen gramaj oranıyla hesaplar", () => {
  const result = calculatePortion(
    { caloriesKcal: 143, proteinG: 12.6, carbsG: 0.72, fatG: 9.51 },
    150,
  );
  assert.ok(result);
  assert.equal(result.caloriesKcal, 214.5);
  assert.equal(result.proteinG, 18.9);
  assert.ok(Math.abs(result.carbsG! - 1.08) < 1e-10);
  assert.ok(Math.abs(result.fatG! - 14.265) < 1e-10);
});

test("eksik değerleri eksik bırakır, gerçek sıfırı korur", () => {
  assert.deepEqual(
    calculatePortion(
      { caloriesKcal: null, proteinG: 0, carbsG: null, fatG: 2 },
      50,
    ),
    { caloriesKcal: null, proteinG: 0, carbsG: null, fatG: 1 },
  );
});

test("eksik değeri sayı gibi göstermez ve sonucu Türkçe biçimlendirir", () => {
  assert.equal(formatMetric(null, "kcal"), "Veri yok");
  assert.equal(formatMetric(undefined, "g"), "Veri yok");
  assert.equal(formatMetric(Number.NaN, "g"), "Veri yok");
  assert.equal(formatMetric(0, "g"), "0 g");
  assert.equal(formatMetric(12.5, "g"), "12,5 g");
});

test("hesaplama fonksiyonu da geçersiz gramajı reddeder", () => {
  const values = { caloriesKcal: 100, proteinG: 2, carbsG: 3, fatG: 4 };
  for (const grams of [0, -1, 10_001, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(calculatePortion(values, grams), null);
  }
});
