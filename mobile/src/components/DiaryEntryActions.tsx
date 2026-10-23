import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Keyboard, Text, TextInput, View } from "react-native";
import { deleteEntry, DiaryMissingError, editPayload, loadPortions, matchesSnapshot, parseAmount, UncertainDiaryError, updateEntry, type DiaryUpdate, type Entry, type MealSlot } from "../api/diary";
import { metric } from "../api/catalog";
import { useSession } from "../auth/context";
import { AuthError } from "../auth/session";
import { useRequest } from "../hooks/useRequest";
import { DayField, diaryInputStyle, MealSlotField } from "./DiaryFields";
import { istanbulDay } from "../api/diary";
import { Button, colors, styles } from "./ui";
export type MutationGate = { acquire: () => boolean; release: () => void };
export default function DiaryEntryActions({ entry, locked, gate, changed, check }: {
  entry: Entry; locked: boolean; gate: MutationGate; changed: (message: string) => void; check: () => void;
}) {
  const { client } = useSession(); const [editing, setEditing] = useState(false); const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false); const [missing, setMissing] = useState(false);
  const mounted = useRef(true), owned = useRef(false), confirming = useRef(false);
  const version = client.getSessionVersion();
  function alive() { return mounted.current && client.getSessionVersion() === version; }
  function release() { if (owned.current) { owned.current = false; gate.release(); } }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; confirming.current = false; if (owned.current) { owned.current = false; gate.release(); } }; }, [gate]);
  async function perform(kind: "save" | "delete", input?: DiaryUpdate, acquired = false) {
    if (!alive()) { release(); return; }
    if (!acquired) { if (!gate.acquire()) return; owned.current = true; }
    setError(""); Keyboard.dismiss();
    try {
      if (kind === "delete") await deleteEntry(client, entry.id); else await updateEntry(client, entry.id, input!);
      if (!alive()) return;
      changed(kind === "delete" ? "Kayıt silindi." : input!.date !== entry.date ? `Kayıt ${input!.date} gününe taşındı. O günü seçerek görebilirsiniz.` : "Kayıt güncellendi.");
    } catch (reason) {
      if (!alive() || reason instanceof AuthError && ["cancelled", "invalid"].includes(reason.kind)) return;
      setUncertain(reason instanceof UncertainDiaryError); setMissing(reason instanceof DiaryMissingError);
      setError(reason instanceof Error ? reason.message : "İşlem tamamlanamadı. Günlüğü yenileyip kontrol edin.");
    } finally { release(); }
  }
  function confirmDelete() {
    if (!alive() || uncertain || missing || !gate.acquire()) return;
    owned.current = true; confirming.current = true;
    const cancel = () => { if (confirming.current) { confirming.current = false; release(); } };
    Alert.alert("Kayıt silinsin mi?", `${entry.mealName} kaydı silinecek. Bu işlem geri alınamaz.`, [
      { text: "Vazgeç", style: "cancel", onPress: cancel },
      { text: "Sil", style: "destructive", onPress: () => { if (!confirming.current) return; confirming.current = false; void perform("delete", undefined, true); } },
    ], { cancelable: true, onDismiss: cancel });
  }
  const blocked = locked || uncertain || missing;
  return <View style={{ gap: 8 }}>
    <View style={styles.row}><Button disabled={blocked} label={`${entry.mealName}, ${metric(entry.grams, "g")} kaydını düzenle`} onPress={() => { setEditing(v => !v); setError(""); }}>{editing ? "Düzenlemeyi kapat" : "Düzenle"}</Button><Button disabled={blocked} label={`${entry.mealName}, ${metric(entry.grams, "g")} kaydını sil`} onPress={confirmDelete}>Sil</Button></View>
    {editing && <EntryEditor entry={entry} disabled={blocked} submit={input => void perform("save", input)} />}
    {error && <Text accessibilityRole="alert" style={[styles.text, { color: colors.error }]}>{error}</Text>}
    {(uncertain || missing) && <Button disabled={locked} onPress={check}>Sonucu kontrol etmek için günlüğü yenile</Button>}
  </View>;
}
function EntryEditor({ entry, disabled, submit }: { entry: Entry; disabled: boolean; submit: (input: DiaryUpdate) => void }) {
  const [unit, setUnit] = useState(entry.portion ? "saved" : "grams");
  const [amount, setAmount] = useState(String(entry.portion?.quantity ?? entry.grams).replace(".", ","));
  const [date, setDate] = useState(entry.date), [slot, setSlot] = useState<MealSlot>(entry.mealSlot), [error, setError] = useState("");
  const load = useCallback((signal: AbortSignal) => loadPortions(process.env.EXPO_PUBLIC_API_URL, entry.mealId, signal), [entry.mealId]);
  const portions = useRequest(load); const items = portions.state.status === "ready" ? portions.state.data : [];
  const selectedLive = items.find(p => `live:${p.id}` === unit);
  const currentSaved = entry.portion && items.find(p => matchesSnapshot(p, entry.portion!));
  function choose(next: string) {
    setUnit(next); setError(""); setAmount(next === "saved" ? String(entry.portion!.quantity).replace(".", ",") : next === "grams" ? String(entry.grams).replace(".", ",") : "1");
  }
  function save() { try { const input = editPayload(entry, unit, amount, date, slot, items); setError(""); submit(input); } catch (reason) { setError(reason instanceof Error ? reason.message : "Bilgilerinizi kontrol edin."); } }
  return <View style={{ gap: 8 }}>
    {entry.portion && <Text style={styles.muted}>Kayıtlı ölçü: {entry.portion.quantity.toLocaleString("tr-TR", { maximumFractionDigits: 8 })} {entry.portion.measureName} ≈ {metric(entry.grams, "g")} · {entry.portion.source}. Kaynak: {entry.portion.sourceDescription}.</Text>}
    <Text style={styles.text}>Miktar ölçüsü</Text><View style={styles.row}>
      {entry.portion && <Button disabled={disabled} onPress={() => choose("saved")}>{unit === "saved" ? "✓ " : ""}Kayıtlı {entry.portion.measureName}</Button>}
      <Button disabled={disabled} onPress={() => choose("grams")}>{unit === "grams" ? "✓ " : ""}Gram</Button>
      {items.map(p => <Button key={p.id} disabled={disabled} onPress={() => choose(`live:${p.id}`)}>{unit === `live:${p.id}` ? "✓ " : ""}Güncel: {p.measureName}</Button>)}
    </View>
    {portions.state.status === "loading" && <Text style={styles.muted}>Güncel ölçüler yükleniyor. Kayıtlı miktarı koruyabilir veya gram kullanabilirsiniz.</Text>}
    {portions.state.status === "error" && <><Text style={styles.muted}>Güncel ölçüler alınamadı. Eski miktar korunabilir; gramla düzenleme yapılabilir.</Text><Button disabled={disabled} onPress={portions.retry}>Ölçüleri yeniden yükle</Button></>}
    {entry.portion && portions.state.status === "ready" && !currentSaved && <Text style={styles.muted}>Kayıtlı ölçü değişmiş veya kaldırılmış. Eski kayıt korunur. Miktarı değiştirmek için gram veya güncel bir ölçüyü açıkça seçin.</Text>}
    {unit === "saved" && entry.portion && parseAmount(amount, false) !== entry.portion.quantity && <Text style={styles.muted}>Miktarı değiştirince güncel kaynak ölçüsü kullanılacak. Eski dönüşümü yalnız tarih/öğün değiştirerek koruyabilirsiniz.</Text>}
    {selectedLive && <Text style={styles.muted}>Güncel ölçü: 1 {selectedLive.measureName} ≈ {metric(selectedLive.gramsPerUnit, "g")}. Miktar güncel kaynakla yeniden çevrilecek. {selectedLive.measureName.includes("cup") ? "USDA cup, Türk su bardağı değildir." : ""}</Text>}
    <Text style={styles.text}>{unit === "grams" ? "Gram" : "Miktar"}</Text><TextInput accessibilityLabel={unit === "grams" ? "Düzenleme gram" : "Düzenleme miktar"} value={amount} onChangeText={value => { setAmount(value); setError(""); }} editable={!disabled} keyboardType="decimal-pad" maxLength={24} style={diaryInputStyle} />
    <DayField label="Kayıt günü" date={date} onChange={value => { setDate(value); setError(""); }} today={() => setDate(istanbulDay())} disabled={disabled} /><MealSlotField value={slot} onChange={setSlot} disabled={disabled} />
    {error && <Text accessibilityRole="alert" style={[styles.text, { color: colors.error }]}>{error}</Text>}<Button disabled={disabled} onPress={save}>Değişiklikleri kaydet</Button>
  </View>;
}
