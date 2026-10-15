import { randomBytes, timingSafeEqual } from "node:crypto";

export const CSRF_COOKIE = "bite_csrf";

export function createCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",", 1)[0];
  const protocol = forwardedProto === "https" ? "https" : url.protocol.slice(0, -1);
  return `${protocol}://${host}`;
}

function cookieValue(header: string | null, name: string): string | null {
  const item = header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : null;
}

export function hasValidCsrf(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (origin !== requestOrigin(request) || (fetchSite && fetchSite !== "same-origin")) return false;

  const token = request.headers.get("x-csrf-token");
  const cookie = cookieValue(request.headers.get("cookie"), CSRF_COOKIE);
  if (!token || !cookie || !/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{64}$/.test(cookie)) return false;
  return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(cookie, "hex"));
}
