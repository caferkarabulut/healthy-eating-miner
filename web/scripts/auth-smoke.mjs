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
    method: extra.method ?? "POST",
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

const catalog = await (await fetch(`${api}/meals?pageSize=1`)).json();
assert.ok(catalog.items.length, "diary smoke requires seeded catalog");
const diaryInput = { mealId: catalog.items[0].mealId, grams: 150.25, date: "2026-10-15", mealSlot: "breakfast" };
async function favorites(session) {
  const response = await fetch(`${base}/api/favorites?page=1&pageSize=20`, { headers: { Cookie: session }, cache: "no-store" });
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /private.*no-store/);
  return response.json();
}
const favoritePath = `/api/favorites/${diaryInput.mealId}`;
assert.equal((await fetch(`${base}/api/favorites`)).status, 401);
for (const method of ["PUT", "DELETE"]) {
  assert.equal((await post(favoritePath, {}, { identity, method, noCsrf: true })).status, 403);
  assert.equal((await post(favoritePath, {}, { identity, method, origin: "https://evil.test" })).status, 403);
  assert.equal((await fetch(`${api}/me/favorite-meals/${diaryInput.mealId}`, { method, headers: { Cookie: identity } })).status, 403);
}
for (let i = 0; i < 2; i++) assert.equal((await post(favoritePath, {}, { identity, method: "PUT" })).status, 204);
assert.equal((await favorites(identity)).totalCount, 1);
assert.equal((await favorites(identity)).items[0].mealId, diaryInput.mealId);
assert.equal((await post("/api/favorites/2147483647", {}, { identity, method: "PUT" })).status, 404);

response = await fetch(`${base}/api/diary?date=${diaryInput.date}`);
assert.equal(response.status, 401);
assert.match(response.headers.get("cache-control"), /no-store/);
response = await post("/api/diary", diaryInput, { identity, noCsrf: true });
assert.equal(response.status, 403);
response = await post("/api/diary", diaryInput, { identity });
assert.equal(response.status, 201, "diary gateway must create with both CSRF layers");
assert.match(response.headers.get("cache-control"), /private.*no-store/);
const saved = await response.json();
assert.equal(saved.mealSlot, "breakfast");
async function day(session, date = diaryInput.date) {
  const response = await fetch(`${base}/api/diary?date=${date}`, { headers: { Cookie: session }, cache: "no-store" });
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /private.*no-store/);
  const result = await response.json();
  assert.equal(result.summary.entryCount, result.items.length);
  for (const field of ["caloriesKcal", "proteinG", "carbsG", "fatG"]) {
    if (result.items.some((item) => item.nutrition[field] === null)) assert.equal(result.summary[field], null);
    else {
      const expected = result.items.reduce((total, item) => total + item.nutrition[field], 0);
      assert.ok(typeof result.summary[field] === "number" && Math.abs(result.summary[field] - expected) < 1e-9, `summary ${field} must match current entries`);
    }
  }
  return result;
}
async function history(session, endDate = diaryInput.date) {
  const response = await fetch(`${base}/api/diary-summary?endDate=${endDate}`, { headers: { Cookie: session }, cache: "no-store" });
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.ok(response.headers.get("vary").split(",").some((value) => value.trim().toLowerCase() === "cookie"));
  const result = await response.json();
  assert.equal(result.days.length, 7);
  assert.equal(result.days[6].date, endDate);
  for (let i = 1; i < 7; i++) assert.ok(result.days[i - 1].date < result.days[i].date);
  assert.deepEqual(result.days[6].summary, (await day(session, endDate)).summary);
  return result;
}
assert.equal((await fetch(`${base}/api/diary-summary?endDate=${diaryInput.date}`)).status, 401);
assert.equal((await history(identity)).days[6].summary.entryCount, 1);
assert.equal((await history(identity)).days[0].summary.entryCount, 0);
assert.equal((await day(identity)).items[0].id, saved.id, "GET after POST must preserve entry");
assert.equal((await day(identity)).items[0].grams, 150.25);
assert.equal((await day(identity, "2026-10-16")).items.length, 0, "another day must be empty");
const secondEmail = email.replace("@", "-second@");
assert.equal((await post("/api/auth/register", { email: secondEmail, password })).status, 200);
response = await post("/api/auth/login", { email: secondEmail, password });
assert.equal(response.status, 200);
const secondIdentity = cookie(response, ".AspNetCore.Identity.Application");
assert.equal((await favorites(secondIdentity)).totalCount, 0, "favorites must be user scoped");
assert.equal((await post(favoritePath, {}, { identity: secondIdentity, method: "PUT" })).status, 204);
for (let i = 0; i < 2; i++) assert.equal((await post(favoritePath, {}, { identity, method: "DELETE" })).status, 204);
assert.equal((await favorites(identity)).totalCount, 0);
assert.equal((await favorites(secondIdentity)).totalCount, 1, "removing another user's favorite is impossible");
assert.equal((await day(secondIdentity)).items.length, 0, "second user must not see first user's entry");
assert.equal((await post("/api/diary", { ...diaryInput, grams: 75 }, { identity: secondIdentity })).status, 201);
assert.equal((await day(secondIdentity)).items[0].grams, 75);
assert.equal((await day(identity)).items.length, 1, "first user's diary must stay separate");
assert.equal((await day(identity)).items[0].grams, 150.25);

assert.notDeepEqual((await history(identity)).days[6].summary, (await history(secondIdentity)).days[6].summary);
const beforeSlotChange = await day(identity);
assert.equal((await post(`/api/diary/${saved.id}`, { grams: diaryInput.grams, date: diaryInput.date, mealSlot: "dinner" }, { identity, method: "PATCH" })).status, 200);
const afterSlotChange = await day(identity);
assert.equal(afterSlotChange.items[0].mealSlot, "dinner");
assert.deepEqual(afterSlotChange.summary, beforeSlotChange.summary, "slot-only change preserves all daily totals");

const updatedInput = { grams: 175.25, date: "2026-10-17" };
const entryPath = `/api/diary/${saved.id}`;
for (const method of ["PATCH", "DELETE"]) {
  assert.equal((await post(entryPath, updatedInput, { identity, method, noCsrf: true })).status, 403);
  assert.equal((await post(entryPath, updatedInput, { identity, method, origin: "https://evil.test" })).status, 403);
  assert.equal((await post(entryPath, updatedInput, { identity: secondIdentity, method })).status, 404, "other users must not mutate entries");
  const direct = await fetch(`${api}/me/diary-entries/${saved.id}`, {
    method, headers: { Cookie: identity, "Content-Type": "application/json" },
    ...(method === "PATCH" ? { body: JSON.stringify(updatedInput) } : {}),
  });
  assert.equal(direct.status, 403, "direct cookie mutation requires API antiforgery");
}
assert.equal((await post(entryPath, { ...updatedInput, grams: 1.234 }, { identity, method: "PATCH" })).status, 400);
assert.equal((await post(entryPath, updatedInput, { identity, method: "PATCH" })).status, 200);
assert.equal((await day(identity)).items.length, 0, "edited date removes entry from old day");
const edited = (await day(identity, updatedInput.date)).items[0];
const movedHistory = await history(identity, updatedInput.date);
assert.equal(movedHistory.days[6].summary.entryCount, 1);
assert.equal(movedHistory.days.find((day) => day.date === diaryInput.date).summary.entryCount, 0);
assert.equal(edited.grams, updatedInput.grams);
assert.equal(edited.mealSlot, "dinner", "omitted PATCH slot preserves current value");
assert.equal(edited.mealName, saved.mealName);
assert.equal(edited.sourceUrl, saved.sourceUrl);
assert.equal((await post(entryPath, {}, { identity, method: "DELETE" })).status, 204);
assert.equal((await day(identity, updatedInput.date)).items.length, 0, "deletion must persist after GET");
assert.equal((await history(identity, updatedInput.date)).days[6].summary.entryCount, 0);
assert.equal((await history(secondIdentity)).days[6].summary.entryCount, 1);
assert.equal((await post(entryPath, {}, { identity, method: "DELETE" })).status, 404);
assert.equal((await day(secondIdentity)).items.length, 1, "other user's record is preserved");

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
for (const method of ["PUT", "DELETE"]) {
  const mobile = await fetch(`${api}/me/favorite-meals/${diaryInput.mealId}`, { method, headers: { Authorization: `Bearer ${accessToken}` } });
  assert.equal(mobile.status, 204, "mobile favorites work without cookie CSRF");
}
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

console.log("HTTP smoke passed: private seven-day history, private/idempotent favorites, auth, diary summary/create/edit/delete/persistence/date/user isolation, direct API CSRF rejection, mobile bearer.");
