import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { useFavorites } from '../favorites/context';
import { Button, colors, styles } from './ui';
export default function FavoriteButton({ mealId }: { mealId: number }) {
  const { store, state } = useFavorites();
  if (!store || !state) return <Link href="/login" style={styles.text}>Favori için giriş yap</Link>;
  const saved = state.items.some(meal => meal.mealId === mealId);
  return <Button disabled={state.status !== 'ready' || state.pending !== null} onPress={() => void store.toggle(mealId)}
    label={state.pending === mealId ? 'Favori değiştiriliyor' : saved ? 'Favoriden çıkar' : 'Favoriye ekle'}>
    {state.pending === mealId ? 'Kaydediliyor...' : state.status === 'loading' ? 'Favoriler yükleniyor...' : saved ? 'Favoriden çıkar' : 'Favoriye ekle'}
  </Button>;
}
export function FavoritesNotice() {
  const { store, state } = useFavorites();
  if (!store || !state?.message) return null;
  return <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={[styles.text, { color: colors.error }]}>{state.message}</Text>
    <Button disabled={state.pending !== null} onPress={() => void store.refresh()}>Favorileri yenile</Button></View>;
}
