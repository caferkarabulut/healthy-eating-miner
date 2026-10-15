import assert from "node:assert/strict";
import test from "node:test";
import { addDiaryEntry, changeDiaryEntry, DiaryError } from "./diary-client.ts";

const input = { mealId: 1, grams: 150.25, date: "2026-10-15" };
test("client submits once with CSRF and does not retry a network failure", async () => {
  let posts = 0;
  const fake: typeof fetch = async (url, init) => {
    if (url === "/api/auth/csrf") return Response.json({ token: "token" });
    posts++; assert.equal(new Headers(init?.headers).get("x-csrf-token"), "token");
    assert.deepEqual(JSON.parse(String(init?.body)), input);
    throw new Error("network failure after send");
  };
  await assert.rejects(addDiaryEntry(input, fake), (error: unknown) => error instanceof DiaryError && error.uncertain);
  assert.equal(posts, 1);
});
test("client distinguishes session expiration and CSRF preparation failure", async () => {
  const expired: typeof fetch = async (url) => url === "/api/auth/csrf" ? Response.json({ token: "token" }) : Response.json({ error: "Oturum sona erdi" }, { status: 401 });
  await assert.rejects(addDiaryEntry(input, expired), (error: unknown) => error instanceof DiaryError && error.status === 401 && !error.uncertain);
  let calls = 0;
  const failure: typeof fetch = async () => { calls++; throw new Error("offline"); };
  await assert.rejects(addDiaryEntry(input, failure), (error: unknown) => error instanceof DiaryError && !error.uncertain);
  assert.equal(calls, 1);
});

for (const input of [{ grams: 175.25, date: "2026-10-16" }, null]) {
  const method = input === null ? "DELETE" : "PATCH";
  test(`${method} uses CSRF, numeric payload and accepts the correct success status`, async () => {
    let writes = 0;
    const fake: typeof fetch = async (url, init) => {
      if (url === "/api/auth/csrf") return Response.json({ token: "token" });
      writes++;
      assert.equal(url, "/api/diary/entry-id"); assert.equal(init?.method, method);
      assert.equal(init?.cache, "no-store"); assert.equal(init?.credentials, "same-origin");
      assert.equal(new Headers(init?.headers).get("x-csrf-token"), "token");
      if (input === null) { assert.equal(init?.body, undefined); return new Response(null, { status: 204 }); }
      assert.deepEqual(JSON.parse(String(init?.body)), input);
      return Response.json({ id: "entry-id", ...input });
    };
    await changeDiaryEntry("entry-id", input, fake); assert.equal(writes, 1);
  });
  test(`${method} never retries an uncertain request and preserves known errors`, async () => {
    for (const status of [0, 400, 401, 403, 404, 502]) {
      let writes = 0;
      const fake: typeof fetch = async (url) => {
        if (url === "/api/auth/csrf") return Response.json({ token: "token" });
        writes++;
        if (!status) throw new Error("lost response");
        return Response.json({ error: "İşlem başarısız" }, { status });
      };
      await assert.rejects(changeDiaryEntry("entry-id", input, fake), (e: unknown) => e instanceof DiaryError && e.status === status && e.uncertain === (status === 0 || status >= 500));
      assert.equal(writes, 1);
    }
    let calls = 0;
    await assert.rejects(changeDiaryEntry("entry-id", input, async () => { calls++; throw new Error("offline"); }), (e: unknown) => e instanceof DiaryError && !e.uncertain);
    assert.equal(calls, 1);
  });
}
