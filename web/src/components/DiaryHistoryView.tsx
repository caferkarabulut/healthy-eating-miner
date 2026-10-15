"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDiaryDate } from "@/lib/use-diary-date";
import { historyDateLabel, isHistoryEnd, shiftHistoryEnd, type DiaryHistory } from "@/lib/diary-history";
import { summaryMetrics } from "@/lib/diary-summary";

type Result = { key: string; kind: "ok"; history: DiaryHistory } | { key: string; kind: "session" | "error"; message: string };
export default function DiaryHistoryView({ initialDate }: { initialDate?: string }) {
  const { date } = useDiaryDate(initialDate);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${date}/${revision}`;
  const current = result?.key === key ? result : null;
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    const visibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!isHistoryEnd(date)) return;
    const controller = new AbortController();
    fetch(`/api/diary-summary?endDate=${date}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!controller.signal.aborted) setResult(response.ok ? { key, kind: "ok", history: body as DiaryHistory } : {
          key, kind: response.status === 401 ? "session" : "error", message: body.error ?? "Geçmiş yüklenemedi.",
        });
      }).catch(() => { if (!controller.signal.aborted) setResult({ key, kind: "error", message: "Geçmiş yüklenemedi. Bağlantınızı kontrol edin." }); });
    return () => controller.abort();
  }, [date, key]);
  const previous = shiftHistoryEnd(date, -7);
  const next = shiftHistoryEnd(date, 7);
  return <section className="mt-8">
    <nav aria-label="Geçmiş aralığı" className="flex flex-wrap items-center gap-4 font-semibold">
      {previous && <Link className="rounded-xl bg-[#e5f3e9] px-4 py-3" href={`/history?endDate=${previous}`}>Önceki 7 gün</Link>}
      {next && <Link className="rounded-xl bg-[#e5f3e9] px-4 py-3" href={`/history?endDate=${next}`}>Sonraki 7 gün</Link>}
      <button type="button" className="rounded-xl border px-4 py-3" onClick={() => setRevision((value) => value + 1)}>Yenile</button>
    </nav>
    {!date ? <p className="mt-6" role="status">Geçmiş yükleniyor...</p> : !isHistoryEnd(date) ? <p className="mt-6" role="alert">Geçersiz tarih. <Link href="/history" className="underline">Bugüne dön</Link></p> : !current ? <p className="mt-6" role="status">Geçmiş yükleniyor...</p> : current.kind !== "ok" ? <div className="mt-6" role="alert">
      <p>{current.message}</p>{current.kind === "session" && <Link href="/login" className="inline-block py-3 font-semibold underline">Giriş yap</Link>}
    </div> : <>
      <h2 className="mt-6 text-xl font-semibold">{historyDateLabel(current.history.startDate)} – {historyDateLabel(current.history.endDate)}</h2>
      <p className="mt-2 text-sm">Kayıt yok: bu gün için günlük kaydı bulunmuyor. Eksik veri: en az bir kaydın ilgili besin değeri bilinmiyor.</p>
      <ul className="mt-4 space-y-4">{current.history.days.map(({ date: day, summary }) => <li key={day}>
        <Link href={`/diary?date=${day}`} className="block rounded-2xl border border-[#d9e4dc] bg-white p-5 hover:border-[#277f64]">
          <h3 className="font-semibold underline">{historyDateLabel(day)}</h3>
          {summary.entryCount === 0 ? <p className="mt-2">Kayıt yok</p> : <>
            <p className="mt-2 text-sm">{summary.entryCount} kayıt</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{summaryMetrics(summary).map((metric) => <div key={metric.label}><dt className="text-sm">{metric.label}</dt><dd className="font-semibold">{metric.text}</dd></div>)}</dl>
          </>}
        </Link>
      </li>)}</ul>
    </>}
  </section>;
}
