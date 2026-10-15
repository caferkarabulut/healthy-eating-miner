import { NextResponse } from "next/server";
import { createCsrfToken, CSRF_COOKIE, requestOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const token = createCsrfToken();
  const response = NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: requestOrigin(request).startsWith("https://"),
    path: "/",
  });
  return response;
}
