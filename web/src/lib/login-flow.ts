import { authPost, AuthRequestError } from "./auth-client.ts";
export async function loginToCatalog(credentials: { email: string; password: string }, fetcher: typeof fetch = fetch) {
  await authPost("/api/auth/login", credentials, fetcher);
  const response = await fetcher("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new AuthRequestError("Oturum doğrulanamadı. Yeniden giriş yapın.");
  return "/";
}
