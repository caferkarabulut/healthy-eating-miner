import { Text, TextInput, View } from "react-native";
import { Button, colors, styles } from "./ui";
import { isDiaryDate, MEAL_SLOTS, moveDay, type MealSlot } from "../api/diary";
export const diaryInputStyle = { minHeight: 48, backgroundColor: "white", borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, color: colors.ink, fontSize: 16 };
export function DayField({ date, onChange, today, disabled = false, label = "Gün" }: { date: string; onChange: (date: string) => void; today: () => void; disabled?: boolean; label?: string }) {
  return <View style={{ gap: 8 }}><Text style={styles.text}>{label}</Text><TextInput accessibilityLabel={label} value={date} onChangeText={onChange} editable={!disabled} autoCorrect={false} autoCapitalize="none" maxLength={10} placeholder="YYYY-AA-GG" style={diaryInputStyle} />
    {!isDiaryDate(date) && <Text accessibilityRole="alert" style={styles.muted}>Geçerli bir gün girin (örnek: 2026-10-22).</Text>}
    <View style={styles.row}><Button disabled={disabled || !isDiaryDate(date)} onPress={() => onChange(moveDay(date, -1))}>Önceki gün</Button><Button disabled={disabled} onPress={today}>Bugün</Button><Button disabled={disabled || !isDiaryDate(date)} onPress={() => onChange(moveDay(date, 1))}>Sonraki gün</Button></View>
  </View>;
}
export function MealSlotField({ value, onChange, disabled }: { value: MealSlot; onChange: (slot: MealSlot) => void; disabled: boolean }) {
  return <View style={{ gap: 8 }}><Text style={styles.text}>Öğün</Text><View style={styles.row}>{MEAL_SLOTS.map(slot => <Button key={slot.value} disabled={disabled} label={`${slot.label}${value === slot.value ? ", seçili" : ""}`} onPress={() => onChange(slot.value)}>{value === slot.value ? "✓ " : ""}{slot.label}</Button>)}</View></View>;
}
