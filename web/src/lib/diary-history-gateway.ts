import { isHistoryEnd } from "./diary-history.ts";
import { PRIVATE_HEADERS } from "./diary-gateway.ts";
import { apiUrl, requestIdentityCookie } from "./session.ts";

function reply(body: object, status = 200) { return Response.json(body, { status, headers: PRIVATE_HEADERS }); }
export async function diaryHistoryGet(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const cookie = requestIdentityCookie(request);
  if (!cookie) return reply({ error: "Geçmişi görmek için giriş yapın." }, 401);
  const endDate = new URL(request.url).searchParams.get("endDate");
  if (!isHistoryEnd(endDate)) return reply({ error: "Geçerli bir bitiş günü seçin (en erken 07.01.0001)." }, 400);
  try {
    const response = await fetcher(apiUrl(`/me/diary-summary?endDate=${endDate}`), {
      headers: { Cookie: cookie }, cache: "no-store", redirect: "manual",
    });
    if (response.status === 401) return reply({ error: "Oturumunuz sona erdi. Yeniden giriş yapın." }, 401);
    if (!response.ok) return reply({ error: "Geçmiş yüklenemedi. Yeniden deneyin." }, 502);
    return reply(await response.json());
  } catch { return reply({ error: "Geçmiş yüklenemedi. Bağlantınızı kontrol edin." }, 502); }
}
