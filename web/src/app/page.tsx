type Nutrition = {
  basisGrams: number;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  source: string;
  sourceUrl: string;
};

type Meal = {
  mealId: number;
  mealName: string;
  mealType: string | null;
  nutrition: Nutrition | null;
};

type MealList = { items: Meal[]; totalCount: number };
const formatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });
const show = (value: number | null, unit: string) =>
  value === null ? "—" : formatter.format(value) + " " + unit;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.trim() : "";
  const url = new URL("/meals", process.env.BITE_ROUTINE_API_URL ?? "http://127.0.0.1:5080");
  url.searchParams.set("pageSize", "100");
  if (search) url.searchParams.set("search", search);

  let catalog: MealList | null = null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (response.ok) catalog = (await response.json()) as MealList;
  } catch {
    // Keep the page accessible when the local API is stopped.
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#18312c]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d9e4dc] pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#277f64]">Bite Routine</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Yemek kataloğu</h1>
          </div>
          <span className="rounded-full bg-[#e5f3e9] px-4 py-2 text-sm font-medium text-[#276b51]">Türkiye için geliştiriliyor</span>
        </header>

        <section className="mt-10 rounded-3xl bg-[#173f34] px-6 py-9 text-white sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a6dbc0]">Küçük bir başlangıç</p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Ne yediğini daha kolay gör.</h2>
          <p className="mt-4 max-w-2xl text-[#d4e9db]">Temel gıdaları ara, 100 gramdaki yaklaşık besin değerlerini ve kaynağını incele. Kişisel takip sonraki adımda eklenecek.</p>
          <form action="/" className="mt-7 flex max-w-xl flex-col gap-3 sm:flex-row">
            <label htmlFor="food-search" className="sr-only">Gıda ara</label>
            <input id="food-search" name="q" defaultValue={search} placeholder="Örneğin mercimek, yoğurt, elma..." className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3 text-[#18312c] outline-none focus:ring-2 focus:ring-[#a6dbc0]" />
            <button type="submit" className="rounded-xl bg-[#bce8c8] px-6 py-3 font-semibold text-[#173f34] hover:bg-white">Ara</button>
          </form>
        </section>

        <section className="mt-10" aria-live="polite">
          <div className="mb-5 flex items-end justify-between gap-2">
            <div><h2 className="text-2xl font-semibold">Gıdalar</h2><p className="mt-1 text-sm text-[#5b7166]">Yaklaşık değerler, 100 g yenilebilir gıda için.</p></div>
            {catalog && <span className="text-sm text-[#5b7166]">{catalog.totalCount} sonuç</span>}
          </div>
          {!catalog ? (
            <div className="rounded-2xl bg-white p-7">Kataloğa ulaşılamıyor. Yerel .NET API&apos;yi başlatıp sayfayı yenileyin.</div>
          ) : catalog.items.length === 0 ? (
            <div className="rounded-2xl bg-white p-7">{search ? "Bu aramayla eşleşen gıda yok." : "Katalog henüz boş."}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.items.map((meal) => (
                <article key={meal.mealId} className="rounded-2xl border border-[#d9e4dc] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#277f64]">{meal.mealType ?? "Gıda"}</p>
                  <h3 className="mt-2 min-h-14 text-xl font-semibold">{meal.mealName}</h3>
                  {meal.nutrition ? (
                    <>
                      <div className="mt-5 border-t border-[#e7eee8] pt-4"><strong className="text-3xl">{show(meal.nutrition.caloriesKcal, "kcal")}</strong><span className="ml-2 text-sm text-[#698074]">/ {meal.nutrition.basisGrams} g</span></div>
                      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <div><dt className="text-[#698074]">Protein</dt><dd className="mt-1 font-semibold">{show(meal.nutrition.proteinG, "g")}</dd></div>
                        <div><dt className="text-[#698074]">Karbonhidrat</dt><dd className="mt-1 font-semibold">{show(meal.nutrition.carbsG, "g")}</dd></div>
                        <div><dt className="text-[#698074]">Yağ</dt><dd className="mt-1 font-semibold">{show(meal.nutrition.fatG, "g")}</dd></div>
                      </dl>
                      <a href={meal.nutrition.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm font-medium text-[#246b53] underline underline-offset-4">Kaynak: {meal.nutrition.source}</a>
                    </>
                  ) : <p className="mt-5 border-t border-[#e7eee8] pt-4 text-sm text-[#698074]">Besin değeri henüz eklenmedi.</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
