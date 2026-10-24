import { Link } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { metric } from '../api/catalog';
import { useFavorites } from '../favorites/context';
import FavoriteButton, { FavoritesNotice } from './FavoriteButton';
import { Button, Loading, styles } from './ui';
export default function FavoritesScreen({ onSelect }: { onSelect: (id: number) => void }) {
  const { store, state } = useFavorites();
  if (!store || !state) return <SafeAreaView style={styles.screen}><View style={styles.container}>
    <Text style={styles.title}>Favorilerim</Text><Text style={styles.text}>Favorilerinizi görmek için giriş yapın.</Text>
    <Link href="/login" style={styles.heading}>Giriş yap</Link><Link href="/" style={styles.text}>Kataloğa dön</Link>
  </View></SafeAreaView>;
  return <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
    <FlatList data={state.status === 'ready' ? state.items : []} keyExtractor={meal => String(meal.mealId)} contentContainerStyle={styles.container}
      ListHeaderComponent={<View style={{ gap: 12 }}><Text accessibilityRole="header" style={styles.title}>Favorilerim</Text>
        <Text style={styles.muted}>Bir gıdanın miktarını seçip günlüğünüze ekleyebilirsiniz.</Text>
        {state.message ? <FavoritesNotice /> : <Button disabled={state.pending !== null || state.status === 'loading'} onPress={() => void store.refresh()}>Favorileri yenile</Button>}</View>}
      ListEmptyComponent={state.status === 'loading' ? <Loading /> : state.status === 'ready' ? <Text style={styles.text}>Henüz favori gıdanız yok. Katalogdan favori ekleyebilirsiniz.</Text> : undefined}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => <View style={styles.card}><Text style={styles.heading}>{item.mealName}</Text>
        <Text style={styles.muted}>{metric(item.nutrition?.caloriesKcal, 'kcal')} / 100 g</Text>
        <Button onPress={() => onSelect(item.mealId)}>Miktar seç ve günlüğe ekle</Button><FavoriteButton mealId={item.mealId} />
      </View>}
      ListFooterComponent={<Link href="/" style={styles.heading}>Kataloğa dön</Link>} />
  </SafeAreaView>;
}
