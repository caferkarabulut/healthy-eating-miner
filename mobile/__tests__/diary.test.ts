import { isDiaryDate, istanbulDay, moveDay, parseAmount, loadDiary, loadPortions, addEntry, UncertainDiaryError } from "../src/api/diary";
import { SessionClient } from "../src/auth/session";
import { response } from "./fixtures";
import { day, entry } from "./diary-fixtures";
test("Istanbul date crosses midnight/month/year independently of device timezone", () => {
  expect(istanbulDay(new Date("2026-12-31T20:59:59Z"))).toBe("2026-12-31");
  expect(istanbulDay(new Date("2026-12-31T21:00:00Z"))).toBe("2027-01-01");
  expect(moveDay("2028-02-28", 1)).toBe("2028-02-29");
  expect(isDiaryDate("2026-02-29")).toBe(false); expect(isDiaryDate("0000-01-01")).toBe(false);
});
test("Turkish gram/quantity inputs preserve decimals, reject ambiguous or invalid values", () => {
  expect(parseAmount("150,25", true)).toBe(150.25); expect(parseAmount("1,5", false)).toBe(1.5);
  for (const x of ["0", "-1", "1e2", "1,2.3", "Infinity", ""]) expect(parseAmount(x, false)).toBeNull();
  expect(parseAmount("1,005", true)).toBeNull(); expect(parseAmount("10000,01", true)).toBeNull();
  expect(parseAmount("0,01", true)).toBe(0.01);
});
function setup() {
  let saved: string | null = null;
  const fetcher = jest.fn(async (url: RequestInfo | URL, _init?: RequestInit) => response(String(url).includes("/auth/login") ? { tokenType: "Bearer", accessToken: "opaque", refreshToken: "refresh", expiresIn: 3600 } : String(url).endsWith("/me") ? { userId: "a", email: null } : day));
  const client = new SessionClient("http://localhost", { read: async () => saved, write: async v => { saved = v; }, clear: async () => { saved = null; } }, fetcher);
  return { client, fetcher };
}
test("personal GET uses no-store bearer and validates date/null/zero summaries from server", async () => {
  const { client, fetcher } = setup(); await client.login("a", "p");
  const result = await loadDiary(client, day.date); expect(result.summary.fatG).toBeNull(); expect(result.summary.carbsG).toBe(0);
  const init = fetcher.mock.calls.at(-1)![1] as RequestInit;
  expect(init.cache).toBe("no-store"); expect(init.credentials).toBe("omit");
  fetcher.mockResolvedValueOnce(response({ ...day, date: "2026-01-01" })); await expect(loadDiary(client, day.date)).rejects.toThrow("yanıtı");
});
test("POST sends either grams or portion+quantity and never derived grams, no replay on network/5xx/malformed result", async () => {
  const { client, fetcher } = setup(); await client.login("a", "p");
  fetcher.mockResolvedValueOnce(response(day.items[0], 201));
  await addEntry(client, { mealId: 1, grams: 150.25, date: day.date, mealSlot: "lunch" });
  expect(JSON.parse(String(fetcher.mock.calls.at(-1)![1]?.body))).toEqual({ mealId: 1, grams: 150.25, date: day.date, mealSlot: "lunch" });
  for (const mode of ["network", "server", "malformed"]) {
    fetcher.mockImplementationOnce(async () => { if (mode === "network") throw new Error("offline"); return response(mode === "server" ? {} : { bad: true }, mode === "server" ? 500 : 201); });
    const count = fetcher.mock.calls.length;
    await expect(addEntry(client, { mealId: 1, portionId: 7, quantity: 1.5, date: day.date, mealSlot: "breakfast" })).rejects.toBeInstanceOf(UncertainDiaryError);
    expect(fetcher.mock.calls.length - count).toBe(1);
    expect(JSON.parse(String(fetcher.mock.calls.at(-1)![1]?.body))).not.toHaveProperty("grams");
  }
});
test("personal 401 shares refresh; late personal response after logout cannot escape", async () => {
  const { client, fetcher } = setup(); await client.login("a", "p");
  fetcher.mockImplementation(async (url, init?: RequestInit) => {
    if (String(url).endsWith("/auth/refresh")) return response({ tokenType: "Bearer", accessToken: "new", refreshToken: "next", expiresIn: 3600 });
    return new Headers(init?.headers).get("Authorization") === "Bearer opaque" ? response({}, 401) : response(day);
  });
  await Promise.all([loadDiary(client, day.date), loadDiary(client, day.date)]);
  expect(fetcher.mock.calls.filter(([u]) => String(u).endsWith("/auth/refresh"))).toHaveLength(1);
  let resolve!: (v: Response) => void;
  fetcher.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const read = loadDiary(client, day.date); const rejected = expect(read).rejects.toMatchObject({ kind: "cancelled" });
  await client.logout(); resolve(response(day)); await rejected;
});
test("portions must belong to requested food and be finite; empty list supports grams", async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(response({ mealId: 1, items: [] })).mockResolvedValueOnce(response({ mealId: 1, items: [{ id: 1, mealId: 2, measureName: "Orta adet", gramsPerUnit: 44 }] }));
  expect(await loadPortions("http://localhost", 1, new AbortController().signal)).toEqual([]);
  await expect(loadPortions("http://localhost", 1, new AbortController().signal)).rejects.toThrow();
});

test("received POST 401 refreshes once, but invalid refresh clears without sending again", async () => {
  const { client, fetcher } = setup(); await client.login("a", "p");
  fetcher.mockImplementation(async (url, init) => {
    if (String(url).endsWith("/auth/refresh")) return response({ tokenType: "Bearer", accessToken: "new", refreshToken: "next", expiresIn: 3600 });
    return new Headers(init?.headers).get("Authorization") === "Bearer opaque" ? response({}, 401) : response(entry, 201);
  });
  await addEntry(client, { mealId: 1, grams: 66, date: day.date, mealSlot: "breakfast" });
  expect(fetcher.mock.calls.filter(([u]) => String(u).endsWith("/auth/refresh"))).toHaveLength(1);
  fetcher.mockResolvedValue(response({}, 401));
  await expect(loadDiary(client, day.date)).rejects.toMatchObject({ kind: "invalid" });
  expect(client.getSnapshot().status).toBe("anonymous");
});
test("a stalled successful POST body becomes uncertain instead of locking the form indefinitely", async () => {
  const { client, fetcher } = setup(); await client.login("a", "p");
  jest.useFakeTimers();
  try {
    fetcher.mockResolvedValueOnce({ ...response({}, 201), json: () => new Promise(() => {}) } as Response);
    const result = expect(addEntry(client, { mealId: 1, grams: 66, date: day.date, mealSlot: "breakfast" })).rejects.toBeInstanceOf(UncertainDiaryError);
    await jest.advanceTimersByTimeAsync(12001); await result;
    expect(client.getSnapshot().status).toBe("authenticated");
  } finally { jest.useRealTimers(); }
});
