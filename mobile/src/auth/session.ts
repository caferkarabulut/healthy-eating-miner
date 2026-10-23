import { apiOrigin } from "../api/catalog.ts";
import { registrationErrors, type FieldErrors } from "./feedback.ts";
export type Profile = { userId: string; email: string | null };
export type Tokens = { origin: string; accessToken: string; refreshToken: string; expiresAt: number };
export type SessionState = { status: "restoring" | "anonymous" | "authenticated" | "offline" | "storage-error"; profile?: Profile; message?: string };
export interface TokenStore { read(): Promise<string | null>; write(value: string): Promise<void>; clear(): Promise<void> }
export class AuthError extends Error {
  kind: "network" | "invalid" | "storage" | "cancelled" | "response";
  fields: FieldErrors;
  status?: number;
  constructor(message: string, kind: AuthError["kind"], fields: FieldErrors = {}) { super(message); this.kind = kind; this.fields = fields; }
}
export class SessionClient {
  private tokens: Tokens | null = null;
  private epoch = 0;
  private io: Promise<unknown> = Promise.resolve();
  private refreshing: { epoch: number; promise: Promise<void> } | null = null;
  private restoring: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  private state: SessionState = { status: "restoring" };
  private base: string | undefined;
  private store: TokenStore;
  private fetcher: typeof fetch;
  private now: () => number;
  constructor(base: string | undefined, store: TokenStore, fetcher: typeof fetch = fetch, now = Date.now) { this.base = base; this.store = store; this.fetcher = fetcher; this.now = now; }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(state: SessionState) { this.state = state; for (const listener of this.listeners) listener(); }
  private check(epoch: number) { if (epoch !== this.epoch) throw new AuthError("İşlem iptal edildi.", "cancelled"); }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.io.then(operation); this.io = task.catch(() => {}); return task;
  }
  private current(epoch: number): Tokens { this.check(epoch); if (!this.tokens) throw new AuthError("Oturumunuz sona erdi. Yeniden giriş yapın.", "invalid"); return this.tokens; }
  private async clear(epoch: number, message?: string) {
    this.check(epoch); this.tokens = null; this.emit({ status: "anonymous", ...(message ? { message } : {}) });
    try { await this.serial(async () => { this.check(epoch); await this.store.clear(); }); }
    catch (error) {
      if (error instanceof AuthError) throw error;
      this.check(epoch);
      const message = "Güvenli saklamadaki oturum temizlenemedi. Çıkışı tekrar deneyin.";
      this.emit({ status: "storage-error", message }); throw new AuthError(message, "storage");
    }
    this.check(epoch);
  }
  private async persist(tokens: Tokens, epoch: number) {
    this.check(epoch);
    try { await this.serial(async () => { this.check(epoch); await this.store.write(JSON.stringify(tokens)); }); }
    catch (error) {
      if (error instanceof AuthError) throw error;
      this.check(epoch); throw new AuthError("Oturum güvenli saklama alanına kaydedilemedi. Yeniden deneyin.", "storage");
    }
    this.check(epoch); this.tokens = tokens;
  }
  private unpack(body: unknown): Tokens {
    const b = body as Record<string, unknown> | null;
    if (!b || b.tokenType !== "Bearer" || typeof b.accessToken !== "string" || !b.accessToken || typeof b.refreshToken !== "string" || !b.refreshToken
      || typeof b.expiresIn !== "number" || !Number.isFinite(b.expiresIn) || b.expiresIn <= 0 || !Number.isSafeInteger(this.now() + b.expiresIn * 1000))
      throw new AuthError("Oturum yanıtı okunamadı. Yeniden deneyin.", "response");
    return { origin: apiOrigin(this.base), accessToken: b.accessToken, refreshToken: b.refreshToken, expiresAt: this.now() + b.expiresIn * 1000 };
  }
  private async request(path: string, init: RequestInit = {}) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
    try { return await this.fetcher(`${apiOrigin(this.base)}${path}`, { ...init, credentials: "omit", redirect: "error", cache: "no-store", signal: controller.signal }); }
    catch { throw new AuthError("Bağlantı kurulamadı. Oturumunuz silinmedi; yeniden deneyin.", "network"); }
    finally { clearTimeout(timer); }
  }
  private async json(response: Response): Promise<unknown> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([response.json(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AuthError("Sunucu yanıtı zamanında alınamadı. Yeniden deneyin.", "network")), 12000);
      })]);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError("Sunucu yanıtı okunamadı. Yeniden deneyin.", "response");
    } finally { clearTimeout(timer); }
  }
  async register(email: string, password: string) {
    const response = await this.request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
    if (!response.ok) {
      const fields = response.status === 400 ? registrationErrors(await response.json().catch(() => null)) : {};
      throw new AuthError(response.status >= 500 ? "Kayıt hizmetine ulaşılamadı. Yeniden deneyin." : "Kayıt oluşturulamadı. Bilgilerinizi kontrol edin.", "response", fields);
    }
  }
  async login(email: string, password: string) {
    const epoch = ++this.epoch; this.refreshing = null;
    const response = await this.request("/auth/login?useCookies=false", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
    this.check(epoch);
    if (!response.ok) throw new AuthError(response.status === 401 || response.status === 400 ? "E-posta veya şifre hatalı." : "Giriş hizmetine ulaşılamadı. Yeniden deneyin.", "response");
    await this.persist(this.unpack(await this.json(response)), epoch);
    try { await this.me(); } catch (error) { if (!(error instanceof AuthError) || !["network", "response"].includes(error.kind)) throw error; }
    this.check(epoch);
  }
  restore(): Promise<void> {
    if (this.restoring) return this.restoring;
    const epoch = this.epoch;
    this.restoring = (async () => {
      let raw: string | null;
      try { raw = await this.serial(() => this.store.read()); }
      catch { this.check(epoch); this.emit({ status: "storage-error", message: "Güvenli oturum okunamadı. Tekrar deneyin veya çıkış yapın." }); return; }
      this.check(epoch);
      if (!raw) { this.emit({ status: "anonymous" }); return; }
      try {
        const value = JSON.parse(raw) as Tokens;
        if (value.origin !== apiOrigin(this.base) || typeof value.accessToken !== "string" || !value.accessToken || typeof value.refreshToken !== "string" || !value.refreshToken || !Number.isSafeInteger(value.expiresAt)) throw new Error();
        this.tokens = value;
      } catch { await this.clear(epoch); return; }
      await this.me();
    })().catch(error => { if (error instanceof AuthError && error.kind === "cancelled") return; /* state exposes the recoverable error */ })
      .finally(() => { this.restoring = null; });
    return this.restoring;
  }
  private refresh(epoch: number): Promise<void> {
    this.check(epoch);
    if (this.refreshing?.epoch === epoch) return this.refreshing.promise;
    const token = this.tokens?.refreshToken;
    if (!token) return Promise.reject(new AuthError("Oturumunuz sona erdi. Yeniden giriş yapın.", "invalid"));
    const promise = (async () => {
      const response = await this.request("/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: token }) });
      this.check(epoch);
      if ([400, 401, 403].includes(response.status)) { await this.clear(epoch, "Oturumunuz sona erdi. Yeniden giriş yapın."); throw new AuthError("Oturumunuz sona erdi. Yeniden giriş yapın.", "invalid"); }
      if (!response.ok) throw new AuthError("Oturum yenilenemedi. Oturumunuz korundu; yeniden deneyin.", "network");
      await this.persist(this.unpack(await this.json(response)), epoch);
    })().finally(() => { if (this.refreshing?.promise === promise) this.refreshing = null; });
    this.refreshing = { epoch, promise }; return promise;
  }
  async me(): Promise<Profile> {
    const epoch = this.epoch;
    try {
      if (!this.tokens) throw new AuthError("Hesabınızı görmek için giriş yapın.", "invalid");
      if (this.tokens.expiresAt <= this.now() + 30000) await this.refresh(epoch);
      this.check(epoch);
      const used = this.current(epoch).accessToken;
      let response = await this.request("/me", { headers: { Authorization: `Bearer ${used}` } });
      this.check(epoch);
      if (response.status === 401) {
        if (this.current(epoch).accessToken === used) await this.refresh(epoch);
        this.check(epoch);
        response = await this.request("/me", { headers: { Authorization: `Bearer ${this.current(epoch).accessToken}` } });
        this.check(epoch);
        if (response.status === 401) { await this.clear(epoch, "Oturumunuz sona erdi. Yeniden giriş yapın."); throw new AuthError("Oturumunuz sona erdi. Yeniden giriş yapın.", "invalid"); }
      }
      if (!response.ok) throw new AuthError("Hesap bilgileri alınamadı. Oturumunuz korundu; yeniden deneyin.", "network");
      const profile = await this.json(response) as Profile;
      this.check(epoch);
      if (!profile || typeof profile.userId !== "string" || !(profile.email === null || typeof profile.email === "string")) throw new AuthError("Hesap yanıtı okunamadı. Yeniden deneyin.", "response");
      this.current(epoch);
      this.emit({ status: "authenticated", profile }); return profile;
    } catch (error) {
      this.check(epoch);
      if (this.tokens && error instanceof AuthError && error.kind !== "invalid") this.emit({ status: error.kind === "storage" ? "storage-error" : "offline", profile: this.state.profile, message: error.message });
      throw error;
    }
  }
  // Changes on login/logout; personal screens key their in-memory data to this version.
  getSessionVersion = () => this.epoch;
  async authorizedJson(path: string, init: RequestInit = {}): Promise<unknown> {
    if (!path.startsWith("/me/")) throw new AuthError("Geçersiz kişisel istek.", "response");
    const epoch = this.epoch;
    if (this.current(epoch).expiresAt <= this.now() + 30000) await this.refresh(epoch);
    const send = () => {
      const headers = new Headers(init.headers); headers.set("Authorization", `Bearer ${this.current(epoch).accessToken}`);
      return this.request(path, { ...init, headers });
    };
    const used = this.current(epoch).accessToken;
    let response = await send(); this.current(epoch);
    // A received 401 means authorization rejected the operation; never replay network/5xx failures.
    if (response.status === 401) {
      if (this.current(epoch).accessToken === used) await this.refresh(epoch);
      response = await send(); this.current(epoch);
      if (response.status === 401) {
        await this.clear(epoch, "Oturumunuz sona erdi. Yeniden giriş yapın.");
        throw new AuthError("Oturumunuz sona erdi. Yeniden giriş yapın.", "invalid");
      }
    }
    if (!response.ok) {
      const error = new AuthError(response.status === 400 ? "Miktar, gün ve öğün bilgilerini kontrol edin." : response.status === 404 ? "Gıda bulunamadı. Katalogdan yeniden seçin." : "İşlem sonucu alınamadı. Günlüğünüzü kontrol edin.", response.status >= 500 ? "network" : "response");
      error.status = response.status; throw error;
    }
    const body = await this.json(response); this.current(epoch); return body;
  }
  async logout() { const epoch = ++this.epoch; this.refreshing = null; await this.clear(epoch); }
}
