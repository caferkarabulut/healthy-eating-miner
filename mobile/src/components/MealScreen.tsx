import { useCallback, useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadMeal, metric, sourceUrl } from "../api/catalog";
import { useRequest } from "../hooks/useRequest";
import { Button, Failure, Loading, styles } from "./ui";

export default function MealScreen({ apiUrl, mealId }: { apiUrl: string | undefined; mealId: string }) {
  const load = useCallback((signal: AbortSignal) => loadMeal(apiUrl, mealId, signal), [apiUrl, mealId]);
  const { state, retry } = useRequest(load);
  const [sourceError, setSourceError] = useState(false);
  const meal = state.status === "ready" ? state.data : null;
  const link = sourceUrl(meal?.nutrition?.sourceUrl);
  return <SafeAreaView style={styles.screen} edges={["bottom", "left", "right"]}>
    {state.status === "loading" && <Loading />}
    {state.status === "error" && <Failure message={state.message} retry={retry} />}
    {meal && <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>{meal.mealName}</Text>
      <Text style={styles.muted}>100 g yenilebilir kısım için yaklaşık değerler.</Text>
      <View style={styles.card}>
        {([["Enerji", "caloriesKcal", "kcal"], ["Protein", "proteinG", "g"], ["Karbonhidrat", "carbsG", "g"], ["Yağ", "fatG", "g"]] as const).map(([label, key, unit]) =>
          <View key={key} style={styles.row}><Text style={[styles.text, { flexGrow: 1 }]}>{label}</Text><Text style={styles.heading}>{metric(meal.nutrition?.[key], unit)}</Text></View>)}
      </View>
      <Text style={styles.muted}>Eksik besin değerleri “Veri yok” olarak gösterilir. Gerçek değerler gıdaya ve hazırlama biçimine göre değişebilir.</Text>
      {meal.nutrition && <Text style={styles.muted}>Kaynak: {meal.nutrition.source}</Text>}
      {link && <Button onPress={() => { setSourceError(false); void Linking.openURL(link).catch(() => setSourceError(true)); }}>Gıdanın kaynağını aç</Button>}
      {sourceError && <Text accessibilityRole="alert" style={styles.text}>Kaynak bağlantısı açılamadı.</Text>}
    </ScrollView>}
  </SafeAreaView>;
}
