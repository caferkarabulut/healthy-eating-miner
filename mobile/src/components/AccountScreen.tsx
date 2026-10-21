import { useEffect, useRef, useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useSession } from "../auth/context";
import { Button, styles, colors } from "./ui";
export default function AccountScreen() {
  const { client, state } = useSession(); const [busy, setBusy] = useState(false); const pending = useRef(false);
  const [message, setMessage] = useState("");
  useEffect(() => { void client.me().catch(() => {}); }, [client]);
  async function perform(logout: boolean) {
    if (pending.current) return; pending.current = true; setBusy(true); setMessage("");
    try { if (logout) { await client.logout(); setMessage("Bu cihazdaki oturum kapatıldı."); } else await client.me(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <SafeAreaView style={styles.screen} edges={["bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.container}>
    <Text accessibilityRole="header" style={styles.title}>Hesabım</Text>
    {state.status === "restoring" ? <Text style={styles.text}>Oturum yükleniyor...</Text> : state.status === "anonymous" ? <>
      {state.message && <Text accessibilityRole="alert" style={styles.text}>{state.message}</Text>}<Text style={styles.text}>Hesabınızı görmek için giriş yapın.</Text><Link href="/login" style={styles.heading}>Giriş yap</Link><Link href="/register" style={styles.text}>Kayıt ol</Link>
    </> : <>
      {state.profile && <Text style={styles.text}>{state.profile.email ?? "E-posta bilgisi yok"}</Text>}
      {state.message && <Text accessibilityRole="alert" style={[styles.text, { color: colors.error }]}>{state.message}</Text>}
      {state.status !== "storage-error" && <Button disabled={busy} onPress={() => void perform(false)}>Hesabı yenile</Button>}
      <Button disabled={busy} onPress={() => void perform(true)}>{state.status === "storage-error" ? "Çıkışı tekrar dene" : "Çıkış yap"}</Button>
      <Text style={styles.muted}>Çıkış bu cihazdaki tokenları siler. Sunucudaki tokenları veya diğer cihazların oturumlarını iptal etmez.</Text>
    </>}
    {message && message !== state.message && <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>}
    <Link href="/" style={styles.text}>Kataloğa dön</Link>
  </ScrollView></SafeAreaView>;
}
