"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { DiaryEntry } from "@/lib/diary";
import { isDiaryDate } from "@/lib/diary";
import { changeDiaryEntry, DiaryError } from "@/lib/diary-client";
import { formatMetric, parseGrams } from "@/lib/portion";

const grams = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export default function DiaryEntryCard({ entry, onBusyChange, onEditingChange, onSaved, disabled }: {
  entry: DiaryEntry; disabled: boolean; onBusyChange: (busy: boolean) => void;
  onEditingChange: (editing: boolean) => void; onSaved: (message: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [gramsInput, setGramsInput] = useState(String(entry.grams).replace(".", ","));
  const [date, setDate] = useState(entry.date);
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
      await changeDiaryEntry(entry.id, mode === "delete" ? null : { grams: value!, date });
      onSaved(mode === "delete" ? "Kayıt silindi." : `Kayıt güncellendi. Kayıt tarihi: ${date.split("-").reverse().join(".")}.`);
    } catch (reason) {
      setError(reason instanceof DiaryError ? reason : new DiaryError("Değişiklik tamamlanamadı."));
    } finally { pending.current = false; setBusy(false); onBusyChange(false); }
  }

  return (
    <article aria-label={entry.mealName}>
      <h2 className="text-xl font-semibold">{entry.mealName}</h2>
      <p className="mt-2 text-[#5b7166]">{grams.format(entry.grams)} g · Yaklaşık besin değerleri</p>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div><dt>Enerji</dt><dd className="mt-1 font-semibold">{formatMetric(entry.nutrition.caloriesKcal, "kcal")}</dd></div>
        <div><dt>Protein</dt><dd className="mt-1 font-semibold">{formatMetric(entry.nutrition.proteinG, "g")}</dd></div>
        <div><dt>Karbonhidrat</dt><dd className="mt-1 font-semibold">{formatMetric(entry.nutrition.carbsG, "g")}</dd></div>
        <div><dt>Yağ</dt><dd className="mt-1 font-semibold">{formatMetric(entry.nutrition.fatG, "g")}</dd></div>
      </dl>
      {mode === "view" ? (
        <div className="mt-5 flex gap-4">
          <button type="button" disabled={locked} onClick={() => { setMode("edit"); onEditingChange(true); }} className="font-semibold underline">Düzenle</button>
          <button type="button" disabled={locked} onClick={() => { setMode("delete"); onEditingChange(true); }} className="font-semibold text-[#a33c35] underline">Sil</button>
        </div>
      ) : (
        <form className="mt-5 border-t border-[#d9e4dc] pt-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
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
              {(value === null || !isDiaryDate(date)) && <p className="mt-2 text-sm text-[#a33c35]" role="alert">Geçerli gramaj ve tarih girin.</p>}
            </>
          ) : <p>“{entry.mealName}” kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>}
          <div className="mt-4 flex gap-4">
            <button type="submit" disabled={locked || (mode === "edit" && (value === null || !isDiaryDate(date)))}
              className="rounded-xl bg-[#173f34] px-4 py-2 font-semibold text-white disabled:opacity-50">
              {busy ? "İşleniyor..." : mode === "delete" ? "Silmeyi onayla" : "Kaydet"}
            </button>
            <button type="button" disabled={locked} onClick={() => { setMode("view"); onEditingChange(false); setError(null); setGramsInput(String(entry.grams).replace(".", ",")); setDate(entry.date); }}
              className="font-semibold underline disabled:opacity-50">Vazgeç</button>
          </div>
        </form>
      )}
      {error && <div className="mt-4 text-sm text-[#a33c35]" role="alert">
        <p>{error.message}</p>
        {error.uncertain && <p>Yenile düğmesiyle sonucu kontrol edin; işlem otomatik tekrarlanmaz.</p>}
        {error.status === 401 && <Link href="/login" className="font-semibold underline">Giriş yap</Link>}
      </div>}
    </article>
  );
}
