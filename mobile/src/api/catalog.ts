export type Nutrition = { basisGrams: 100; caloriesKcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; source: string; sourceUrl: string; approximate: boolean };
export type Meal = { mealId: number; mealName: string; mealType: string | null; cuisine: string | null; nutrition: Nutrition | null };
export type Catalog = { items: Meal[]; page: number; pageSize: number; totalCount: number };
export const PAGE_SIZE = 10;
export class CatalogError extends Error {}
export function apiOrigin(value: string | undefined): string {
  try {
    const url = new URL(value?.trim() ?? "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
    return url.origin;
  } catch { throw new CatalogError("Bağlantı ayarı eksik veya geçersiz. Uygulamanın API adresini kontrol edin."); }
}
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function isMeal(value: unknown): value is Meal {
  if (!object(value) || !Number.isInteger(value.mealId) || Number(value.mealId) < 1 || typeof value.mealName !== "string") return false;
  if (value.nutrition === null) return true;
  const n = value.nutrition;
  return object(n) && n.basisGrams === 100 && typeof n.source === "string" && typeof n.sourceUrl === "string"
    && [n.caloriesKcal, n.proteinG, n.carbsG, n.fatG].every(x => x === null || typeof x === "number" && Number.isFinite(x) && x >= 0);
}
export async function getJson(base: string | undefined, path: string, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<unknown> {
  const url = `${apiOrigin(base)}${path}`;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) controller.abort();
  else signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 12000);
  try {
    const response = await fetcher(url, { signal: controller.signal, credentials: "omit", headers: { Accept: "application/json" } });
    if (!response.ok) throw new CatalogError(response.status === 404 ? "Gıda bulunamadı. Kataloğa dönüp yeniden seçin." : "Katalog şu anda alınamıyor. Yeniden deneyin.");
    return await response.json();
  } catch (error) {
    if (error instanceof CatalogError) throw error;
    throw new CatalogError("Kataloğa bağlanılamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.");
  } finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
}
export async function loadCatalog(base: string | undefined, search: string, page: number, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<Catalog> {
  if (!Number.isInteger(page) || page < 1 || page > 2147483647) throw new CatalogError("Geçersiz sayfa.");
  const query = `page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(search.trim())}`;
  const data = await getJson(base, `/meals?${query}`, signal, fetcher);
  if (!object(data) || !Array.isArray(data.items) || !data.items.every(isMeal) || data.page !== page || data.pageSize !== PAGE_SIZE || !Number.isInteger(data.totalCount) || Number(data.totalCount) < 0)
    throw new CatalogError("Katalog yanıtı okunamadı. Yeniden deneyin.");
  return data as Catalog;
}
export async function loadMeal(base: string | undefined, id: string, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<Meal> {
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) throw new CatalogError("Geçersiz gıda. Kataloğa dönüp yeniden seçin.");
  const data = await getJson(base, `/meals/${id}`, signal, fetcher);
  if (!isMeal(data) || data.mealId !== Number(id)) throw new CatalogError("Gıda bilgisi okunamadı. Yeniden deneyin.");
  return data;
}
export function metric(value: number | null | undefined, unit: "g" | "kcal"): string {
  return typeof value === "number" && Number.isFinite(value) ? `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: unit === "g" ? 2 : 1 }).format(value)} ${unit}` : "Veri yok";
}
export function sourceUrl(value?: string) {
  try { const url = new URL(value ?? ""); return url.protocol === "https:" ? url.href : null; } catch { return null; }
}
