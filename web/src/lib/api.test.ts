import assert from "node:assert/strict";
import test from "node:test";
import { apiRequest, LEGACY_SESSION_EXPIRED } from "./api.ts";

test("legacy 401 clears old credentials and lets the mounted page route the expired session", async () => {
  const originals = { fetch: globalThis.fetch, window: Object.getOwnPropertyDescriptor(globalThis, "window"), storage: Object.getOwnPropertyDescriptor(globalThis, "localStorage") };
  const stored = new Map([["token", "legacy-test-token"], ["email", "legacy@example.test"]]);
  const target = new EventTarget();
  let expired = 0;
  target.addEventListener(LEGACY_SESSION_EXPIRED, () => expired++);
  Object.defineProperty(globalThis, "window", { value: target, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: { getItem: (key: string) => stored.get(key), removeItem: (key: string) => stored.delete(key) }, configurable: true });
  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal(new Headers(options?.headers).get("authorization"), "Bearer legacy-test-token");
      return new Response(null, { status: 401 });
    };
    assert.equal((await apiRequest("/profile")).status, 401);
    assert.equal(stored.size, 0);
    assert.equal(expired, 1);
  } finally {
    globalThis.fetch = originals.fetch;
    for (const [key, descriptor] of [["window", originals.window], ["localStorage", originals.storage]] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
