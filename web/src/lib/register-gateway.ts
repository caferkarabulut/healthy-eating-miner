import { hasValidCsrf } from "./csrf.ts";
import { apiUrl } from "./session.ts";
import { registerFeedback } from "./register-feedback.ts";

function reply(body: object, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
export async function registerPost(request: Request, fetcher: typeof fetch = fetch) {
  if (!hasValidCsrf(request)) return reply({ error: "Güvenlik doğrulaması başarısız. Yeniden deneyin." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Geçersiz istek." }, 415);
  const credentials: unknown = await request.json().catch(() => null);
  if (!credentials || typeof credentials !== "object" || !("email" in credentials) || !("password" in credentials)
    || typeof credentials.email !== "string" || typeof credentials.password !== "string")
    return reply({ error: "E-posta ve şifre gerekli." }, 400);
  try {
    const upstream = await fetcher(apiUrl("/auth/register"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }), cache: "no-store", redirect: "manual",
    });
    if (upstream.status === 400) return reply(registerFeedback(await upstream.json().catch(() => null)), 400);
    if (!upstream.ok) return reply({ error: "Kayıt hizmeti şu anda kullanılamıyor. Daha sonra yeniden deneyin." }, 502);
    return reply({ ok: true });
  } catch { return reply({ error: "Kimlik hizmetine ulaşılamıyor. Bağlantınızı kontrol edip yeniden deneyin." }, 502); }
}
