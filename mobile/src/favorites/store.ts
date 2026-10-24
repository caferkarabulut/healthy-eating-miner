import { isMeal, type Meal } from '../api/catalog.ts';
import { AuthError, type SessionClient } from '../auth/session.ts';

type Client = Pick<SessionClient, 'authorizedJson' | 'getSessionVersion'>;
export type FavoritesState = {
  status: 'loading' | 'ready' | 'error'; items: Meal[]; pending: number | null; message: string;
};
export async function loadFavorites(client: Client): Promise<Meal[]> {
  const items: Meal[] = []; const ids = new Set<number>();
  for (let page = 1; ; page++) {
    const value = await client.authorizedJson(`/me/favorite-meals?page=${page}&pageSize=100`, { cache: 'no-store' }) as Record<string, unknown>;
    if (!value || value.page !== page || value.pageSize !== 100 || !Number.isInteger(value.totalCount) ||
        Number(value.totalCount) < 0 || !Array.isArray(value.items) || value.items.length > 100 || !value.items.every(isMeal))
      throw new Error('Favoriler yanıtı okunamadı. Yeniden deneyin.');
    for (const meal of value.items) {
      if (ids.has(meal.mealId)) throw new Error('Favoriler değişmiş olabilir. Listeyi yenileyin.');
      ids.add(meal.mealId); items.push(meal);
    }
    if (items.length >= Number(value.totalCount) || value.items.length < 100) return items;
  }
}

// Owned by one provider/session. No disk, shared cache, or token storage.
export class FavoritesStore {
  private client: Client; private version: number; private disposed = false; private generation = 0;
  private loading: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  private state: FavoritesState = { status: 'loading', items: [], pending: null, message: '' };
  constructor(client: Client, version: number) { this.client = client; this.version = version; }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private valid() { return !this.disposed && this.client.getSessionVersion() === this.version; }
  private emit(state: FavoritesState) { this.state = state; for (const listener of this.listeners) listener(); }
  activate() { this.disposed = false; }
  dispose() { this.disposed = true; this.generation++; this.loading = null; }
  refresh = (): Promise<void> => {
    if (!this.valid() || this.state.pending !== null) return Promise.resolve();
    return this.loading ?? this.read();
  };
  private read(): Promise<void> {
    const generation = ++this.generation;
    this.emit({ ...this.state, status: 'loading', message: '' });
    this.loading = (async () => {
      try {
        const items = await loadFavorites(this.client);
        if (this.valid() && generation === this.generation) this.emit({ status: 'ready', items, pending: null, message: '' });
      } catch {
        if (this.valid() && generation === this.generation) this.emit({ ...this.state, status: 'error', pending: null, message: 'Favoriler alınamadı. Bağlantınızı kontrol edip listeyi yenileyin.' });
      } finally { if (generation === this.generation) this.loading = null; }
    })();
    return this.loading;
  }
  toggle = async (mealId: number): Promise<void> => {
    if (!this.valid() || this.state.status !== 'ready' || this.state.pending !== null) return;
    if (!Number.isInteger(mealId) || mealId < 1 || mealId > 2147483647) return;
    const generation = ++this.generation;
    const method = this.state.items.some(meal => meal.mealId === mealId) ? 'DELETE' : 'PUT';
    this.emit({ ...this.state, pending: mealId, message: '' });
    try {
      const result = await this.client.authorizedJson(`/me/favorite-meals/${mealId}`, { method });
      if (result !== null) throw new Error('Unexpected mutation response');
      if (!this.valid() || generation !== this.generation) return;
      await this.read(); // GET only; never retry an uncertain PUT/DELETE.
    } catch (error) {
      if (!this.valid() || generation !== this.generation) return;
      const known = error instanceof AuthError && error.status !== undefined && error.status >= 400 && error.status < 500;
      this.emit({ ...this.state, status: 'error', pending: null, message: known
        ? error.status === 404 ? 'Gıda bulunamadı. Kataloğu ve favorileri yenileyin.' : 'Favori değiştirilemedi. Listeyi yenileyip tekrar deneyin.'
        : 'İşlem tamamlanmış olabilir. Tekrar değiştirmeden önce favorileri yenileyip kontrol edin.' });
    }
  };
}
