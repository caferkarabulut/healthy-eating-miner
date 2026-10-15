import { apiUrl, requestIdentityCookie } from "@/lib/session";
import { PRIVATE_HEADERS } from "@/lib/diary-gateway";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const cookie = requestIdentityCookie(request);
  if (!cookie) return Response.json({}, { status: 401, headers: PRIVATE_HEADERS });
  try {
    const response = await fetch(apiUrl("/me"), { headers: { Cookie: cookie }, cache: "no-store", redirect: "manual" });
    if (response.status === 401) return Response.json({}, { status: 401, headers: PRIVATE_HEADERS });
    if (!response.ok) throw new Error("Profile unavailable");
    return Response.json({ authenticated: true }, { headers: PRIVATE_HEADERS });
  } catch { return Response.json({}, { status: 502, headers: PRIVATE_HEADERS }); }
}
