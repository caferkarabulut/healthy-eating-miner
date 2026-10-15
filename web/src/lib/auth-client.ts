import type { RegisterFieldErrors } from "./register-feedback.ts";

export class AuthRequestError extends Error {
  fieldErrors: RegisterFieldErrors;
  constructor(message: string, fieldErrors: RegisterFieldErrors = {}) {
    super(message); this.fieldErrors = fieldErrors;
  }
}
export async function authPost(path: "/api/auth/register" | "/api/auth/login" | "/api/auth/logout", body?: object, fetcher: typeof fetch = fetch): Promise<void> {
  const csrfResponse = await fetcher("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
  if (!csrfResponse.ok) throw new AuthRequestError("Güvenlik doğrulaması başlatılamadı. Yeniden deneyin.");
  const { token } = (await csrfResponse.json()) as { token: string };
  const response = await fetcher(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { error?: string; fieldErrors?: RegisterFieldErrors };
    throw new AuthRequestError(result.error ?? "İşlem tamamlanamadı.", result.fieldErrors);
  }
  if (path === "/api/auth/login" || path === "/api/auth/logout") {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("email");
    } catch {
      // Browser storage may be unavailable; the Identity session still uses only the cookie.
    }
  }
}
