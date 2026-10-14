"use client";

import { useState } from "react";
import {
  calculatePortion,
  formatMetric,
  parseGrams,
  type CatalogMeal,
} from "@/lib/portion";

const gramFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export default function MealCatalog({ meals }: { meals: CatalogMeal[] }) {
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [gramsInput, setGramsInput] = useState("100");
  const grams = parseGrams(gramsInput);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {meals.map((meal) => {
        const selected = selectedMealId === meal.mealId;
        const preview = selected && meal.nutrition && grams !== null
          ? calculatePortion(meal.nutrition, grams)
          : null;

        return (
          <article key={meal.mealId} className="rounded-2xl border border-[#d9e4dc] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#277f64]">{meal.mealType ?? "Gıda"}</p>
            <h3 className="mt-2 min-h-14 text-xl font-semibold">{meal.mealName}</h3>
            {meal.nutrition ? (
              <>
                <div className="mt-5 border-t border-[#e7eee8] pt-4">
                  <strong className="text-3xl">{formatMetric(meal.nutrition.caloriesKcal, "kcal")}</strong>
                  <span className="ml-2 text-sm text-[#698074]">/ {meal.nutrition.basisGrams} g</span>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-[#698074]">Protein</dt><dd className="mt-1 font-semibold">{formatMetric(meal.nutrition.proteinG, "g")}</dd></div>
                  <div><dt className="text-[#698074]">Karbonhidrat</dt><dd className="mt-1 font-semibold">{formatMetric(meal.nutrition.carbsG, "g")}</dd></div>
                  <div><dt className="text-[#698074]">Yağ</dt><dd className="mt-1 font-semibold">{formatMetric(meal.nutrition.fatG, "g")}</dd></div>
                </dl>
                <a href={meal.nutrition.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm font-medium text-[#246b53] underline underline-offset-4">
                  Kaynak: {meal.nutrition.source}
                </a>
                <button
                  type="button"
                  aria-expanded={selected}
                  onClick={() => {
                    setSelectedMealId(selected ? null : meal.mealId);
                    setGramsInput("100");
                  }}
                  className="mt-5 block w-full rounded-xl bg-[#e5f3e9] px-4 py-3 text-sm font-semibold text-[#205942] hover:bg-[#d3ebda] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#277f64]"
                >
                  {selected ? "Önizlemeyi kapat" : "Gramaja göre hesapla"}
                </button>
                {selected && (
                  <div className="mt-5 rounded-xl border border-[#cce3d2] bg-[#f4faf5] p-4">
                    <h4 className="font-semibold">{meal.mealName} için önizleme</h4>
                    <label htmlFor={`grams-${meal.mealId}`} className="mt-4 block text-sm font-medium">Gramaj (g)</label>
                    <input
                      id={`grams-${meal.mealId}`}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      maxLength={10}
                      value={gramsInput}
                      onChange={(event) => setGramsInput(event.target.value)}
                      aria-invalid={grams === null}
                      aria-describedby={`grams-help-${meal.mealId}`}
                      className="mt-2 w-full rounded-lg border border-[#b8d6c2] bg-white px-3 py-2 text-[#18312c] outline-none focus:ring-2 focus:ring-[#277f64]"
                    />
                    <p id={`grams-help-${meal.mealId}`} className="mt-2 text-xs text-[#5b7166]">
                      0&apos;dan büyük, en fazla 10.000 g. Virgül kullanabilirsiniz.
                    </p>
                    {preview ? (
                      <div className="mt-5 border-t border-[#cce3d2] pt-4" aria-live="polite">
                        <p className="text-sm text-[#5b7166]">{gramFormatter.format(grams!)} g için yaklaşık değerler</p>
                        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div><dt className="text-[#5b7166]">Enerji</dt><dd className="mt-1 font-semibold">{formatMetric(preview.caloriesKcal, "kcal")}</dd></div>
                          <div><dt className="text-[#5b7166]">Protein</dt><dd className="mt-1 font-semibold">{formatMetric(preview.proteinG, "g")}</dd></div>
                          <div><dt className="text-[#5b7166]">Karbonhidrat</dt><dd className="mt-1 font-semibold">{formatMetric(preview.carbsG, "g")}</dd></div>
                          <div><dt className="text-[#5b7166]">Yağ</dt><dd className="mt-1 font-semibold">{formatMetric(preview.fatG, "g")}</dd></div>
                        </dl>
                        <p className="mt-4 text-xs text-[#5b7166]">Bu yalnızca bir önizlemedir; kayıt oluşturulmaz.</p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm font-medium text-[#a33c35]" role="alert">
                        Geçerli bir gramaj girin (en fazla iki ondalık basamak).
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-5 border-t border-[#e7eee8] pt-4 text-sm text-[#698074]">Besin değeri henüz eklenmedi.</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
