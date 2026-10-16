"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { foodLabel } from "@/lib/catalog-presentation";
import FoodAmountInput, { useFoodAmount } from "./FoodAmountInput";
import DiaryAddForm from "./DiaryAddForm";
import {
  calculatePortion,
  formatMetric,
  type CatalogMeal,
} from "@/lib/portion";

const gramFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export default function MealCatalog({ meals, renderFavorite, disabled = false, onBusyChange }: {
  meals: CatalogMeal[]; renderFavorite?: (meal: CatalogMeal, saving: boolean) => ReactNode;
  disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);


  const dialog = useRef<HTMLDialogElement>(null);
  const meal = meals.find((item) => item.mealId === selectedMealId);
  useEffect(() => {
    if (meal && !dialog.current?.open) dialog.current?.showModal();
    if (!meal && dialog.current?.open) dialog.current.close();
  }, [meal]);

  return <>
    <div className="grid items-start gap-3 grid-cols-1 min-[460px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {meals.map((item) => {
        const label = foodLabel(item.mealName);
        return <article key={item.mealId} className="min-w-0 rounded-2xl border border-[#d9e4dc] bg-white p-4 shadow-sm">
          <h3 aria-label={item.mealName} className="text-sm font-semibold leading-5 break-words">{label.name}</h3>
          <p className="mt-1 text-xs leading-5 text-[#5b7166] break-words">{label.preparation || item.mealType || "Gıda"}</p>
          <p className="mt-3 text-sm"><strong>{formatMetric(item.nutrition?.caloriesKcal, "kcal")}</strong><span className="ml-1 text-xs text-[#698074]">/ 100 g</span></p>
          <button type="button" disabled={saving || disabled} aria-haspopup="dialog" onClick={() => {
            setSelectedMealId(item.mealId);
          }} className="mt-3 w-full rounded-lg bg-[#e5f3e9] px-2 py-2.5 text-xs font-semibold text-[#205942] hover:bg-[#d3ebda] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#277f64]">Seç ve miktar gir</button>
          {renderFavorite?.(item, saving)}
        </article>;
      })}
    </div>
    <dialog ref={dialog} aria-labelledby="food-detail-title" onCancel={(event) => {
      event.preventDefault(); if (!saving && !disabled) setSelectedMealId(null);
    }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-[#cce3d2] bg-[#f7f8f4] p-5 text-[#18312c] shadow-xl backdrop:bg-[#18312c]/40 sm:p-6">
      {meal && <div key={meal.mealId}>
        <button type="button" disabled={saving || disabled} onClick={() => setSelectedMealId(null)} className="float-right rounded-lg border border-[#b8d6c2] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">Kapat</button>
                <h2 id="food-detail-title" className="pr-16 text-xl font-semibold">{meal.mealName}</h2>
                <p className="mt-2 text-sm text-[#5b7166]">Kaynak değerleri 100 g içindir; gramajla yaklaşık değerler hesaplanır.</p>
                {meal.nutrition && <>
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div><dt>Protein / 100 g</dt><dd className="font-semibold">{formatMetric(meal.nutrition.proteinG, "g")}</dd></div>
                    <div><dt>Karbonhidrat / 100 g</dt><dd className="font-semibold">{formatMetric(meal.nutrition.carbsG, "g")}</dd></div>
                    <div><dt>Yağ / 100 g</dt><dd className="font-semibold">{formatMetric(meal.nutrition.fatG, "g")}</dd></div>
                  </dl>
                  <a href={meal.nutrition.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-medium text-[#246b53] underline">Gıdanın kaynağı: {meal.nutrition.source}</a>
                </>}
                <CatalogAmount key={meal.mealId} meal={meal} saving={saving} disabled={disabled} onBusyChange={(value) => { setSaving(value); onBusyChange?.(value); }} />
      </div>}
    </dialog>
  </>;
}

function CatalogAmount({ meal, saving, disabled, onBusyChange }: { meal: CatalogMeal; saving: boolean; disabled: boolean; onBusyChange: (busy: boolean) => void }) {
  const amount = useFoodAmount(meal.mealId);
  const grams = amount.value?.grams ?? null;
  const preview = grams === null ? null : calculatePortion(meal.nutrition ?? { caloriesKcal: null, proteinG: null, carbsG: null, fatG: null }, grams);
  return <><FoodAmountInput id={`food-${meal.mealId}`} amount={amount} disabled={saving || disabled} />
                {preview ? (
                  <div className="mt-5 border-t border-[#cce3d2] pt-4" aria-live="polite">
                    <p className="text-sm text-[#5b7166]">{gramFormatter.format(grams!)} g için yaklaşık değerler</p>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-[#5b7166]">Enerji</dt><dd className="mt-1 font-semibold">{formatMetric(preview.caloriesKcal, "kcal")}</dd></div>
                      <div><dt className="text-[#5b7166]">Protein</dt><dd className="mt-1 font-semibold">{formatMetric(preview.proteinG, "g")}</dd></div>
                      <div><dt className="text-[#5b7166]">Karbonhidrat</dt><dd className="mt-1 font-semibold">{formatMetric(preview.carbsG, "g")}</dd></div>
                      <div><dt className="text-[#5b7166]">Yağ</dt><dd className="mt-1 font-semibold">{formatMetric(preview.fatG, "g")}</dd></div>
                    </dl>
                    <p className="mt-4 text-xs text-[#5b7166]">Önizleme kayıt oluşturmaz. Kaydetmek için günlüğe ekleyin.</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-medium text-[#a33c35]" role="alert">
                    Geçerli bir miktar girin; gram karşılığı 0,01–10.000 g olmalı.
                  </p>
                )}
                <DiaryAddForm mealId={meal.mealId} amount={amount.value?.payload ?? null} disabled={disabled} onBusyChange={onBusyChange} />
</>;
}
