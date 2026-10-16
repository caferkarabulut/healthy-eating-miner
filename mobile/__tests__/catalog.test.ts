import { apiOrigin, loadCatalog, loadMeal, metric, sourceUrl } from "../src/api/catalog";
import { egg, page, response } from "./fixtures";
const signal = () => new AbortController().signal;
const fetcher = jest.fn() as jest.MockedFunction<typeof fetch>;
beforeEach(() => fetcher.mockReset());
test("public API address rejects secrets and non-http protocols", () => {
  expect(apiOrigin(" http://127.0.0.1:5080/ ")).toBe("http://127.0.0.1:5080");
  for (const value of [undefined, "", "postgres://localhost/db", "http://user:pass@localhost", "https://host/path", "https://host?token=secret"]) expect(() => apiOrigin(value)).toThrow();
});
test("Turkish search and page go to the existing API without session credentials", async () => {
  fetcher.mockResolvedValue(response(page([egg], 2)));
  await loadCatalog("http://localhost:5080", "  ÇİĞ yoğurt  ", 2, signal(), fetcher);
  const [url, init] = fetcher.mock.calls[0];
  expect(String(url)).toContain("page=2&pageSize=10&search=%C3%87%C4%B0%C4%9E%20yo%C4%9Furt");
  expect(init?.credentials).toBe("omit"); expect(new Headers(init?.headers).get("Authorization")).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test("empty catalog, 100 g detail, nulls and real zero retain their meaning", async () => {
  fetcher.mockResolvedValueOnce(response(page([], 1, 0))).mockResolvedValueOnce(response(egg));
  expect((await loadCatalog("http://localhost", "", 1, signal(), fetcher)).items).toEqual([]);
  expect(await loadMeal("http://localhost", "1", signal(), fetcher)).toEqual(egg);
  expect(metric(null, "g")).toBe("Veri yok"); expect(metric(0, "g")).toBe("0 g"); expect(metric(12.56, "g")).toBe("12,56 g");
  expect(sourceUrl("javascript:alert(1)")).toBeNull();
});
test("HTTP errors, transport failure and malformed responses give safe messages without retries", async () => {
  for (const answer of [response({ private: "secret" }, 500), response({ ...egg, mealId: 2 }), response({ ...egg, nutrition: { ...egg.nutrition, basisGrams: 1 } })]) {
    fetcher.mockResolvedValueOnce(answer);
    await expect(loadMeal("http://localhost", "1", signal(), fetcher)).rejects.toThrow();
  }
  fetcher.mockRejectedValueOnce(new Error("internal private detail"));
  await expect(loadCatalog("http://localhost", "", 1, signal(), fetcher)).rejects.toThrow("Kataloğa bağlanılamadı");
  expect(fetcher).toHaveBeenCalledTimes(4);
});
test("slow requests time out and cleanup their abort listener", async () => {
  jest.useFakeTimers();
  try {
    fetcher.mockImplementation((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))));
    const assertion = expect(loadCatalog("http://localhost", "", 1, signal(), fetcher)).rejects.toThrow("Kataloğa bağlanılamadı");
    await jest.advanceTimersByTimeAsync(12000); await assertion;
  } finally { jest.useRealTimers(); }
});
