import { hasValidCsrf } from "./csrf.ts";
import { PRIVATE_HEADERS } from "./diary-gateway.ts";
import { apiCsrf, apiUrl, requestIdentityCookie } from "./session.ts";

function reply(error: string, status: number) { return Response.json({ error }, { status, headers: PRIVATE_HEADERS }); }

export async function favoritesGet(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const cookie = requestIdentityCookie(request);
  if (!cookie) return reply("Favorilerinizi görmek için giriş yapın.", 401);
  const params = new URL(request.url).searchParams;
  const page = params.get("page") ?? "1", pageSize = params.get("pageSize") ?? "20";
  if (!/^[1-9]\d*$/.test(page) || Number(page) > 2147483647 || !/^[1-9]\d*$/.test(pageSize) || Number(pageSize) > 100) return reply("Geçerli bir sayfa seçin.", 400);
  const url = apiUrl("/me/favorite-meals");
  url.searchParams.set("page", page); url.searchParams.set("pageSize", pageSize);
  const search = params.get("search")?.trim();
  if (search) url.searchParams.set("search", search);
  try {
    const response = await fetcher(url, { headers: { Cookie: cookie }, cache: "no-store", redirect: "manual" });
    if (response.status === 401) return reply("Oturumunuz sona erdi. Yeniden giriş yapın.", 401);
    if (!response.ok) return reply("Favoriler alınamadı. Yeniden deneyin.", 502);
    return Response.json(await response.json(), { headers: PRIVATE_HEADERS });
  } catch { return reply("Favorilere ulaşılamıyor. Bağlantınızı kontrol edin.", 502); }
}

export async function favoritesMutate(request: Request, mealId: string, fetcher: typeof fetch = fetch): Promise<Response> {
  if (!hasValidCsrf(request)) return reply("Güvenlik doğrulaması başarısız. Sayfayı yenileyin.", 403);
  const cookie = requestIdentityCookie(request);
  if (!cookie) return reply("Favorileri değiştirmek için giriş yapın.", 401);
  if (!/^[1-9]\d*$/.test(mealId) || Number(mealId) > 2147483647) return reply("Geçersiz gıda.", 400);
  if (request.method !== "PUT" && request.method !== "DELETE") return reply("Geçersiz işlem.", 405);
  let csrf: { token: string; cookie: string };
  try { csrf = await apiCsrf(cookie, fetcher); }
  catch { return reply("Kimlik hizmetine ulaşılamadı; değişiklik gönderilmedi.", 503); }
  try {
    const response = await fetcher(apiUrl(`/me/favorite-meals/${mealId}`), {
      method: request.method, headers: { Cookie: `${cookie}; ${csrf.cookie}`, "X-Bite-Routine-Api-Csrf": csrf.token },
      cache: "no-store", redirect: "manual",
    });
    if (response.status === 401) return reply("Oturumunuz sona erdi. Yeniden giriş yapın.", 401);
    if (response.status === 403) return reply("Güvenlik doğrulaması başarısız. Sayfayı yenileyin.", 403);
    if (response.status === 404) return reply("Bu gıda katalogda bulunmuyor.", 404);
    if (response.status !== 204) throw new Error("Unexpected favorite response");
    return new Response(null, { status: 204, headers: PRIVATE_HEADERS });
  } catch { return reply("İşlem tamamlanmış olabilir. Favorileri yenileyip kontrol edin.", 502); }
}
