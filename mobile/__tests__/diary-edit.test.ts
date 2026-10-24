import { DiaryMissingError, deleteEntry, editPayload, isEntry, matchesSnapshot, UncertainDiaryError, updateEntry, type Portion } from "../src/api/diary";
import { SessionClient } from "../src/auth/session";
import { entry } from "./diary-fixtures";
import { response } from "./fixtures";
export const live: Portion = { id: 7, mealId: 1, amount: 1, gramWeight: 44, gramsPerUnit: 44, approximate: true, measureName: "Orta adet", source: "USDA", sourceFoodId: "171287", sourceId: "88378", sourceDescription: "medium", sourceUrl: "https://fdc.nal.usda.gov" };
test("gram edits and explicit switches use only the appropriate amount fields", () => {
  const grams = { ...entry, portion: null };
  expect(editPayload(grams, "grams", "66", entry.date, "dinner", [])).toEqual({ date: entry.date, mealSlot: "dinner" });
  expect(editPayload(grams, "grams", "150,25", entry.date, "lunch", [])).toEqual({ date: entry.date, mealSlot: "lunch", grams: 150.25 });
  expect(editPayload(entry, "grams", "66", entry.date, "lunch", [])).toHaveProperty("grams", 66);
  expect(editPayload(grams, "live:7", "2,5", entry.date, "lunch", [live])).toEqual({ date: entry.date, mealSlot: "lunch", portionId: 7, quantity: 2.5 });
});
test("saved fractional amount only changes when full source matches; missing/changed sources never silently recalculate", () => {
  expect(matchesSnapshot(live, entry.portion!)).toBe(true);
  expect(editPayload(entry, "saved", "2,5", entry.date, "lunch", [live])).toEqual({ date: entry.date, mealSlot: "lunch", portionId: 7, quantity: 2.5 });
  for (const list of [[], [{ ...live, gramWeight: 50, gramsPerUnit: 50 }], [{ ...live, sourceId: "changed" }]]) {
    expect(editPayload(entry, "saved", "1,5", "2026-10-23", "snack", list)).toEqual({ date: "2026-10-23", mealSlot: "snack" });
    expect(() => editPayload(entry, "saved", "2", entry.date, "lunch", list)).toThrow("Kayıtlı ölçü");
  }
  expect(editPayload(entry, "live:7", "1,5", entry.date, "lunch", [{ ...live, gramWeight: 50 }])).toHaveProperty("portionId", 7);
  expect(entry.portion!.sourceGramWeight).toBe(44);
});
test("invalid date/amount and broken snapshot metadata are rejected", () => {
  for (const amount of ["0", "-2", "1e2", "1,005", "10000,01"]) expect(() => editPayload(entry, "grams", amount, entry.date, "other", [])).toThrow();
  expect(() => editPayload(entry, "grams", "100", "2026-02-29", "other", [])).toThrow();
  expect(isEntry({ ...entry, portion: { measureName: "Orta adet", quantity: 1.5 } })).toBe(false);
  expect(isEntry(entry)).toBe(true);
});
async function setup() {
  const fetcher = jest.fn(async (url: RequestInfo | URL, _init?: RequestInit) => response(String(url).includes("/auth/login") ? { tokenType: "Bearer", accessToken: "opaque", refreshToken: "refresh", expiresIn: 3600 } : { userId: "u", email: null }));
  const client = new SessionClient("http://localhost", { read: async () => null, write: async () => {}, clear: async () => {} }, fetcher);
  await client.login("x", "y"); return { client, fetcher };
}
test("PATCH date/slot omits quantity fields; DELETE 204 does not parse a body", async () => {
  const { client, fetcher } = await setup();
  fetcher.mockResolvedValueOnce(response(entry));
  await updateEntry(client, entry.id, { date: entry.date, mealSlot: "breakfast" });
  expect(JSON.parse(String(fetcher.mock.calls.at(-1)![1]?.body))).toEqual({ date: entry.date, mealSlot: "breakfast" });
  const body = jest.fn().mockRejectedValue(new Error("No body"));
  fetcher.mockResolvedValueOnce({ ...response(null, 204), json: body }); await deleteEntry(client, entry.id); expect(body).not.toHaveBeenCalled();
  const init = fetcher.mock.calls.at(-1)![1]!; expect(init.method).toBe("DELETE"); expect(init.body).toBeUndefined(); expect(init.cache).toBe("no-store");
});
test.each(["PATCH", "DELETE"])("%s has no replay on network/5xx/unreadable success, and reports missing records safely", async method => {
  const { client, fetcher } = await setup();
  const action = () => method === "PATCH" ? updateEntry(client, entry.id, { date: entry.date, mealSlot: "breakfast" }) : deleteEntry(client, entry.id);
  for (const mode of ["network", "server", "body"]) {
    const count = fetcher.mock.calls.length;
    fetcher.mockImplementationOnce(async () => { if (mode === "network") throw new Error("offline"); return mode === "server" ? response({}, 503) : { ...response({}, 200), json: async () => { throw new Error("broken body"); } }; });
    await expect(action()).rejects.toBeInstanceOf(UncertainDiaryError); expect(fetcher.mock.calls.length - count).toBe(1);
  }
  fetcher.mockResolvedValueOnce(response({}, 404)); await expect(action()).rejects.toBeInstanceOf(DiaryMissingError);
});
test("late PATCH and DELETE completion cannot escape logout or a replacement session", async () => {
  for (const method of ["PATCH", "DELETE"]) {
    const { client, fetcher } = await setup(); let resolve!: (v: Response) => void;
    fetcher.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const result = method === "PATCH" ? updateEntry(client, entry.id, { date: entry.date, mealSlot: "breakfast" }) : deleteEntry(client, entry.id);
    const rejected = expect(result).rejects.toMatchObject({ kind: "cancelled" });
    await client.logout(); await client.login("replacement", "p"); resolve(response(method === "PATCH" ? entry : null, method === "PATCH" ? 200 : 204)); await rejected;
  }
});

test("expired authorization on mutation uses the shared refresh and invalid refresh ends the session", async () => {
  const { client, fetcher } = await setup();
  fetcher.mockResolvedValue(response({}, 401));
  await expect(updateEntry(client, entry.id, { date: entry.date, mealSlot: "other" })).rejects.toMatchObject({ kind: "invalid" });
  expect(client.getSnapshot().status).toBe("anonymous");
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(1);
  expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"))).toHaveLength(1);
});
