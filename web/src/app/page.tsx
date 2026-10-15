import CatalogWelcome from "@/components/CatalogWelcome";
import FavoriteCatalog from "@/components/FavoriteCatalog";
import Link from "next/link";
import type { CatalogMeal } from "@/lib/portion";
import { catalogPages, catalogQuery, CATALOG_PAGE_SIZE } from "@/lib/catalog";

type MealList = { items: CatalogMeal[]; totalCount: number };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { search, page } = catalogQuery(await searchParams);
  const url = new URL("/meals", process.env.BITE_ROUTINE_API_URL ?? "http://127.0.0.1:5080");
  url.searchParams.set("pageSize", String(CATALOG_PAGE_SIZE));
  url.searchParams.set("page", String(page));
  if (search) url.searchParams.set("search", search);

  let catalog: MealList | null = null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (response.ok) catalog = (await response.json()) as MealList;
  } catch {
    // Keep the page accessible when the local API is stopped.
  }
  const pages = catalog ? catalogPages(search, page, catalog.totalCount) : null;

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#18312c]">
      <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d9e4dc] pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#277f64]">Bite Routine</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Yemek kataloğu</h1>
          </div>
          <nav aria-label="Hesap" className="flex flex-wrap items-center gap-4 text-sm font-semibold text-[#276b51]">
            <Link href="/sources" className="hover:underline">Veri kaynakları</Link>
            <Link href="/login" className="hover:underline">Giriş yap</Link>
            <Link href="/diary" className="hover:underline">Günlüğüm</Link>
            <Link href="/favorites" className="hover:underline">Favorilerim</Link>
            <Link href="/account" className="rounded-full bg-[#e5f3e9] px-4 py-2 hover:bg-[#d7ebdd]">Hesabım</Link>
          </nav>
        </header>

        <section className="mt-6 rounded-2xl border border-[#d9e4dc] bg-[#edf4eb] p-5 sm:p-6">
          <CatalogWelcome />
          <form action="/" className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row">
            <label htmlFor="food-search" className="sr-only">Gıda ara</label>
            <input id="food-search" name="q" defaultValue={search} placeholder="Örneğin mercimek, yoğurt, elma..." className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3 text-[#18312c] outline-none focus:ring-2 focus:ring-[#a6dbc0]" />
            <button type="submit" className="rounded-xl bg-[#277f64] px-6 py-3 font-semibold text-white hover:bg-[#205942]">Ara</button>
          </form>
        </section>

        <section className="mt-6" aria-live="polite">
          <div className="mb-5 flex items-end justify-between flex-wrap gap-2">
            <div><h2 className="text-xl font-semibold">Gıdalar</h2><p className="mt-1 text-sm text-[#5b7166]">Değerler yaklaşık ve 100 g içindir. Detayları görmek için bir gıda seçin.</p></div>
            {catalog && <span className="text-sm text-[#5b7166]">{catalog.totalCount} sonuç</span>}
          </div>
          {!catalog ? (
            <div className="rounded-2xl bg-white p-7">Katalog şu anda yüklenemiyor. Lütfen biraz sonra yeniden deneyin.</div>
          ) : catalog.items.length === 0 ? (
            <div className="rounded-2xl bg-white p-7">{catalog.totalCount > 0 ? "Bu sayfada gıda yok. Önceki sayfaya dönebilirsiniz." : search ? "Bu aramayla eşleşen gıda yok." : "Katalog henüz boş."}</div>
          ) : (
            <FavoriteCatalog meals={catalog.items} />
          )}
          {pages && (pages.previous || pages.next) && <nav aria-label="Katalog sayfaları" className="mt-6 flex flex-wrap items-center gap-5 text-sm font-semibold">
            {pages.previous && <Link href={pages.previous} className="rounded-xl bg-[#e5f3e9] px-5 py-3 hover:underline">Önceki</Link>}
            <span>Sayfa {page} / {pages.lastPage}</span>
            {pages.next && <Link href={pages.next} className="rounded-xl bg-[#e5f3e9] px-5 py-3 hover:underline">Sonraki</Link>}
          </nav>}
        </section>
        <footer className="mt-8 border-t border-[#d9e4dc] pt-5 text-sm text-[#5b7166]"><Link href="/sources" className="font-semibold underline">Veri kaynakları</Link><span className="ml-3">Kaynak, lisans ve değerler hakkında</span></footer>
      </div>
    </main>
  );
}
