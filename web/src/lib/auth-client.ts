export async function authPost(path: "/api/auth/register" | "/api/auth/login" | "/api/auth/logout", body?: object): Promise<void> {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
  if (!csrfResponse.ok) throw new Error("Güvenlik doğrulaması başlatılamadı.");
  const { token } = (await csrfResponse.json()) as { token: string };
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(result.error ?? "İşlem tamamlanamadı.");
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
