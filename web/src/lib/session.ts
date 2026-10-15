export const IDENTITY_COOKIE = ".AspNetCore.Identity.Application";

export function apiUrl(path: string): URL {
  return new URL(path, process.env.BITE_ROUTINE_API_URL ?? "http://127.0.0.1:5080");
}

export function identityCookieFromResponse(response: Response): string | null {
  const header = response.headers.getSetCookie().find((value) => value.startsWith(`${IDENTITY_COOKIE}=`));
  return header?.split(";", 1)[0].slice(IDENTITY_COOKIE.length + 1) ?? null;
}
