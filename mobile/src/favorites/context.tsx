import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useSession } from '../auth/context';
import { FavoritesStore } from './store';
const Context = createContext<FavoritesStore | null>(null);
const emptySubscribe = () => () => {};
const emptySnapshot = () => null;
export function FavoritesProvider({ children }: PropsWithChildren) {
  const { client, state } = useSession();
  const userId = ['authenticated', 'offline'].includes(state.status) ? state.profile?.userId : undefined;
  const version = client.getSessionVersion();
  const store = useMemo(() => userId ? new FavoritesStore(client, version) : null, [client, version, userId]);
  useEffect(() => {
    if (!store) return;
    store.activate();
    void store.refresh();
    const listener = AppState.addEventListener('change', status => { if (status === 'active') void store.refresh(); });
    return () => { listener.remove(); store.dispose(); };
  }, [store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useFavorites() {
  const store = useContext(Context);
  const state = useSyncExternalStore(store?.subscribe ?? emptySubscribe, store?.getSnapshot ?? emptySnapshot, store?.getSnapshot ?? emptySnapshot);
  return { store, state };
}
