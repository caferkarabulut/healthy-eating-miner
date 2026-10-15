import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.BITE_ROUTINE_SMOKE_URL ?? "http://127.0.0.1:3000";
const email = process.env.BITE_ROUTINE_SMOKE_EMAIL ?? `smoke-${randomUUID()}@example.test`;
const password = "SmokePassword1!";

function cookie(response, name) {
  return response.headers.getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .find((value) => value.startsWith(`${name}=`));
}

async function post(path, body = {}, extra = {}) {
  const csrfResponse = await fetch(`${base}/api/auth/csrf`);
  assert.equal(csrfResponse.status, 200);
  const { token } = await csrfResponse.json();
  return fetch(`${base}${path}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: extra.origin ?? base,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/json",
      "X-CSRF-Token": extra.noCsrf ? "" : token,
      Cookie: [cookie(csrfResponse, "bite_csrf"), extra.identity].filter(Boolean).join("; "),
    },
    body: JSON.stringify(body),
  });
}

let response = await fetch(`${base}/account`, { redirect: "manual" });
assert.equal(response.status, 307, "anonymous account access must redirect to login");

response = await post("/api/auth/register", { email, password });
assert.equal(response.status, 200, "registration must succeed");

response = await post("/api/auth/login", { email, password: "WrongPassword1!" });
assert.equal(response.status, 401, "wrong password must be rejected");

response = await post("/api/auth/login", { email, password }, { noCsrf: true });
assert.equal(response.status, 403, "missing CSRF token must be rejected");

response = await post("/api/auth/login", { email, password }, { origin: "http://evil.example" });
assert.equal(response.status, 403, "foreign origin must be rejected");

response = await post("/api/auth/login", { email, password });
assert.equal(response.status, 200, "login must succeed");
const identity = cookie(response, ".AspNetCore.Identity.Application");
assert.ok(identity, "Identity cookie must be present");
assert.match(response.headers.getSetCookie().join(";"), /httponly/i);
assert.deepEqual(await response.json(), { ok: true }, "no token may be returned to browser code");

response = await fetch(`${base}/account`, { redirect: "manual", headers: { Cookie: identity } });
assert.equal(response.status, 200, "account must be accessible with cookie");
assert.ok((await response.text()).includes(email), "account must display /me email");

response = await post("/api/auth/logout", {}, { identity });
assert.equal(response.status, 200, "logout must succeed");
assert.match(response.headers.getSetCookie().join(";"), /expires=Thu, 01 Jan 1970|Max-Age=0/i);

response = await fetch(`${base}/account`, { redirect: "manual" });
assert.equal(response.status, 307, "after logout, anonymous account access must redirect");

console.log("Auth HTTP smoke passed: registration, wrong password, CSRF, cookie login, /me account, logout.");
