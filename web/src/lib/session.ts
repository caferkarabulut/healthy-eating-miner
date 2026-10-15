export const IDENTITY_COOKIE = ".AspNetCore.Identity.Application";
export const API_CSRF_COOKIE = "bite_routine_api_csrf";

export function apiUrl(path: string): URL {
  return new URL(path, process.env.BITE_ROUTINE_API_URL ?? "http://127.0.0.1:5080");
}

export function identityCookieFromResponse(response: Response): string | null {
  const header = response.headers.getSetCookie().find((value) => value.startsWith(`${IDENTITY_COOKIE}=`));
  return header?.split(";", 1)[0].slice(IDENTITY_COOKIE.length + 1) ?? null;
}

export async function apiCsrf(identityCookie?: string): Promise<{ token: string; cookie: string }> {
  const response = await fetch(apiUrl("/auth/antiforgery"), {
    headers: identityCookie ? { Cookie: identityCookie } : {},
    cache: "no-store",
  });
  if (!response.ok) throw new Error("API CSRF belirteci alınamadı.");
  const cookie = response.headers.getSetCookie()
    .find((value) => value.startsWith(`${API_CSRF_COOKIE}=`))
    ?.split(";", 1)[0];
  const { requestToken } = (await response.json()) as { requestToken?: string };
  if (!cookie || !requestToken) throw new Error("API CSRF belirteci eksik.");
  return { token: requestToken, cookie };
}
