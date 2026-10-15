"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DiaryDay } from "@/lib/diary";
import { isDiaryDate } from "@/lib/diary";
import { formatMetric } from "@/lib/portion";
import { useDiaryDate } from "@/lib/use-diary-date";

type Result = { key: string; kind: "ok"; day: DiaryDay } | { key: string; kind: "session" | "error"; message: string };
const grams = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export default function DiaryView({ initialDate }: { initialDate?: string }) {
  const router = useRouter();
  const { date, selectDate } = useDiaryDate(initialDate);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${date}/${revision}`;
  const current = result?.key === key ? result : null;
  useEffect(() => {
    const focus = () => setRevision((value) => value + 1);
    const visibility = () => { if (document.visibilityState === "visible") focus(); };
    window.addEventListener("focus", focus);
    window.addEventListener("pageshow", focus);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("focus", focus);
      window.removeEventListener("pageshow", focus);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!isDiaryDate(date)) return;
    const controller = new AbortController();
    fetch(`/api/diary?date=${date}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!controller.signal.aborted) {
          setResult(response.ok ? { key, kind: "ok", day: body as DiaryDay } : {
            key, kind: response.status === 401 ? "session" : "error", message: body.error ?? "Günlük yüklenemedi.",
          });
        }
      })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, kind: "error", message: "Günlük yüklenemedi. Bağlantınızı kontrol edin." }); });
    return () => controller.abort();
  }, [date, key]);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium">Gün (İstanbul)
          <input aria-label="Gün (İstanbul)" type="date" value={date} onChange={(event) => {
            const value = event.target.value;
            selectDate(value);
            if (isDiaryDate(value)) router.replace(`/diary?date=${value}`, { scroll: false });
          }} className="mt-2 block rounded-xl border border-[#b8d6c2] bg-white px-4 py-3" />
        </label>
        <button type="button" onClick={() => setRevision((value) => value + 1)} className="rounded-xl bg-[#e5f3e9] px-5 py-3 font-semibold">Yenile</button>
      </div>
      {!isDiaryDate(date) ? <p className="mt-6" role="status">Geçerli bir gün seçin.</p> : !current ? <p className="mt-6" role="status">Günlük yükleniyor...</p> : current.kind !== "ok" ? (
        <div className="mt-6 rounded-2xl bg-white p-6" role="alert">
          <p>{current.message}</p>
          {current.kind === "session" && <Link href="/login" className="mt-3 inline-block font-semibold underline">Giriş yap</Link>}
        </div>
      ) : current.day.items.length === 0 ? <p className="mt-6 rounded-2xl bg-white p-6">Bu gün için henüz kayıt yok. <Link href="/" className="font-semibold underline">Katalogdan gıda ekleyin.</Link></p> : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {current.day.items.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-[#d9e4dc] bg-white p-6">
              <h2 className="text-xl font-semibold">{entry.mealName}</h2>
              <p className="mt-2 text-[#5b7166]">{grams.format(entry.grams)} g · Yaklaşık besin değerleri</p>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div><dt>Enerji</dt><dd className="mt-1 font-semibold">{formatMetric(entry.nutrition.caloriesKcal, "kcal")}</dd></div>
                <div><dt>Protein</dt><dd className="mt-1 font-semibold">{formatMetric(entry.nutrition.proteinG, "g")}</dd></div>
                <div><dt>Karbonhidrat</dt><dd className="mt-1 font-semibold">{formatMetric(entry.nutrition.carbsG, "g")}</dd></div>
                <div><dt>Yağ</dt><dd className="mt-1 font-semibold">{formatMetric(entry.nutrition.fatG, "g")}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
