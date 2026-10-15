import type { DiaryEntry, DiaryInput, DiaryUpdate } from "./diary.ts";

export class DiaryError extends Error {
  status: number;
  uncertain: boolean;
  constructor(message: string, status = 0, uncertain = false) {
    super(message); this.status = status; this.uncertain = uncertain;
  }
}

export async function addDiaryEntry(input: DiaryInput, fetcher: typeof fetch = fetch): Promise<DiaryEntry> {
  let token: string;
  try {
    const csrf = await fetcher("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
    if (!csrf.ok) throw new Error();
    token = (await csrf.json()).token;
    if (!token) throw new Error();
  } catch { throw new DiaryError("Güvenlik doğrulaması başlatılamadı; kayıt gönderilmedi."); }

  let response: Response;
  try {
    response = await fetcher("/api/diary", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify(input),
    });
  } catch { throw new DiaryError("Kayıt ulaşmış olabilir. Tekrar eklemeden önce günlüğü kontrol edin.", 0, true); }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new DiaryError(body?.error ?? "Kayıt tamamlanamadı.", response.status, body?.uncertain ?? response.status >= 500);
  if (!body?.id) throw new DiaryError("Kayıt sonucu doğrulanamadı. Günlüğü kontrol edin.", 0, true);
  return body as DiaryEntry;
}

export async function changeDiaryEntry(id: string, input: DiaryUpdate | null, fetcher: typeof fetch = fetch): Promise<void> {
  let token: string;
  try {
    const csrf = await fetcher("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
    if (!csrf.ok) throw new Error();
    token = (await csrf.json()).token;
    if (!token) throw new Error();
  } catch { throw new DiaryError("Güvenlik doğrulaması başlatılamadı; değişiklik gönderilmedi."); }

  let response: Response;
  try {
    response = await fetcher(`/api/diary/${encodeURIComponent(id)}`, {
      method: input === null ? "DELETE" : "PATCH", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      ...(input === null ? {} : { body: JSON.stringify(input) }),
    });
  } catch { throw new DiaryError("İşlem tamamlanmış olabilir. Günlüğü yenileyip kontrol edin.", 0, true); }
  if (input === null && response.status === 204) return;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new DiaryError(body?.error ?? "Değişiklik tamamlanamadı.", response.status, body?.uncertain ?? response.status >= 500);
  if (input === null || !body?.id) throw new DiaryError("İşlem sonucu doğrulanamadı. Günlüğü yenileyip kontrol edin.", 0, true);
}
