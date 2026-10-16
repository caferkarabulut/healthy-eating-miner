import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { PropsWithChildren } from "react";
export const colors = { cream: "#f7f8f4", green: "#173f34", ink: "#18312c", muted: "#5b7166", border: "#d9e4dc", pale: "#e5f3e9", error: "#963e36" };
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  container: { padding: 20, gap: 12 }, title: { fontSize: 28, fontWeight: "700", color: colors.ink },
  heading: { fontSize: 20, fontWeight: "600", color: colors.ink }, text: { fontSize: 16, lineHeight: 24, color: colors.ink },
  muted: { fontSize: 14, lineHeight: 21, color: colors.muted },
  card: { padding: 16, backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  button: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600", textAlign: "center" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" },
});
export function Button({ children, onPress, disabled = false, label }: PropsWithChildren<{ onPress: () => void; disabled?: boolean; label?: string }>) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }]}><Text style={styles.buttonText}>{children}</Text></Pressable>;
}
export function Loading() { return <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel="Gıdalar yükleniyor"><ActivityIndicator color={colors.green} /><Text style={styles.muted}>Yükleniyor...</Text></View>; }
export function Failure({ message, retry }: { message: string; retry: () => void }) {
  return <View style={styles.container}><Text accessibilityRole="alert" style={[styles.text, { color: colors.error }]}>{message}</Text><Button onPress={retry}>Tekrar dene</Button></View>;
}
