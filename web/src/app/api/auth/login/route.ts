import { NextResponse } from "next/server";
import { hasValidCsrf, requestOrigin } from "@/lib/csrf";
import { apiCsrf, apiUrl, IDENTITY_COOKIE, identityCookieFromResponse } from "@/lib/session";

export async function POST(request: Request) {
  if (!hasValidCsrf(request)) return NextResponse.json({ error: "Güvenlik doğrulaması başarısız." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Geçersiz istek." }, { status: 415 });

  let credentials: { email?: unknown; password?: unknown };
  try { credentials = await request.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  if (typeof credentials.email !== "string" || typeof credentials.password !== "string") {
    return NextResponse.json({ error: "E-posta ve şifre gerekli." }, { status: 400 });
  }

  try {
    const csrf = await apiCsrf();
    const upstream = await fetch(apiUrl("/auth/login?useCookies=true"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bite-Routine-Api-Csrf": csrf.token, Cookie: csrf.cookie },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      cache: "no-store",
    });
    if (upstream.status === 401) return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
    if (!upstream.ok) return NextResponse.json({ error: "Giriş yapılamadı." }, { status: 502 });

    const identityCookie = identityCookieFromResponse(upstream);
    if (!identityCookie) return NextResponse.json({ error: "Oturum çerezi alınamadı." }, { status: 502 });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(IDENTITY_COOKIE, identityCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: requestOrigin(request).startsWith("https://"),
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Kimlik hizmetine ulaşılamıyor." }, { status: 502 });
  }
}
