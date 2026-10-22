import { Link } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadCatalog, metric, PAGE_SIZE, type Meal } from "../api/catalog";
import { useRequest } from "../hooks/useRequest";
import { Button, colors, Failure, Loading, styles } from "./ui";

export default function CatalogScreen({ apiUrl, onSelect }: { apiUrl: string | undefined; onSelect: (mealId: number) => void }) {
  const list = useRef<FlatList<Meal>>(null);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState({ search: "", page: 1 });
  const load = useCallback((signal: AbortSignal) => loadCatalog(apiUrl, filter.search, filter.page, signal), [apiUrl, filter]);
  const { state, retry } = useRequest(load);
  function search() { Keyboard.dismiss(); list.current?.scrollToOffset({ offset: 0, animated: false }); setFilter({ search: draft.trim(), page: 1 }); }
  const data = state.status === "ready" ? state.data : null;
  const pages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE));
  function card({ item }: { item: Meal }) {
    return <Pressable accessibilityRole="button" accessibilityLabel={`${item.mealName}, detayları aç`} onPress={() => { Keyboard.dismiss(); onSelect(item.mealId); }} style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.pale }]}>
      <Text style={styles.heading}>{item.mealName}</Text><Text style={styles.muted}>{metric(item.nutrition?.caloriesKcal, "kcal")} / 100 g</Text>
      <Text style={[styles.muted, { color: colors.green, fontWeight: "600" }]}>Besin değerlerini gör →</Text>
    </Pressable>;
  }
  return <SafeAreaView style={styles.screen} edges={["top", "bottom", "left", "right"]}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <FlatList ref={list} data={data?.items ?? []} renderItem={card} keyExtractor={item => String(item.mealId)} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        contentContainerStyle={local.list} ListHeaderComponent={<>
      <View style={{ paddingVertical: 20, gap: 12 }}>
        <Text style={[styles.muted, { fontWeight: "600", color: colors.green }]}>Bite Routine</Text>
        <Text accessibilityRole="header" style={styles.title}>Gıda kataloğu</Text>
        <Link href="/diary" style={styles.heading}>Günlüğüm</Link>
        <Link href="/account" style={styles.text}>Hesabım / Giriş yap</Link>
        <Text style={styles.muted}>Gıdanızı bulun, 100 g için yaklaşık besin değerlerini inceleyin.</Text>
        <Text nativeID="search-label" style={styles.text}>Gıda ara</Text>
        <TextInput accessibilityLabel="Gıda ara" accessibilityLabelledBy="search-label" value={draft} onChangeText={setDraft} onSubmitEditing={search}
          placeholder="Mercimek, yoğurt, elma..." placeholderTextColor={colors.muted} autoCorrect={false} autoCapitalize="none" returnKeyType="search" maxLength={200}
          style={local.input} />
        <Button onPress={search}>Ara</Button>
      </View>
        {data && <Text accessibilityLiveRegion="polite" style={styles.muted}>{data.totalCount} sonuç</Text>}
        </>}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={state.status === "loading" ? <Loading /> : state.status === "error" ? <Failure message={state.message} retry={retry} /> : <Text style={styles.text}>{filter.search ? "Aramanızla eşleşen gıda bulunamadı. Farklı bir sözcük deneyin." : "Bu sayfada gıda bulunamadı."}</Text>}
        ListFooterComponent={data ? <View style={{ gap: 12, paddingVertical: 20 }}>
          <Text style={styles.muted}>Sayfa {filter.page} / {pages}</Text>
          <View style={styles.row}><Button disabled={filter.page === 1} onPress={() => { list.current?.scrollToOffset({ offset: 0, animated: false }); setFilter(x => ({ ...x, page: x.page - 1 })); }}>Önceki</Button>
            <Button disabled={filter.page >= pages} onPress={() => { list.current?.scrollToOffset({ offset: 0, animated: false }); setFilter(x => ({ ...x, page: x.page + 1 })); }}>Sonraki</Button></View>
        </View> : undefined} />
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const local = StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 16, color: colors.ink, backgroundColor: "white" },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
});
