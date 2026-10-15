import assert from "node:assert/strict";
import test from "node:test";
import { historyDateLabel, isHistoryEnd, shiftHistoryEnd } from "./diary-history.ts";
import { diaryHistoryGet } from "./diary-history-gateway.ts";
import { IDENTITY_COOKIE } from "./session.ts";
import { summaryMetrics } from "./diary-summary.ts";

const cookie = `${IDENTITY_COOKIE}=opaque`;
function request(query = "?endDate=2027-01-03", identity = true) {
  return new Request(`https://bite.test/api/diary-summary${query}`, { headers: identity ? { Cookie: `extra=secret; ${cookie}` } : {} });
}
function privateResponse(response: Response) {
  assert.match(response.headers.get("cache-control")!, /private.*no-store/);
  assert.equal(response.headers.get("vary"), "Cookie");
}
test("history calendar navigation crosses months, leap days and years without timezone drift", () => {
  assert.equal(shiftHistoryEnd("2027-01-03", -7), "2026-12-27");
  assert.equal(shiftHistoryEnd("2026-12-27", 7), "2027-01-03");
  assert.equal(shiftHistoryEnd("2024-03-03", -7), "2024-02-25");
  assert.equal(shiftHistoryEnd("0001-01-07", -7), null);
  assert.equal(shiftHistoryEnd("9999-12-31", 7), null);
  assert.equal(historyDateLabel("2027-01-03"), "03.01.2027");
  for (const value of [undefined, "", "0001-01-06", "2026-02-30", "2026-1-01", "2026-10-15T00:00:00Z"]) assert.equal(isHistoryEnd(value), false);
  assert.equal(isHistoryEnd("0001-01-07"), true);
});
test("history gateway forwards only session with no-store and retains null versus zero", async () => {
  const body = { startDate: "2026-12-28", endDate: "2027-01-03", timeZone: "Europe/Istanbul", days: [{ date: "2027-01-03", summary: { entryCount: 1, caloriesKcal: 123.456, proteinG: null, carbsG: 0, fatG: 1 } }] };
  const fake: typeof fetch = async (url, init) => {
    assert.match(String(url), /\/me\/diary-summary\?endDate=2027-01-03$/);
    assert.equal(new Headers(init?.headers).get("Cookie"), cookie);
    assert.equal(init?.cache, "no-store"); assert.equal(init?.redirect, "manual");
    return Response.json(body);
  };
  const response = await diaryHistoryGet(request(), fake);
  assert.equal(response.status, 200); privateResponse(response);
  assert.deepEqual(await response.json(), body);
  const metrics = summaryMetrics(body.days[0].summary);
  assert.equal(metrics[1].text, "Eksik veri"); assert.equal(metrics[2].text, "0 g");
});
test("history rejects missing session and bad dates before contacting API", async () => {
  const fake: typeof fetch = async () => { throw new Error("must not call API"); };
  const anonymous = await diaryHistoryGet(request(undefined, false), fake);
  assert.equal(anonymous.status, 401); privateResponse(anonymous);
  for (const query of ["", "?endDate=2026-02-30", "?endDate=0001-01-06"]) {
    const response = await diaryHistoryGet(request(query), fake);
    assert.equal(response.status, 400); privateResponse(response);
  }
});
test("history session expiry, API failure and network failure stay private", async () => {
  for (const [status, expected] of [[401, 401], [500, 502], [302, 502]]) {
    const response = await diaryHistoryGet(request(), async () => new Response(null, { status }));
    assert.equal(response.status, expected); privateResponse(response);
  }
  const failed = await diaryHistoryGet(request(), async () => { throw new Error("offline"); });
  assert.equal(failed.status, 502); privateResponse(failed);
});
