import type { CatalogMeal } from "./portion.ts";

export class FavoriteError extends Error {
  status: number;
  constructor(message: string, status = 0) { super(message); this.status = status; }
}

export async function readFavorites(signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<CatalogMeal[]> {
  const items: CatalogMeal[] = [];
  for (let page = 1; ; page++) {
    let response: Response;
    try { response = await fetcher(`/api/favorites?page=${page}&pageSize=100`, { credentials: "same-origin", cache: "no-store", signal }); }
    catch { throw new FavoriteError("Favorilere ulaşılamıyor. Bağlantınızı kontrol edin."); }
    const body = await response.json();
    if (!response.ok) throw new FavoriteError(body.error ?? "Favoriler alınamadı.", response.status);
    if (!Array.isArray(body.items) || !Number.isInteger(body.totalCount) || body.totalCount < 0) throw new FavoriteError("Favori yanıtı doğrulanamadı.");
    if (body.items.length === 0 && items.length < body.totalCount) throw new FavoriteError("Favoriler tamamlanamadı. Yeniden deneyin.");
    items.push(...body.items);
    if (items.length >= body.totalCount) return items;
  }
}

export async function setFavorite(mealId: number, favorite: boolean, fetcher: typeof fetch = fetch): Promise<void> {
  let token: string;
  try {
    const csrf = await fetcher("/api/auth/csrf", { credentials: "same-origin", cache: "no-store" });
    if (!csrf.ok) throw new Error();
    token = (await csrf.json()).token;
    if (!token) throw new Error();
  } catch { throw new FavoriteError("Güvenlik doğrulaması başlatılamadı; değişiklik gönderilmedi."); }
  let response: Response;
  try {
    response = await fetcher(`/api/favorites/${mealId}`, {
      method: favorite ? "PUT" : "DELETE", credentials: "same-origin", cache: "no-store",
      headers: { "X-CSRF-Token": token },
    });
  } catch { throw new FavoriteError("İşlem tamamlanmış olabilir. Favorileri yenileyip kontrol edin."); }
  if (response.status === 204) return;
  const body = await response.json().catch(() => null);
  throw new FavoriteError(body?.error ?? "Favori değiştirilemedi. Yenileyip kontrol edin.", response.status);
}
