// Read-only HTTP check using the same client as the app; not a Simulator test.
import assert from 'node:assert/strict';
import { loadCatalog, loadMeal } from '../src/api/catalog.ts';
const base = process.env.EXPO_PUBLIC_API_URL;
const signal = () => new AbortController().signal;
const first = await loadCatalog(base, '', 1, signal());
assert.ok(first.items.length > 0, 'Seeded development catalog required');
const ids = new Set<number>();
for (let page = 1; page <= Math.ceil(first.totalCount / first.pageSize); page++) {
  for (const item of (await loadCatalog(base, '', page, signal())).items) { assert.ok(!ids.has(item.mealId)); ids.add(item.mealId); }
}
assert.equal(ids.size, first.totalCount);
const search = await loadCatalog(base, 'YOĞURT', 1, signal());
assert.ok(search.items.some(item => item.mealName.toLocaleLowerCase('tr-TR').includes('yoğurt')));
const meal = await loadMeal(base, String(first.items[0].mealId), signal());
assert.equal(meal.nutrition?.basisGrams, 100);
assert.equal((await loadCatalog(base, 'eşleşmeyen-gıda-xyz', 1, signal())).totalCount, 0);
await assert.rejects(loadCatalog('http://127.0.0.1:1', '', 1, signal()), /Kataloğa bağlanılamadı/);
console.log(`Read-only HTTP passed: ${ids.size} foods, Turkish search, pagination, detail, empty result and connection failure. Native UI not exercised.`);
