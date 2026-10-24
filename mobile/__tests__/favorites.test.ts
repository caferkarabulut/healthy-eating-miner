import { FavoritesStore, loadFavorites } from '../src/favorites/store';
import { AuthError } from '../src/auth/session';
import { egg } from './fixtures';
const list = (items: unknown[] = [], page = 1, totalCount = items.length) => ({ items, page, pageSize: 100, totalCount });
const fake = (send: jest.Mock, version = () => 1) => ({ authorizedJson: send, getSessionVersion: version });

test('reads every API page without caching and preserves zero/missing nutrients', async () => {
  const items = Array.from({ length: 101 }, (_, index) => ({ ...egg, mealId: index + 1 }));
  const send = jest.fn().mockResolvedValueOnce(list(items.slice(0, 100), 1, 101)).mockResolvedValueOnce(list(items.slice(100), 2, 101));
  const result = await loadFavorites(fake(send));
  expect(result).toHaveLength(101); expect(result[0].nutrition?.fatG).toBeNull(); expect(result[0].nutrition?.carbsG).toBe(0);
  expect(send.mock.calls).toEqual([
    ['/me/favorite-meals?page=1&pageSize=100', { cache: 'no-store' }],
    ['/me/favorite-meals?page=2&pageSize=100', { cache: 'no-store' }],
  ]);
});
test('double taps send one mutation; add/remove reload authoritative live catalog data', async () => {
  let saved = false; let release!: (value: null) => void;
  const send = jest.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === 'PUT') { saved = true; return new Promise<null>(r => { release = r; }); }
    if (init?.method === 'DELETE') { saved = false; return null; }
    return list(saved ? [{ ...egg, mealName: 'Güncel kaynak adı' }] : []);
  });
  const store = new FavoritesStore(fake(send), 1); await store.refresh();
  const first = store.toggle(1); const second = store.toggle(1);
  expect(store.getSnapshot().pending).toBe(1);
  expect(send.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1);
  release(null); await Promise.all([first, second]);
  expect(store.getSnapshot().items[0].mealName).toBe('Güncel kaynak adı');
  await store.toggle(1); expect(store.getSnapshot().items).toEqual([]);
  expect(send.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1);
});
test('uncertain mutation is never replayed; manual GET checks its actual result', async () => {
  let saved = false;
  const send = jest.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === 'PUT') { saved = true; throw new Error('offline'); }
    return list(saved ? [egg] : []);
  });
  const store = new FavoritesStore(fake(send), 1); await store.refresh(); await store.toggle(1); await store.toggle(1);
  expect(store.getSnapshot().message).toContain('İşlem tamamlanmış olabilir');
  expect(send.mock.calls.filter(([, init]) => init?.method)).toHaveLength(1);
  await store.refresh(); expect(store.getSnapshot().status).toBe('ready'); expect(store.getSnapshot().items).toEqual([egg]);
});
test('late GET and mutation cannot update a disposed or different session', async () => {
  let version = 1; let complete!: (value: unknown) => void;
  const send = jest.fn().mockImplementationOnce(() => new Promise(r => { complete = r; }));
  const old = new FavoritesStore(fake(send, () => version), 1); const loading = old.refresh();
  old.dispose(); version = 2;
  const current = new FavoritesStore(fake(jest.fn().mockResolvedValue(list()), () => version), 2);
  await current.refresh(); complete(list([egg])); await loading;
  expect(old.getSnapshot().items).toEqual([]); expect(current.getSnapshot().items).toEqual([]);
  let finish!: (value: null) => void;
  const mutations = jest.fn().mockResolvedValueOnce(list()).mockImplementationOnce(() => new Promise(r => { finish = r; }));
  const another = new FavoritesStore(fake(mutations, () => version), 2); await another.refresh(); const writing = another.toggle(1);
  version = 3; finish(null); await writing;
  expect(mutations).toHaveBeenCalledTimes(2); // no reload using the replacement user's session
});
test('failed and malformed GETs are retryable; a known 404 is clear', async () => {
  const missing = new AuthError('technical response', 'response'); missing.status = 404;
  const send = jest.fn().mockResolvedValueOnce({ items: [null], page: 1, pageSize: 100, totalCount: 1 })
    .mockResolvedValueOnce(list()).mockRejectedValueOnce(missing);
  const store = new FavoritesStore(fake(send), 1); await store.refresh(); expect(store.getSnapshot().status).toBe('error');
  await store.refresh(); await store.toggle(1); expect(store.getSnapshot().message).toContain('Gıda bulunamadı');
  expect(store.getSnapshot().message).not.toContain('technical');
});
test('effect cleanup/restart drops old reads and re-fetches without duplicate refreshes', async () => {
  let complete!: (value: unknown) => void;
  const send = jest.fn().mockImplementationOnce(() => new Promise(r => { complete = r; })).mockResolvedValueOnce(list());
  const store = new FavoritesStore(fake(send), 1); const old = store.refresh();
  expect(store.refresh()).toBe(old);
  store.dispose(); store.activate(); await store.refresh(); complete(list([egg])); await old;
  expect(store.getSnapshot().items).toEqual([]); expect(send).toHaveBeenCalledTimes(2);
});
