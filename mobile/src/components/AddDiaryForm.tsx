import { Link, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Text, TextInput, View } from "react-native";
import { addEntry, isDiaryDate, loadPortions, parseAmount, UncertainDiaryError, type MealSlot } from "../api/diary";
import { type Meal } from "../api/catalog";
import { AuthError } from "../auth/session";
import { useSession } from "../auth/context";
import { useDiaryDate } from "../hooks/useDiaryDate";
import { useRequest } from "../hooks/useRequest";
import { DayField, diaryInputStyle, MealSlotField } from "./DiaryFields";
import { Button, colors, styles } from "./ui";
export default function AddDiaryForm({ meal, apiUrl }: { meal: Meal; apiUrl: string | undefined }) {
  const { client, state } = useSession();
  if (!state.profile || !["authenticated", "offline"].includes(state.status)) return <View style={styles.card}><Text style={styles.text}>{state.status === "restoring" ? "Oturum kontrol ediliyor..." : "Günlüğe eklemek için giriş yapın."}</Text><Link href="/login" style={styles.heading}>Giriş yap</Link></View>;
  return <PersonalForm key={`${client.getSessionVersion()}:${state.profile.userId}:${meal.mealId}`} meal={meal} apiUrl={apiUrl} />;
}
function PersonalForm({ meal, apiUrl }: { meal: Meal; apiUrl: string | undefined }) {
  const { client } = useSession(); const { date, setDate, today } = useDiaryDate();
  const [slot, setSlot] = useState<MealSlot>("other"); const [measure, setMeasure] = useState<number | null>(null); const [amount, setAmount] = useState("100");
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [busy, setBusy] = useState(false); const pending = useRef(false); const [error, setError] = useState(""); const [uncertain, setUncertain] = useState(false); const [success, setSuccess] = useState(false);
  const load = useCallback((signal: AbortSignal) => loadPortions(apiUrl, meal.mealId, signal), [apiUrl, meal.mealId]); const portions = useRequest(load);
  const supported = portions.state.status === "ready" ? portions.state.data : [];
  const selected = supported.find(p => p.id === measure); const quantity = parseAmount(amount, !selected);
  // These are inputs only. Final grams and nutrition are calculated by the API.
  function choose(id: number | null) { setMeasure(id); setAmount(id === null ? "100" : "1"); setError(""); }
  async function submit() {
    if (pending.current || uncertain || success) return;
    if (!isDiaryDate(date) || quantity === null) { setError(selected ? "Pozitif bir miktar ve geçerli bir gün girin. Virgüllü adet kullanabilirsiniz." : "0,01–10000 g arasında, en fazla iki ondalıklı miktar ve geçerli bir gün girin."); return; }
    const version = client.getSessionVersion(); pending.current = true; setBusy(true); setError(""); Keyboard.dismiss();
    try {
      await addEntry(client, { mealId: meal.mealId, date, mealSlot: slot, ...(selected ? { portionId: selected.id, quantity } : { grams: quantity }) });
      if (!mounted.current || client.getSessionVersion() !== version) return;
      setSuccess(true); router.push({ pathname: "/diary", params: { date } });
    } catch (reason) {
      if (!mounted.current || client.getSessionVersion() !== version || reason instanceof AuthError && reason.kind === "cancelled") return;
      if (reason instanceof UncertainDiaryError) setUncertain(true);
      setError(reason instanceof Error ? reason.message : "Kayıt eklenemedi. Günlüğünüzü kontrol edin.");
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return <View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>Günlüğe ekle</Text>
    <Text style={styles.text}>Ölçü</Text><View style={styles.row}><Button disabled={busy || uncertain || success} onPress={() => choose(null)}>{measure === null ? "✓ Gram" : "Gram"}</Button>{supported.map(p => <Button key={p.id} disabled={busy || uncertain || success} onPress={() => choose(p.id)}>{measure === p.id ? "✓ " : ""}{p.measureName}</Button>)}</View>
    {portions.state.status === "loading" && <Text style={styles.muted}>Kaynaklı ölçüler yükleniyor; gram kullanabilirsiniz.</Text>}
    {portions.state.status === "error" && <><Text style={styles.muted}>Ölçüler alınamadı; gramla devam edebilirsiniz.</Text><Button onPress={() => { choose(null); portions.retry(); }}>Ölçüleri yeniden yükle</Button></>}
    {portions.state.status === "ready" && !supported.length && <Text style={styles.muted}>Bu gıda için doğrulanmış ölçü yok; gram kullanın.</Text>}
    {selected && <Text style={styles.muted}>1 {selected.measureName} ≈ {new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(selected.gramsPerUnit)} g · {selected.source}. {selected.measureName.includes("cup") ? "USDA cup, Türk su bardağı değildir. " : ""}Yaklaşık gram ve besin değerleri kayıt sonrası günlükte gösterilir.</Text>}
    <Text style={styles.text}>{selected ? "Miktar" : "Gram"}</Text><TextInput accessibilityLabel={selected ? "Miktar" : "Gram"} value={amount} onChangeText={v => { setAmount(v); setError(""); }} keyboardType="decimal-pad" editable={!busy && !uncertain && !success} maxLength={24} style={diaryInputStyle} />
    <DayField date={date} onChange={setDate} today={today} disabled={busy || uncertain || success} /><MealSlotField value={slot} onChange={setSlot} disabled={busy || uncertain || success} />
    {error && <Text accessibilityRole="alert" style={[styles.text, { color: colors.error }]}>{error}</Text>}
    {success ? <Text accessibilityLiveRegion="polite" style={styles.text}>Kayıt eklendi.</Text> : <Button disabled={busy || uncertain} onPress={() => void submit()}>{busy ? "Ekleniyor..." : "Günlüğe ekle"}</Button>}
    <Link href={{ pathname: "/diary", params: { date: isDiaryDate(date) ? date : undefined } }} style={styles.heading}>{uncertain ? "Göndermeden önce günlüğü kontrol et" : "Seçilen günün günlüğünü aç"}</Link>
    {(uncertain || success) && <Button onPress={() => { setUncertain(false); setSuccess(false); setError(""); }}>Kontrol ettim, yeni kayıt hazırla</Button>}
  </View>;
}
