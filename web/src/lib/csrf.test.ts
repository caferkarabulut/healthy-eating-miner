import assert from "node:assert/strict";
import test from "node:test";
import { createCsrfToken, CSRF_COOKIE, hasValidCsrf } from "./csrf.ts";

function request(token: string, options: { cookie?: string; header?: string; origin?: string; site?: string } = {}) {
  return new Request("https://bite.example/api/auth/logout", {
    method: "POST",
    headers: {
      Origin: options.origin ?? "https://bite.example",
      "Sec-Fetch-Site": options.site ?? "same-origin",
      Cookie: `${CSRF_COOKIE}=${options.cookie ?? token}`,
      "X-CSRF-Token": options.header ?? token,
    },
  });
}

test("accepts a same-origin mutation with a matching CSRF token", () => {
  const token = createCsrfToken();
  assert.equal(token.length, 64);
  assert.equal(hasValidCsrf(request(token)), true);
});

test("rejects a missing, mismatched or malformed token", () => {
  const token = createCsrfToken();
  assert.equal(hasValidCsrf(request(token, { header: createCsrfToken() })), false);
  assert.equal(hasValidCsrf(request(token, { cookie: "bad" })), false);
  const noHeader = new Request("https://bite.example/api/auth/logout", { method: "POST", headers: { Origin: "https://bite.example" } });
  assert.equal(hasValidCsrf(noHeader), false);
});

test("rejects a foreign origin or fetch site even with a known token", () => {
  const token = createCsrfToken();
  assert.equal(hasValidCsrf(request(token, { origin: "https://evil.example" })), false);
  assert.equal(hasValidCsrf(request(token, { site: "same-site" })), false);
  assert.equal(hasValidCsrf(request(token, { site: "cross-site" })), false);
});

test("uses the public Host when Next passes an internal request URL", () => {
  const token = createCsrfToken();
  const request = new Request("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: {
      Host: "127.0.0.1:3000", Origin: "http://127.0.0.1:3000", Cookie: `${CSRF_COOKIE}=${token}`, "X-CSRF-Token": token,
    },
  });
  assert.equal(hasValidCsrf(request), true);
});
