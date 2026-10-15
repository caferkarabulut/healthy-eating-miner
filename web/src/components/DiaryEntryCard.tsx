"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { DiaryEntry } from "@/lib/diary";
import { foodLabel } from "@/lib/catalog-presentation";
import MealSlotSelect from "./MealSlotSelect";
import { isDiaryDate } from "@/lib/diary";
import { changeDiaryEntry, DiaryError } from "@/lib/diary-client";
import { formatMetric, parseGrams } from "@/lib/portion";

const grams = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export default function DiaryEntryCard({ entry, onBusyChange, onEditingChange, onSaved, disabled }: {
  entry: DiaryEntry; disabled: boolean; onBusyChange: (busy: boolean) => void;
  onEditingChange: (editing: boolean) => void; onSaved: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const label = foodLabel(entry.mealName);
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [gramsInput, setGramsInput] = useState(String(entry.grams).replace(".", ","));
  const [date, setDate] = useState(entry.date);
  const [mealSlot, setMealSlot] = useState(entry.mealSlot);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<DiaryError | null>(null);
  const value = parseGrams(gramsInput);
  const locked = disabled || busy || Boolean(error?.uncertain) || error?.status === 401;

  async function submit() {
    if (pending.current || locked || mode === "view" || (mode === "edit" && (value === null || !isDiaryDate(date)))) return;
    pending.current = true;
    setBusy(true); onBusyChange(true); setError(null);
    try {
      await changeDiaryEntry(entry.id, mode === "delete" ? null : { grams: value!, date, mealSlot });
      onSaved(mode === "delete" ? "Kayıt silindi." : `Kayıt güncellendi. Kayıt tarihi: ${date.split("-").reverse().join(".")}.`);
    } catch (reason) {
      setError(reason instanceof DiaryError ? reason : new DiaryError("Değişiklik tamamlanamadı."));
    } finally { pending.current = false; setBusy(false); onBusyChange(false); }
  }

  return (
    <article aria-label={entry.mealName}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold">{label.name}</h3>
          {label.preparation && <p className="mt-0.5 break-words text-xs text-[#5b7166]">{label.preparation}</p>}
        </div>
        <p className="whitespace-nowrap text-sm text-[#5b7166]">{grams.format(entry.grams)} g</p>
        <p className="whitespace-nowrap text-sm font-semibold">{formatMetric(entry.nutrition.caloriesKcal, "kcal")}</p>
      </div>
      {mode === "view" ? (
        <div className="mt-2 flex flex-wrap gap-4 text-xs">
          <button type="button" disabled={locked} aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="font-semibold underline">{expanded ? "Ayrıntıları kapat" : "Ayrıntılar"}</button>
          <button type="button" disabled={locked} onClick={() => { setMode("edit"); onEditingChange(true); }} className="font-semibold underline">Düzenle</button>
          <button type="button" disabled={locked} onClick={() => { setMode("delete"); onEditingChange(true); }} className="font-semibold text-[#a33c35] underline">Sil</button>
        </div>
      ) : (
        <form className="mt-3 border-t border-[#d9e4dc] pt-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          {mode === "edit" ? (
            <>
              <label htmlFor={`edit-grams-${entry.id}`} className="block text-sm font-medium">Gramaj (g)</label>
              <input id={`edit-grams-${entry.id}`} type="text" inputMode="decimal" autoComplete="off" maxLength={10}
                value={gramsInput} disabled={locked} aria-invalid={value === null} onChange={(event) => setGramsInput(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#b8d6c2] px-3 py-2" />
              <p className="mt-2 text-xs text-[#5b7166]">0,01–10.000 g; en fazla iki ondalık basamak. Virgül kullanabilirsiniz.</p>
              <label htmlFor={`edit-date-${entry.id}`} className="mt-4 block text-sm font-medium">Kayıt tarihi</label>
              <input id={`edit-date-${entry.id}`} type="date" value={date} disabled={locked} onChange={(event) => setDate(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#b8d6c2] px-3 py-2" />
              <MealSlotSelect id={`edit-slot-${entry.id}`} value={mealSlot} disabled={locked} onChange={setMealSlot} />
              {(value === null || !isDiaryDate(date)) && <p className="mt-2 text-sm text-[#a33c35]" role="alert">Geçerli gramaj ve tarih girin.</p>}
            </>
          ) : <p>“{entry.mealName}” kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>}
          <div className="mt-4 flex gap-4">
            <button type="submit" disabled={locked || (mode === "edit" && (value === null || !isDiaryDate(date)))}
              className="rounded-xl bg-[#173f34] px-4 py-2 font-semibold text-white disabled:opacity-50">
              {busy ? "İşleniyor..." : mode === "delete" ? "Silmeyi onayla" : "Kaydet"}
            </button>
            <button type="button" disabled={locked} onClick={() => { setMode("view"); onEditingChange(false); setError(null); setGramsInput(String(entry.grams).replace(".", ",")); setDate(entry.date); setMealSlot(entry.mealSlot); }}
              className="font-semibold underline disabled:opacity-50">Vazgeç</button>
          </div>
        </form>
      )}
      {expanded && <div className="mt-3 rounded-lg bg-[#f7f8f4] p-3 text-xs">
        <p className="text-[#5b7166]">Kayıt anındaki yaklaşık besin değerleri</p>
        <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div><dt>Enerji</dt><dd className="font-semibold">{formatMetric(entry.nutrition.caloriesKcal, "kcal")}</dd></div>
          <div><dt>Protein</dt><dd className="font-semibold">{formatMetric(entry.nutrition.proteinG, "g")}</dd></div>
          <div><dt>Karbonhidrat</dt><dd className="font-semibold">{formatMetric(entry.nutrition.carbsG, "g")}</dd></div>
          <div><dt>Yağ</dt><dd className="font-semibold">{formatMetric(entry.nutrition.fatG, "g")}</dd></div>
        </dl>
        {entry.sourceUrl && <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold underline">Kaynak: {entry.source ?? "Gıda kaynağı"}</a>}
      </div>}
      {error && <div className="mt-4 text-sm text-[#a33c35]" role="alert">
        <p>{error.message}</p>
        {error.uncertain && <p>Yenile düğmesiyle sonucu kontrol edin; işlem otomatik tekrarlanmaz.</p>}
        {error.status === 401 && <Link href="/login" className="font-semibold underline">Giriş yap</Link>}
      </div>}
    </article>
  );
}
