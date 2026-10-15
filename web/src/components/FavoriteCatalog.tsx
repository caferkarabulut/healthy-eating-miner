"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CatalogMeal } from "@/lib/portion";
import { FavoriteError, readFavorites, setFavorite } from "@/lib/favorites-client";
import MealCatalog from "./MealCatalog";

type Result = { revision: number } & (
  { kind: "ready"; items: CatalogMeal[] } | { kind: "anonymous" | "error"; message: string }
);

export default function FavoriteCatalog({ meals }: { meals?: CatalogMeal[] }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const diaryPending = useRef(false);
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);
  const current = result?.revision === revision ? result : null;
  const favorites = new Set(current?.kind === "ready" ? current.items.map((meal) => meal.mealId) : []);

  useEffect(() => {
    const controller = new AbortController();
    readFavorites(controller.signal).then((items) => {
      if (!controller.signal.aborted) setResult({ revision, kind: "ready", items });
    }).catch((reason) => {
      if (!controller.signal.aborted) setResult({ revision, kind: reason instanceof FavoriteError && reason.status === 401 ? "anonymous" : "error",
        message: reason instanceof Error ? reason.message : "Favoriler alınamadı." });
    });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const refresh = () => { if (!pending.current && !diaryPending.current) setRevision((value) => value + 1); };
    window.addEventListener("focus", refresh); window.addEventListener("pageshow", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("pageshow", refresh); };
  }, []);

  async function change(meal: CatalogMeal) {
    if (pending.current || diaryPending.current || current?.kind !== "ready" || notice?.error) return;
    pending.current = true; setBusy(true); setNotice(null);
    const adding = !favorites.has(meal.mealId);
    try {
      await setFavorite(meal.mealId, adding);
      setNotice({ error: false, message: adding ? "Favorilere eklendi." : "Favorilerden çıkarıldı." });
      setRevision((value) => value + 1);
    } catch (reason) {
      if (reason instanceof FavoriteError && reason.status === 401) setResult({ revision, kind: "anonymous", message: reason.message });
      setNotice({ error: true, message: reason instanceof Error ? reason.message : "Favori değiştirilemedi. Yenileyip kontrol edin." });
    } finally { pending.current = false; setBusy(false); }
  }

  const displayed = meals ?? (current?.kind === "ready" ? current.items : []);
  return <div>
    <div className="mb-5 flex flex-wrap items-center gap-4 text-sm">
      {!current && <p role="status">Favoriler yükleniyor...</p>}
      {current?.kind === "anonymous" && <p>Favoriler için <Link href="/login" className="font-semibold underline">giriş yapın</Link>.</p>}
      {current?.kind === "error" && <p role="alert">{current.message}</p>}
      {notice && <p role={notice.error ? "alert" : "status"}>{notice.message}</p>}
      <button type="button" disabled={busy} onClick={() => {
        if (diaryPending.current) return;
        setNotice(null); setRevision((value) => value + 1);
      }} className="font-semibold underline disabled:opacity-50">Favorileri yenile</button>
    </div>
    {!meals && current?.kind === "ready" && displayed.length === 0 && <p className="rounded-2xl bg-white p-6">Henüz favori gıdanız yok. <Link href="/" className="font-semibold underline">Katalogdan favori ekleyin.</Link></p>}
    <MealCatalog meals={displayed} disabled={busy} onBusyChange={(value) => { diaryPending.current = value; }} renderFavorite={(meal, saving) => current?.kind === "anonymous" ? (
      <Link href="/login" className="mt-4 block text-sm font-semibold underline">Favoriye eklemek için giriş yap</Link>
    ) : (
      <button type="button" disabled={saving || busy || current?.kind !== "ready" || Boolean(notice?.error)}
        aria-pressed={favorites.has(meal.mealId)} onClick={() => void change(meal)}
        className="mt-4 block w-full rounded-xl border border-[#b8d6c2] px-4 py-3 text-sm font-semibold disabled:opacity-50">
        {busy ? "İşleniyor..." : favorites.has(meal.mealId) ? "Favorilerden çıkar" : "Favoriye ekle"}
      </button>
    )} />
  </div>;
}
