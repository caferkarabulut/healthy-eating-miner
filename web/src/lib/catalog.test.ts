import assert from "node:assert/strict";
import test from "node:test";
import { catalogHref, catalogPages, catalogQuery, CATALOG_PAGE_SIZE } from "./catalog.ts";

test("catalog pagination validates API page range and preserves Turkish search text", () => {
  assert.equal(CATALOG_PAGE_SIZE, 20);
  assert.deepEqual(catalogQuery({ q: "  Ispanak  ", page: "2" }), { search: "Ispanak", page: 2 });
  for (const page of [undefined, "0", "-1", "1.5", "abc", "2147483648", "999999999999999999999"]) {
    assert.equal(catalogQuery({ page }).page, 1);
  }
  assert.equal(catalogQuery({ page: "2147483647" }).page, 2147483647);
  const href = catalogHref("çiğ & süt", 2);
  const url = new URL(href, "https://bite.test");
  assert.equal(url.searchParams.get("q"), "çiğ & süt");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(new URL(catalogHref("yeni arama", 1), url).searchParams.has("page"), false);
});

test("catalog links reach every page and handle empty/out-of-range pages", () => {
  assert.deepEqual(catalogPages("çiğ", 1, 30), { lastPage: 2, previous: null, next: "/?q=%C3%A7i%C4%9F&page=2" });
  assert.deepEqual(catalogPages("çiğ", 2, 30), { lastPage: 2, previous: "/?q=%C3%A7i%C4%9F", next: null });
  assert.deepEqual(catalogPages("", 1, 0), { lastPage: 1, previous: null, next: null });
  assert.deepEqual(catalogPages("", 99, 30), { lastPage: 2, previous: "/?page=2", next: null });
  assert.equal(catalogPages("", 1, 20).next, null);
  assert.equal(catalogPages("", 1, 21).next, "/?page=2");
});
