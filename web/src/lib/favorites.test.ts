import assert from "node:assert/strict";
import test from "node:test";
import { favoritesGet, favoritesMutate } from "./favorites-gateway.ts";
import { FavoriteError, readFavorites, setFavorite } from "./favorites-client.ts";
import { IDENTITY_COOKIE } from "./session.ts";

const token = "a".repeat(64);
const cookie = `${IDENTITY_COOKIE}=session`;
function request(method = "GET", csrf = true, identity = true, origin = "https://bite.test") {
  return new Request("https://bite.test/api/favorites?page=2&pageSize=1&search=%C3%A7i%C4%9F", {
    method, headers: { Origin: origin, "Sec-Fetch-Site": "same-origin",
      Cookie: `bite_csrf=${token}${identity ? `; ${cookie}` : ""}`,
      ...(csrf ? { "X-CSRF-Token": token } : {}) },
  });
}
function privateResponse(response: Response) {
  assert.match(response.headers.get("cache-control")!, /private.*no-store/);
  assert.equal(response.headers.get("vary"), "Cookie");
}

test("favorite GET forwards pagination/search and only Identity, without caching", async () => {
  const fake: typeof fetch = async (url, init) => {
    assert.equal(new URL(String(url)).searchParams.get("page"), "2");
    assert.equal(new URL(String(url)).searchParams.get("search"), "çiğ");
    assert.equal(new Headers(init?.headers).get("cookie"), cookie);
    assert.equal(init?.cache, "no-store");
    return Response.json({ items: [{ mealId: 1 }], page: 2, pageSize: 1, totalCount: 2 });
  };
  const response = await favoritesGet(request(), fake);
  assert.equal(response.status, 200); privateResponse(response);
  assert.equal((await response.json()).items[0].mealId, 1);
});

test("favorites reject anonymous access, invalid pages, CSRF and foreign origin before forwarding", async () => {
  const fake: typeof fetch = async () => { throw new Error("must not forward"); };
  const anonymous = await favoritesGet(request("GET", true, false), fake);
  assert.equal(anonymous.status, 401); privateResponse(anonymous);
  for (const query of ["page=0", "page=abc", "pageSize=101", "page=2147483648"]) {
    const req = new Request(`https://bite.test/api/favorites?${query}`, { headers: { Cookie: cookie } });
    assert.equal((await favoritesGet(req, fake)).status, 400);
  }
  for (const method of ["PUT", "DELETE"]) {
    for (const [req, status] of [[request(method, false), 403], [request(method, true, false), 401], [request(method, true, true, "https://evil.test"), 403]] as const) {
      const response = await favoritesMutate(req, "1", fake);
      assert.equal(response.status, status); privateResponse(response);
    }
    assert.equal((await favoritesMutate(request(method), "../auth/logout", fake)).status, 400);
  }
});

test("PUT/DELETE forward both API CSRF parts once and return private empty success", async () => {
  for (const method of ["PUT", "DELETE"]) {
    let writes = 0;
    const fake: typeof fetch = async (url, init) => {
      assert.equal(init?.cache, "no-store");
      if (String(url).endsWith("/auth/antiforgery")) return Response.json({ requestToken: "api-token" }, { headers: { "Set-Cookie": "bite_routine_api_csrf=api-cookie" } });
      writes++; assert.match(String(url), /\/me\/favorite-meals\/1$/);
      assert.equal(init?.method, method); assert.equal(init?.body, undefined);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("cookie"), `${cookie}; bite_routine_api_csrf=api-cookie`);
      assert.equal(headers.get("x-bite-routine-api-csrf"), "api-token");
      assert.equal(headers.get("x-csrf-token"), null);
      return new Response(null, { status: 204 });
    };
    const response = await favoritesMutate(request(method), "1", fake);
    assert.equal(response.status, 204); assert.equal(writes, 1); privateResponse(response);
    assert.equal(await response.text(), "");
  }
});

test("favorite gateway preserves expiration/missing food and never repeats an uncertain write", async () => {
  for (const status of [401, 403, 404, 500, 0]) {
    let writes = 0;
    const fake: typeof fetch = async (url) => {
      if (String(url).endsWith("/auth/antiforgery")) return Response.json({ requestToken: "api-token" }, { headers: { "Set-Cookie": "bite_routine_api_csrf=cookie" } });
      writes++; if (!status) throw new Error("offline");
      return new Response(null, { status });
    };
    const response = await favoritesMutate(request("PUT"), "1", fake);
    assert.equal(response.status, status === 500 || status === 0 ? 502 : status);
    assert.equal(writes, 1); privateResponse(response);
  }
  const expired = await favoritesGet(request(), async () => new Response(null, { status: 401 }));
  assert.equal(expired.status, 401); privateResponse(expired);
});

test("favorite reader collects every page privately and handles empty/expired/error states", async () => {
  let calls = 0;
  const fake: typeof fetch = async (url, init) => {
    calls++; assert.equal(init?.cache, "no-store"); assert.equal(init?.credentials, "same-origin");
    assert.match(String(url), new RegExp(`page=${calls}&pageSize=100`));
    return Response.json({ items: calls === 1 ? Array.from({ length: 100 }, (_, i) => ({ mealId: i + 1 })) : [{ mealId: 101 }], totalCount: 101 });
  };
  assert.equal((await readFavorites(undefined, fake)).length, 101); assert.equal(calls, 2);
  assert.deepEqual(await readFavorites(undefined, async () => Response.json({ items: [], totalCount: 0 })), []);
  await assert.rejects(readFavorites(undefined, async () => Response.json({ error: "Giriş yapın." }, { status: 401 })), (e: unknown) => e instanceof FavoriteError && e.status === 401);
  await assert.rejects(readFavorites(undefined, async () => { throw new Error("offline"); }), /Bağlantınızı kontrol edin/);
});

test("favorite client uses one CSRF-protected write and does not retry network failures", async () => {
  for (const favorite of [true, false]) {
    let writes = 0;
    await setFavorite(1, favorite, async (url, init) => {
      assert.equal(init?.cache, "no-store");
      if (url === "/api/auth/csrf") return Response.json({ token: "web-token" });
      writes++; assert.equal(url, "/api/favorites/1"); assert.equal(init?.method, favorite ? "PUT" : "DELETE");
      assert.equal(new Headers(init?.headers).get("x-csrf-token"), "web-token");
      return new Response(null, { status: 204 });
    });
    assert.equal(writes, 1);
  }
  let writes = 0;
  await assert.rejects(setFavorite(1, true, async (url) => {
    if (url === "/api/auth/csrf") return Response.json({ token: "web-token" });
    writes++; throw new Error("offline");
  }), /tamamlanmış olabilir/);
  assert.equal(writes, 1);
});
