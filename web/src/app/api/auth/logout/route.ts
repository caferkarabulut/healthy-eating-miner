import { NextResponse } from "next/server";
import { hasValidCsrf } from "@/lib/csrf";
import { apiUrl, IDENTITY_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  if (!hasValidCsrf(request)) return NextResponse.json({ error: "Güvenlik doğrulaması başarısız." }, { status: 403 });
  const identityCookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${IDENTITY_COOKIE}=`));
  if (!identityCookie) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

  try {
    const upstream = await fetch(apiUrl("/auth/logout"), {
      method: "POST",
      headers: { Cookie: identityCookie },
      cache: "no-store",
    });
    if (!upstream.ok && upstream.status !== 401) return NextResponse.json({ error: "Çıkış yapılamadı." }, { status: 502 });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.delete(IDENTITY_COOKIE);
    return response;
  } catch {
    return NextResponse.json({ error: "Kimlik hizmetine ulaşılamıyor." }, { status: 502 });
  }
}
