import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import FavoritesScreen from '../components/FavoritesScreen';
import { useFavorites } from '../favorites/context';
export default function FavoritesRoute() {
  const { store } = useFavorites();
  useFocusEffect(useCallback(() => { if (store) void store.refresh(); }, [store]));
  return <FavoritesScreen onSelect={id => router.push({ pathname: '/meals/[id]', params: { id: String(id) } })} />;
}
