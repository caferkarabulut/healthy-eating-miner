import assert from "node:assert/strict";
import test from "node:test";
import { addDiaryEntry, DiaryError } from "./diary-client.ts";

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
