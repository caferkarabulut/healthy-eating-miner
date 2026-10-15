"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MealSlotSelect from "./MealSlotSelect";
import { type MealSlot, isDiaryDate } from "@/lib/diary";
import { addDiaryEntry, DiaryError } from "@/lib/diary-client";
import { useDiaryDate } from "@/lib/use-diary-date";

export default function DiaryAddForm({ mealId, grams, onBusyChange, disabled = false }: {
  mealId: number; grams: number | null; onBusyChange: (value: boolean) => void; disabled?: boolean;
}) {
  const { date, selectDate } = useDiaryDate();
  const [session, setSession] = useState<"loading" | "authenticated" | "anonymous" | "error">("loading");
  const [mealSlot, setMealSlot] = useState<MealSlot>("other");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ key: string; message: string; locked: boolean; success: boolean } | null>(null);
  const key = `${mealId}/${grams}/${date}/${mealSlot}`;
  const current = result?.key === key ? result : null;
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setSession(response.ok ? "authenticated" : response.status === 401 ? "anonymous" : "error"); })
      .catch(() => { if (!controller.signal.aborted) setSession("error"); });
    return () => controller.abort();
  }, []);

  async function save() {
    if (busy || disabled || grams === null || !isDiaryDate(date) || session !== "authenticated" || current?.locked) return;
    setBusy(true); onBusyChange(true);
    try {
      await addDiaryEntry({ mealId, grams, date, mealSlot });
      setResult({ key, message: "Günlüğe eklendi.", locked: true, success: true });
    } catch (reason) {
      if (reason instanceof DiaryError && reason.status === 401) setSession("anonymous");
      setResult({ key, message: reason instanceof Error ? reason.message : "Kayıt tamamlanamadı.", locked: reason instanceof DiaryError && reason.uncertain, success: false });
    } finally { setBusy(false); onBusyChange(false); }
  }

  return (
    <div className="mt-5 border-t border-[#cce3d2] pt-4">
      <label htmlFor={`diary-date-${mealId}`} className="block text-sm font-medium">Kayıt tarihi</label>
      <input id={`diary-date-${mealId}`} type="date" value={date} onChange={(event) => selectDate(event.target.value)} disabled={busy || disabled}
        className="mt-2 w-full rounded-lg border border-[#b8d6c2] bg-white px-3 py-2" />
      <MealSlotSelect id={`diary-slot-${mealId}`} value={mealSlot} disabled={busy || disabled} onChange={setMealSlot} />
      {session === "loading" && <p className="mt-3 text-sm" role="status">Oturum kontrol ediliyor...</p>}
      {session === "anonymous" && <p className="mt-3 text-sm">Günlüğe eklemek için <Link href="/login" className="font-semibold underline">giriş yapın</Link>.</p>}
      {session === "error" && <p role="alert" className="mt-3 text-sm">Oturum kontrol edilemedi. Sayfayı yenileyin.</p>}
      <button type="button" onClick={save} disabled={busy || disabled || session !== "authenticated" || grams === null || !isDiaryDate(date) || Boolean(current?.locked)}
        className="mt-4 w-full rounded-xl bg-[#173f34] px-4 py-3 font-semibold text-white disabled:opacity-50">
        {busy ? "Ekleniyor..." : "Günlüğe ekle"}
      </button>
      {current && <p role={current.success ? "status" : "alert"} className={`mt-3 text-sm ${current.success ? "text-[#246b53]" : "text-[#a33c35]"}`}>{current.message}</p>}
      {current?.locked && <Link href={`/diary?date=${date}`} className="mt-3 inline-block text-sm font-semibold underline">Bu günün günlüğünü aç</Link>}
    </div>
  );
}
