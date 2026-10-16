import { hasValidCsrf } from "./csrf.ts";
import { isDiaryDate, isDiaryInput, isDiaryUpdate } from "./diary.ts";
import { apiCsrf, apiUrl, requestIdentityCookie } from "./session.ts";

export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie" };
function reply(body: object, status = 200) { return Response.json(body, { status, headers: PRIVATE_HEADERS }); }

export async function diaryGet(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const cookie = requestIdentityCookie(request);
  if (!cookie) return reply({ error: "Günlüğü görmek için giriş yapın." }, 401);
  const date = new URL(request.url).searchParams.get("date");
  if (!isDiaryDate(date)) return reply({ error: "Geçerli bir tarih seçin." }, 400);
  try {
    const response = await fetcher(apiUrl(`/me/diary-entries?date=${date}`), {
      headers: { Cookie: cookie }, cache: "no-store", redirect: "manual",
    });
    if (response.status === 401) return reply({ error: "Oturumunuz sona erdi. Yeniden giriş yapın." }, 401);
    if (!response.ok) return reply({ error: "Günlük alınamadı. Yeniden deneyin." }, 502);
    return reply(await response.json());
  } catch { return reply({ error: "Günlüğe ulaşılamıyor. Bağlantınızı kontrol edin." }, 502); }
}

export async function diaryPost(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  if (!hasValidCsrf(request)) return reply({ error: "Güvenlik doğrulaması başarısız. Sayfayı yenileyin." }, 403);
  const cookie = requestIdentityCookie(request);
  if (!cookie) return reply({ error: "Günlüğe eklemek için giriş yapın." }, 401);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Geçersiz istek." }, 415);
  const input: unknown = await request.json().catch(() => null);
  if (!isDiaryInput(input)) return reply({ error: "Öğün, tarih ve miktarı kontrol edin. Gram karşılığı 0,01–10.000 g; gram girişinde en fazla iki ondalık basamak olmalı." }, 400);
  let csrf: { token: string; cookie: string };
  try { csrf = await apiCsrf(cookie, fetcher); }
  catch { return reply({ error: "Kimlik hizmetine ulaşılamadı; kayıt gönderilmedi." }, 503); }
  try {
    const response = await fetcher(apiUrl("/me/diary-entries"), {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: `${cookie}; ${csrf.cookie}`, "X-Bite-Routine-Api-Csrf": csrf.token },
      body: JSON.stringify(input), cache: "no-store", redirect: "manual",
    });
    if (response.status === 401) return reply({ error: "Oturumunuz sona erdi. Yeniden giriş yapın." }, 401);
    if (response.status === 403) return reply({ error: "Güvenlik doğrulaması başarısız. Sayfayı yenileyin." }, 403);
    if (response.status === 404) return reply({ error: "Bu gıda artık katalogda bulunmuyor." }, 404);
    if (response.status === 400) return reply({ error: "Kayıt kabul edilmedi. Öğün, tarih ve miktarı kontrol edin." }, 400);
    if (response.status !== 201) throw new Error("Unexpected diary response");
    return reply(await response.json(), 201);
  } catch {
    return reply({ error: "Kayıt ulaşmış olabilir. Tekrar eklemeden önce günlüğü kontrol edin.", uncertain: true }, 502);
  }
}

export async function diaryMutate(request: Request, id: string, fetcher: typeof fetch = fetch): Promise<Response> {
  if (!hasValidCsrf(request)) return reply({ error: "Güvenlik doğrulaması başarısız. Sayfayı yenileyin." }, 403);
  const cookie = requestIdentityCookie(request);
  if (!cookie) return reply({ error: "Günlüğü değiştirmek için giriş yapın." }, 401);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) return reply({ error: "Kayıt bulunamadı." }, 404);
  const method = request.method;
  if (method !== "PATCH" && method !== "DELETE") return reply({ error: "Geçersiz işlem." }, 405);
  let input: unknown;
  if (method === "PATCH") {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Geçersiz istek." }, 415);
    input = await request.json().catch(() => null);
    if (!isDiaryUpdate(input)) return reply({ error: "Öğün, tarih ve miktarı kontrol edin. Gram karşılığı 0,01–10.000 g; gram girişinde en fazla iki ondalık basamak olmalı." }, 400);
  }
  let csrf: { token: string; cookie: string };
  try { csrf = await apiCsrf(cookie, fetcher); }
  catch { return reply({ error: "Kimlik hizmetine ulaşılamadı; değişiklik gönderilmedi." }, 503); }
  try {
    const response = await fetcher(apiUrl(`/me/diary-entries/${id}`), {
      method, headers: { "Content-Type": "application/json", Cookie: `${cookie}; ${csrf.cookie}`, "X-Bite-Routine-Api-Csrf": csrf.token },
      ...(method === "PATCH" ? { body: JSON.stringify(input) } : {}), cache: "no-store", redirect: "manual",
    });
    if (response.status === 401) return reply({ error: "Oturumunuz sona erdi. Yeniden giriş yapın." }, 401);
    if (response.status === 403) return reply({ error: "Güvenlik doğrulaması başarısız. Sayfayı yenileyin." }, 403);
    if (response.status === 404) return reply({ error: "Kayıt bulunamadı. Günlüğü yenileyin." }, 404);
    if (response.status === 400) return reply({ error: "Değişiklik kabul edilmedi. Öğün, tarih ve miktarı kontrol edin." }, 400);
    if (method === "DELETE" && response.status === 204) return new Response(null, { status: 204, headers: PRIVATE_HEADERS });
    if (method !== "PATCH" || response.status !== 200) throw new Error("Unexpected diary response");
    return reply(await response.json());
  } catch {
    return reply({ error: "İşlem tamamlanmış olabilir. Tekrar denemeden önce günlüğü yenileyip kontrol edin.", uncertain: true }, 502);
  }
}
