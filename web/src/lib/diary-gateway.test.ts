import assert from "node:assert/strict";
import test from "node:test";
import { diaryGet, diaryPost, diaryMutate } from "./diary-gateway.ts";
import { IDENTITY_COOKIE } from "./session.ts";

const input = { mealId: 1, grams: 150.25, date: "2026-10-15", mealSlot: "breakfast" };
const token = "a".repeat(64);
const cookie = `${IDENTITY_COOKIE}=opaque-session`;
function request(body: unknown = input, csrf = true, identity = true) {
  return new Request("https://bite.test/api/diary", {
    method: "POST", headers: {
      Origin: "https://bite.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json",
      Cookie: `bite_csrf=${token}${identity ? `; ${cookie}` : ""}`, ...(csrf ? { "X-CSRF-Token": token } : {}),
    }, body: JSON.stringify(body),
  });
}
function privateResponse(response: Response) {
  assert.match(response.headers.get("cache-control")!, /private.*no-store/);
  assert.equal(response.headers.get("vary"), "Cookie");
}

test("GET forwards only Identity cookie and never caches personal data", async () => {
  const fake: typeof fetch = async (url, init) => {
    assert.match(String(url), /\/me\/diary-entries\?date=2026-10-15$/);
    assert.equal(new Headers(init?.headers).get("cookie"), cookie);
    assert.equal(init?.cache, "no-store");
    return Response.json({ date: input.date, items: [], summary: { entryCount: 2, caloriesKcal: 196.779209, proteinG: null, carbsG: 0, fatG: 0.83325 } });
  };
  const response = await diaryGet(new Request(`https://bite.test/api/diary?date=${input.date}`, { headers: { Cookie: `extra=secret; ${cookie}` } }), fake);
  assert.equal(response.status, 200); privateResponse(response);
  assert.deepEqual((await response.json()).summary, { entryCount: 2, caloriesKcal: 196.779209, proteinG: null, carbsG: 0, fatG: 0.83325 });
});

test("GET rejects anonymous access and propagates expiration without caching", async () => {
  let calls = 0;
  const fake: typeof fetch = async () => { calls++; return new Response(null, { status: 401 }); };
  const anonymous = await diaryGet(new Request(`https://bite.test/api/diary?date=${input.date}`), fake);
  assert.equal(anonymous.status, 401); assert.equal(calls, 0); privateResponse(anonymous);
  const expired = await diaryGet(new Request(`https://bite.test/api/diary?date=${input.date}`, { headers: { Cookie: cookie } }), fake);
  assert.equal(expired.status, 401); privateResponse(expired);
});

test("POST rejects CSRF, missing session and invalid payload before calling API", async () => {
  const fake: typeof fetch = async () => { throw new Error("must not call API"); };
  for (const [req, status] of [[request(input, false), 403], [request(input, true, false), 401], [request({ ...input, grams: 1.234 }), 400], [request({ ...input, userId: "other" }), 400], [request({ ...input, mealSlot: "brunch" }), 400], [request({ ...input, mealSlot: null }), 400]] as const) {
    const response = await diaryPost(req, fake);
    assert.equal(response.status, status); privateResponse(response);
  }
});

test("POST forwards both API antiforgery parts and numeric grams with no browser token response", async () => {
  let calls = 0;
  const fake: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(init?.cache, "no-store");
    const headers = new Headers(init?.headers);
    if (String(url).endsWith("/auth/antiforgery")) {
      assert.equal(headers.get("cookie"), cookie);
      return Response.json({ requestToken: "api-token" }, { headers: { "Set-Cookie": "bite_routine_api_csrf=api-cookie; HttpOnly" } });
    }
    assert.equal(headers.get("x-bite-routine-api-csrf"), "api-token");
    assert.equal(headers.get("cookie"), `${cookie}; bite_routine_api_csrf=api-cookie`);
    assert.deepEqual(JSON.parse(String(init?.body)), input);
    return Response.json({ id: "entry", ...input }, { status: 201 });
  };
  const response = await diaryPost(request(), fake);
  assert.equal(response.status, 201); assert.equal(calls, 2); privateResponse(response);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal((await response.json()).requestToken, undefined);
});

test("lost POST response is uncertain and is never retried", async () => {
  let posts = 0;
  const fake: typeof fetch = async (url) => {
    if (String(url).endsWith("/auth/antiforgery")) return Response.json({ requestToken: "api-token" }, { headers: { "Set-Cookie": "bite_routine_api_csrf=cookie" } });
    posts++; throw new Error("lost response");
  };
  const response = await diaryPost(request(), fake);
  assert.equal(response.status, 502); assert.equal(posts, 1);
  assert.equal((await response.json()).uncertain, true); privateResponse(response);
});

const entryId = "12345678-1234-1234-1234-123456789abc";
function mutation(method: "PATCH" | "DELETE", body: unknown = { grams: 175.25, date: input.date, mealSlot: "dinner" }, csrf = true, identity = true, origin = "https://bite.test") {
  const headers = new Headers(request(body, csrf, identity).headers);
  headers.set("origin", origin);
  return new Request(`https://bite.test/api/diary/${entryId}`, { method, headers, ...(method === "PATCH" ? { body: JSON.stringify(body) } : {}) });
}

test("PATCH and DELETE reject CSRF, foreign origins and anonymous sessions before forwarding", async () => {
  const fake: typeof fetch = async () => { throw new Error("must not call API"); };
  for (const method of ["PATCH", "DELETE"] as const) {
    for (const [req, status] of [
      [mutation(method, undefined, false), 403], [mutation(method, undefined, true, false), 401],
      [mutation(method, undefined, true, true, "https://evil.test"), 403],
    ] as const) {
      const response = await diaryMutate(req, entryId, fake);
      assert.equal(response.status, status); privateResponse(response);
    }
  }
  for (const body of [{ grams: 100, date: input.date, mealSlot: "brunch" }, { grams: 100, date: input.date, mealSlot: null }, { grams: 1.234, date: input.date }, { grams: 0, date: input.date }, { grams: 100, date: "2026-02-30" }, { grams: "150,25", date: input.date }, { grams: 100, date: input.date, mealId: 2 }, { grams: 100 }, {}]) {
    assert.equal((await diaryMutate(mutation("PATCH", body), entryId, fake)).status, 400);
  }
  assert.equal((await diaryMutate(mutation("DELETE"), "../auth/logout", fake)).status, 404);
});

test("PATCH and DELETE forward only session and both API CSRF parts without caching", async () => {
  for (const method of ["PATCH", "DELETE"] as const) {
    let writes = 0;
    const fake: typeof fetch = async (url, init) => {
      assert.equal(init?.cache, "no-store");
      const headers = new Headers(init?.headers);
      if (String(url).endsWith("/auth/antiforgery")) return Response.json({ requestToken: "api-token" }, { headers: { "Set-Cookie": "bite_routine_api_csrf=api-cookie; HttpOnly" } });
      writes++;
      assert.match(String(url), new RegExp(`/me/diary-entries/${entryId}$`));
      assert.equal(init?.method, method);
      assert.equal(headers.get("cookie"), `${cookie}; bite_routine_api_csrf=api-cookie`);
      assert.equal(headers.get("x-bite-routine-api-csrf"), "api-token");
      assert.equal(headers.get("x-csrf-token"), null);
      if (method === "DELETE") { assert.equal(init?.body, undefined); return new Response(null, { status: 204 }); }
      assert.deepEqual(JSON.parse(String(init?.body)), { grams: 175.25, date: input.date, mealSlot: "dinner" });
      return Response.json({ id: entryId, grams: 175.25 });
    };
    const response = await diaryMutate(mutation(method), entryId, fake);
    assert.equal(response.status, method === "DELETE" ? 204 : 200); privateResponse(response);
    assert.equal(writes, 1); assert.equal(response.headers.get("set-cookie"), null);
    if (method === "DELETE") assert.equal(await response.text(), "");
  }
});

test("mutation errors preserve 400/401/403/404 and uncertain failures are never retried", async () => {
  for (const method of ["PATCH", "DELETE"] as const) {
    for (const status of [400, 401, 403, 404, 500, 0]) {
      let writes = 0;
      const fake: typeof fetch = async (url) => {
        if (String(url).endsWith("/auth/antiforgery")) return Response.json({ requestToken: "api-token" }, { headers: { "Set-Cookie": "bite_routine_api_csrf=api-cookie" } });
        writes++;
        if (!status) throw new Error("lost reply");
        return new Response(null, { status });
      };
      const response = await diaryMutate(mutation(method), entryId, fake);
      assert.equal(response.status, status === 0 || status === 500 ? 502 : status);
      assert.equal(Boolean((await response.json()).uncertain), status === 0 || status === 500);
      assert.equal(writes, 1); privateResponse(response);
    }
  }
});
