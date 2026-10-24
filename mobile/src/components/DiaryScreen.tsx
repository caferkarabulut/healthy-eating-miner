import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { metric } from "../api/catalog";
import { isDiaryDate, loadDiary, MEAL_SLOTS, type Summary } from "../api/diary";
import { useSession } from "../auth/context";
import { useDiaryDate } from "../hooks/useDiaryDate";
import { useRequest } from "../hooks/useRequest";
import DiaryEntryActions from "./DiaryEntryActions";
import { DayField } from "./DiaryFields";
import { Button, Failure, Loading, styles } from "./ui";
export function SummaryView({ value }: { value: Summary }) {
  return <View style={{ gap: 4 }}><Text style={styles.text}>{value.entryCount} kayıt · {value.caloriesKcal === null ? "Eksik veri" : metric(value.caloriesKcal, "kcal")}</Text><Text style={styles.muted}>{([["Protein", "proteinG"], ["Karbonhidrat", "carbsG"], ["Yağ", "fatG"]] as const).map(([name, key]) => `${name}: ${value[key] === null ? "Eksik veri" : metric(value[key], "g")}`).join(" · ")}</Text></View>;
}
export default function DiaryScreen({ initialDate }: { initialDate?: string }) {
  const { client, state } = useSession();
  if (!state.profile || !["authenticated", "offline"].includes(state.status)) return <SafeAreaView style={styles.screen}><View style={styles.container}><Text style={styles.title}>Günlüğüm</Text><Text style={styles.text}>{state.status === "restoring" ? "Oturum kontrol ediliyor..." : "Günlüğünüzü görmek için giriş yapın."}</Text>{state.message && <Text style={styles.muted}>{state.message}</Text>}<Link href="/login" style={styles.heading}>Giriş yap</Link><Link href="/" style={styles.text}>Kataloğa dön</Link></View></SafeAreaView>;
  return <PersonalDiary key={`${client.getSessionVersion()}:${state.profile.userId}:${initialDate ?? "today"}`} initialDate={initialDate} />;
}
function PersonalDiary({ initialDate }: { initialDate?: string }) {
  const { client } = useSession(); const { date, setDate, today } = useDiaryDate(initialDate);
  const [refresh, setRefresh] = useState(0);
  const [locked, setLocked] = useState(false), [notice, setNotice] = useState("");
  const busy = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const gate = useMemo(() => ({
    acquire: () => { if (busy.current || !mounted.current) return false; busy.current = true; setLocked(true); return true; },
    release: () => { busy.current = false; if (mounted.current) setLocked(false); },
  }), []);
  useFocusEffect(useCallback(() => { if (!busy.current) setRefresh(n => n + 1); }, []));
  const load = useCallback(async (_signal: AbortSignal) => loadDiary(client, date), [client, date]);
  const { state, retry } = useRequest(load, refresh); const day = state.status === "ready" ? state.data : null;
  return <SafeAreaView style={styles.screen} edges={["bottom", "left", "right"]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={100}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
    <Text accessibilityRole="header" style={styles.title}>Günlüğüm</Text><DayField date={date} onChange={value => { setNotice(""); setDate(value); }} today={() => { setNotice(""); today(); }} disabled={locked} />
    {isDiaryDate(date) && <Button disabled={locked} onPress={retry}>Günlüğü yenile</Button>}
    {notice && <Text accessibilityLiveRegion="polite" style={styles.text}>{notice}</Text>}
    {state.status === "loading" && <Loading />}{state.status === "error" && <Failure message={state.message} retry={retry} />}
    {day && <><View style={styles.card}><Text style={styles.heading}>Günlük toplam</Text><SummaryView value={day.summary} /><Text style={styles.muted}>Değerler yaklaşık. Bir kayıtta besin değeri yoksa ilgili toplam “Eksik veri” olur.</Text></View>
      {day.items.length === 0 && <Text style={styles.text}>Bu güne ait kayıt yok.</Text>}
      {MEAL_SLOTS.map(slot => {
        const entries = day.items.filter(e => e.mealSlot === slot.value); if (!entries.length) return null;
        const summary = day.mealSummaries.find(m => m.mealSlot === slot.value)!.summary;
        return <View key={slot.value} style={styles.card}><Text accessibilityRole="header" style={styles.heading}>{slot.label}</Text><SummaryView value={summary} />{entries.map(entry => <View key={entry.id} style={{ borderTopWidth: 1, borderTopColor: "#d9e4dc", paddingTop: 8, gap: 4 }}>
          <Text style={styles.text}>{entry.mealName}</Text><Text style={styles.muted}>{entry.portion ? `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 8 }).format(entry.portion.quantity)} ${entry.portion.measureName} ≈ ${metric(entry.grams, "g")}` : metric(entry.grams, "g")} · {metric(entry.nutrition.caloriesKcal, "kcal")}</Text>
          <Text style={styles.muted}>Protein: {metric(entry.nutrition.proteinG, "g")} · Karbonhidrat: {metric(entry.nutrition.carbsG, "g")} · Yağ: {metric(entry.nutrition.fatG, "g")}</Text>
          <DiaryEntryActions entry={entry} locked={locked} gate={gate} changed={message => { setNotice(message); retry(); }} check={() => { setNotice("İşlem sonucunu güncel listeden kontrol edin."); retry(); }} />
        </View>)}</View>;
      })}</>}
    <Link href="/" style={styles.heading}>Katalogdan gıda ekle</Link>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
