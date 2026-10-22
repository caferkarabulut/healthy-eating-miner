import { SessionClient, AuthError, type TokenStore, type Tokens } from "../src/auth/session";
import { response } from "./fixtures";
const origin = "http://localhost:5080";
const bundle = (access = "opaque-access", refresh = "opaque-refresh", seconds = 3600) => ({ tokenType: "Bearer", accessToken: access, refreshToken: refresh, expiresIn: seconds });
const profile = { userId: "u1", email: "test@example.test" };
function memory(initial: string | null = null) {
  let value = initial;
  return { read: jest.fn(async () => value), write: jest.fn(async (v: string) => { value = v; }), clear: jest.fn(async () => { value = null; }), value: () => value };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
async function until(check: () => boolean) { for (let i = 0; i < 100 && !check(); i++) await Promise.resolve(); expect(check()).toBe(true); }
function setup() {
  const store = memory(); let time = 100000;
  const fetcher = jest.fn(async (url: RequestInfo | URL) => response(String(url).includes("/auth/login") ? bundle() : profile)) as jest.MockedFunction<typeof fetch>;
  return { store, fetcher, client: new SessionClient(origin, store, fetcher, () => time), advance: () => { time += 3600000; } };
}
test("opaque bearer login persists only tokens and expiry; a new app instance restores through /me", async () => {
  const { client, store, fetcher } = setup(); await client.login("test@example.test", "NotStored1!");
  expect(client.getSnapshot()).toEqual({ status: "authenticated", profile });
  expect(store.value()).not.toMatch(/NotStored1|example.test/);
  expect(fetcher.mock.calls.every(([, init]) => init?.credentials === "omit")).toBe(true);
  expect(new Headers(fetcher.mock.calls.at(-1)![1]?.headers).get("Authorization")).toBe("Bearer opaque-access");
  const restored = new SessionClient(origin, store, fetcher, () => 100000); await restored.restore();
  expect(restored.getSnapshot().profile).toEqual(profile);
});
test("concurrent expiry shares exactly one refresh and uses its rotated pair", async () => {
  const { client, fetcher, advance, store } = setup(); await client.login("x", "y"); advance();
  const gate = deferred<Response>();
  fetcher.mockImplementation(async url => String(url).endsWith("/auth/refresh") ? gate.promise : response(profile));
  const one = client.me(), two = client.me();
  await until(() => fetcher.mock.calls.some(([url]) => String(url).endsWith("/auth/refresh")));
  gate.resolve(response(bundle("new-access", "new-refresh"))); await Promise.all([one, two]);
  expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"))).toHaveLength(1);
  expect(JSON.parse(store.value()!).refreshToken).toBe("new-refresh");
});
test("concurrent access 401s refresh once, including a late old-token response", async () => {
  const { client, fetcher } = setup(); await client.login("x", "y");
  const late = deferred<Response>(); let reads = 0;
  fetcher.mockImplementation(async (url, init) => {
    if (String(url).endsWith("/auth/refresh")) return response(bundle("new-access"));
    if (new Headers(init?.headers).get("Authorization") === "Bearer opaque-access") return ++reads === 1 ? response({}, 401) : late.promise;
    return response(profile);
  });
  const one = client.me(), two = client.me(); await one; late.resolve(response({}, 401)); await two;
  expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"))).toHaveLength(1);
});
test.each([400, 401, 403])("invalid refresh %s clears session without a loop", async status => {
  const { client, fetcher, advance, store } = setup(); await client.login("x", "y"); advance();
  fetcher.mockResolvedValue(response({}, status)); await expect(client.me()).rejects.toBeInstanceOf(AuthError);
  expect(store.value()).toBeNull(); expect(client.getSnapshot().status).toBe("anonymous");
});
test("refresh network/503 and /me network failure keep the securely saved session", async () => {
  const { client, fetcher, advance, store } = setup(); await client.login("x", "y"); const saved = store.value();
  fetcher.mockRejectedValueOnce(new Error("private transport detail")); await expect(client.me()).rejects.toMatchObject({ kind: "network" });
  expect(store.value()).toBe(saved); expect(client.getSnapshot().status).toBe("offline");
  advance(); fetcher.mockResolvedValueOnce(response({}, 503)); await expect(client.me()).rejects.toMatchObject({ kind: "network" });
  expect(store.value()).toBe(saved);
  fetcher.mockImplementation(async url => response(String(url).endsWith("/auth/refresh") ? bundle("recovered") : profile));
  await client.me(); expect(client.getSnapshot().status).toBe("authenticated");
});
test.each(["refresh", "login", "me"])("logout invalidates late %s responses", async kind => {
  const { client, fetcher, store, advance } = setup(); await client.login("x", "y");
  const gate = deferred<Response>();
  fetcher.mockImplementation(async () => gate.promise);
  if (kind === "refresh") advance();
  const request = kind === "login" ? client.login("another", "password") : client.me();
  const rejected = expect(request).rejects.toMatchObject({ kind: "cancelled" });
  await until(() => fetcher.mock.calls.length >= (kind === "login" ? 3 : 3));
  await client.logout(); gate.resolve(response(kind === "me" ? profile : bundle())); await rejected;
  expect(store.value()).toBeNull(); expect(client.getSnapshot().status).toBe("anonymous");
});
test("queued secure writes cannot restore tokens after logout", async () => {
  const store = memory(); const gate = deferred<void>();
  store.write.mockImplementationOnce(async v => { await gate.promise; await store.write(v); });
  const fetcher = jest.fn(async (_url: RequestInfo | URL) => response(bundle())) as jest.MockedFunction<typeof fetch>;
  const client = new SessionClient(origin, store, fetcher);
  const login = client.login("x", "y"); const rejected = expect(login).rejects.toMatchObject({ kind: "cancelled" });
  await until(() => store.write.mock.calls.length === 1);
  const logout = client.logout(); gate.resolve(); await Promise.all([rejected, logout]);
  expect(store.value()).toBeNull(); expect(client.getSnapshot().status).toBe("anonymous");
});
test("late restoration, invalid storage and foreign origin cannot resurrect or transmit a session", async () => {
  const stored: Tokens = { origin, accessToken: "opaque", refreshToken: "refresh", expiresAt: Date.now() + 3600000 };
  const store = memory(JSON.stringify(stored)); const read = deferred<string | null>(); store.read.mockReturnValueOnce(read.promise);
  const fetcher = jest.fn() as jest.MockedFunction<typeof fetch>; const client = new SessionClient(origin, store, fetcher);
  const restoring = client.restore(); await until(() => store.read.mock.calls.length === 1);
  const logout = client.logout(); read.resolve(JSON.stringify(stored)); await Promise.all([restoring, logout]);
  expect(store.value()).toBeNull(); expect(fetcher).not.toHaveBeenCalled();
  const foreign = memory(JSON.stringify({ ...stored, origin: "https://other.test" })); await new SessionClient(origin, foreign, fetcher).restore();
  expect(foreign.value()).toBeNull(); expect(fetcher).not.toHaveBeenCalled();
});
test("storage failures are explicit and never fall back to plaintext; logout can retry deletion", async () => {
  const { client, store } = setup(); await client.login("x", "y");
  store.clear.mockRejectedValueOnce(new Error("keychain locked")); await expect(client.logout()).rejects.toMatchObject({ kind: "storage" });
  expect(client.getSnapshot().status).toBe("storage-error"); await client.logout(); expect(store.value()).toBeNull();
  store.write.mockRejectedValueOnce(new Error("keychain full")); await expect(client.login("x", "y")).rejects.toMatchObject({ kind: "storage" });
  expect(client.getSnapshot().status).not.toBe("authenticated");
});
test("registration maps codes but never renders raw server descriptions or adds email domain rules", async () => {
  const store: TokenStore = memory(); const fetcher = jest.fn(async (_url: RequestInfo | URL) => response({ errors: { PasswordTooShort: ["private description"], Secret: ["secret"] } }, 400)) as jest.MockedFunction<typeof fetch>;
  const client = new SessionClient(origin, store, fetcher);
  await expect(client.register("test@domain.technology", "weak")).rejects.toMatchObject({ fields: { password: "Şifre en az 8 karakter olmalı." } });
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).email).toBe("test@domain.technology");
  expect(store.write).not.toHaveBeenCalled();
});

test("failed replacement login on a network error preserves the previous session", async () => {
  const { client, fetcher, store } = setup();
  await client.login("x", "y");
  const saved = store.value();
  fetcher.mockRejectedValueOnce(new Error("offline"));
  await expect(client.login("other", "password")).rejects.toMatchObject({ kind: "network" });
  expect(store.value()).toBe(saved);
  expect(client.getSnapshot()).toEqual({ status: "authenticated", profile });
  await client.me();
  expect(client.getSnapshot().profile).toEqual(profile);
});

test("a second /me 401 clears the session without repeated refresh", async () => {
  const { client, fetcher, store } = setup();
  await client.login("x", "y");
  fetcher.mockImplementation(async url => response(String(url).endsWith("/auth/refresh") ? bundle("replacement") : {}, String(url).endsWith("/auth/refresh") ? 200 : 401));
  await expect(client.me()).rejects.toMatchObject({ kind: "invalid" });
  expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"))).toHaveLength(1);
  expect(store.value()).toBeNull();
  expect(client.getSnapshot().status).toBe("anonymous");
});

test("late successful /me cannot authenticate after another request clears invalid refresh", async () => {
  const { client, fetcher, store } = setup();
  await client.login("x", "y");
  const late = deferred<Response>();
  let reads = 0;
  fetcher.mockImplementation(async url => {
    if (String(url).endsWith("/auth/refresh")) return response({}, 401);
    return ++reads === 1 ? late.promise : response({}, 401);
  });
  const old = client.me();
  const oldRejected = expect(old).rejects.toMatchObject({ kind: "invalid" });
  await expect(client.me()).rejects.toMatchObject({ kind: "invalid" });
  late.resolve(response(profile));
  await oldRejected;
  expect(store.value()).toBeNull();
  expect(client.getSnapshot().status).toBe("anonymous");
});
