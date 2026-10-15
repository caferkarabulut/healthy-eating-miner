import { NextResponse } from "next/server";
import { hasValidCsrf } from "@/lib/csrf";
import { apiUrl } from "@/lib/session";

export async function POST(request: Request) {
  if (!hasValidCsrf(request)) return NextResponse.json({ error: "Güvenlik doğrulaması başarısız." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Geçersiz istek." }, { status: 415 });

  let credentials: { email?: unknown; password?: unknown };
  try { credentials = await request.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  if (typeof credentials.email !== "string" || typeof credentials.password !== "string") {
    return NextResponse.json({ error: "E-posta ve şifre gerekli." }, { status: 400 });
  }

  try {
    const upstream = await fetch(apiUrl("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      cache: "no-store",
    });
    if (!upstream.ok) return NextResponse.json({ error: "Kayıt oluşturulamadı. E-postayı ve şifre koşullarını kontrol edin." }, { status: upstream.status === 400 ? 400 : 502 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Kimlik hizmetine ulaşılamıyor." }, { status: 502 });
  }
}
