import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.BITE_ROUTINE_SMOKE_URL ?? "http://127.0.0.1:3000";
const api = process.env.BITE_ROUTINE_API_URL ?? "http://127.0.0.1:5080";
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

response = await fetch(`${api}/auth/login?useCookies=true`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base },
  body: JSON.stringify({ email, password }),
});
assert.equal(response.status, 403, "direct cookie login without API CSRF must be rejected");

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

response = await fetch(`${api}/auth/logout`, {
  method: "POST",
  headers: { Cookie: identity, Origin: base },
});
assert.equal(response.status, 403, "direct cookie logout without API CSRF must be rejected");
response = await fetch(`${base}/account`, { redirect: "manual", headers: { Cookie: identity } });
assert.equal(response.status, 200, "rejected direct logout must preserve the session");

response = await fetch(`${api}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
assert.equal(response.status, 200, "mobile bearer login must succeed without CSRF");
const { accessToken, refreshToken } = await response.json();
assert.ok(accessToken && refreshToken);
response = await fetch(`${api}/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
assert.equal(response.status, 200, "mobile bearer profile must work");
response = await fetch(`${api}/auth/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ refreshToken }),
});
assert.equal(response.status, 200, "mobile bearer refresh must work without CSRF");
const refreshed = await response.json();
response = await fetch(`${api}/me`, { headers: { Authorization: `Bearer ${refreshed.accessToken}` } });
assert.equal(response.status, 200, "refreshed mobile bearer token must work");

response = await post("/api/auth/logout", {}, { identity });
assert.equal(response.status, 200, "logout must succeed");
assert.match(response.headers.getSetCookie().join(";"), /expires=Thu, 01 Jan 1970|Max-Age=0/i);

response = await fetch(`${base}/account`, { redirect: "manual" });
assert.equal(response.status, 307, "after logout, anonymous account access must redirect");

console.log("Auth HTTP smoke passed: gateway session, direct API CSRF rejection, mobile bearer login/refresh.");
