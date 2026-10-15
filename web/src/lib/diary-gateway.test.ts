import assert from "node:assert/strict";
import test from "node:test";
import { diaryGet, diaryPost } from "./diary-gateway.ts";
import { IDENTITY_COOKIE } from "./session.ts";

const input = { mealId: 1, grams: 150.25, date: "2026-10-15" };
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
    return Response.json({ date: input.date, items: [] });
  };
  const response = await diaryGet(new Request(`https://bite.test/api/diary?date=${input.date}`, { headers: { Cookie: `extra=secret; ${cookie}` } }), fake);
  assert.equal(response.status, 200); privateResponse(response);
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
  for (const [req, status] of [[request(input, false), 403], [request(input, true, false), 401], [request({ ...input, grams: 1.234 }), 400], [request({ ...input, userId: "other" }), 400]] as const) {
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
