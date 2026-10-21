import { useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { useSession } from "../auth/context";
import { AuthError } from "../auth/session";
import type { FieldErrors } from "../auth/feedback";
import { Button, colors, styles } from "./ui";
export default function AuthForm({ register = false }: { register?: boolean }) {
  const { client, state } = useSession();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [fields, setFields] = useState<FieldErrors>({}); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); const pending = useRef(false); const [success, setSuccess] = useState(false);
  function change(field: "email" | "password", value: string) {
    if (field === "email") setEmail(value); else setPassword(value);
    setFields(old => ({ ...old, [field]: undefined })); setError("");
  }
  async function submit() {
    if (pending.current || state.status === "restoring") return;
    const missing: FieldErrors = { ...(!email.trim() ? { email: "E-posta adresinizi girin." } : {}), ...(!password ? { password: "Şifrenizi girin." } : {}) };
    if (Object.keys(missing).length) { setFields(missing); return; }
    pending.current = true; setBusy(true); setFields({}); setError(""); Keyboard.dismiss();
    try {
      if (register) { await client.register(email, password); setSuccess(true); }
      else { await client.login(email, password); router.replace("/account"); }
      setPassword("");
    } catch (reason) {
      if (reason instanceof AuthError) { setError(reason.message); setFields(reason.fields); }
      else setError("İşlem tamamlanamadı. Yeniden deneyin.");
    } finally { pending.current = false; setBusy(false); }
  }
  return <SafeAreaView style={styles.screen} edges={["bottom", "left", "right"]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={100}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>{register ? "Kayıt ol" : "Giriş yap"}</Text>
      {success ? <><Text style={styles.text}>Kaydınız oluşturuldu. Şimdi giriş yapabilirsiniz.</Text><Link href="/login" style={styles.heading}>Giriş yap</Link></> : state.status === "authenticated" ? <><Text style={styles.text}>Zaten oturum açtınız.</Text><Link href="/account" style={styles.heading}>Hesabım</Link></> : <>
        <Text style={styles.text}>E-posta</Text>
        <TextInput accessibilityLabel="E-posta" accessibilityState={{ disabled: busy }} editable={!busy} value={email} onChangeText={v => change("email", v)} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="next" style={input} />
        {fields.email && <Text accessibilityRole="alert" style={fieldError}>{fields.email}</Text>}
        <Text style={styles.text}>Şifre</Text>
        <TextInput accessibilityLabel="Şifre" accessibilityState={{ disabled: busy }} editable={!busy} value={password} onChangeText={v => change("password", v)} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={register ? "new-password" : "current-password"} textContentType={register ? "newPassword" : "password"} returnKeyType="go" onSubmitEditing={() => void submit()} style={input} />
        {fields.password && <Text accessibilityRole="alert" style={fieldError}>{fields.password}</Text>}
        {register && <Text style={styles.muted}>Şifre en az 8 karakter; büyük/küçük harf, rakam ve özel karakter içermeli.</Text>}
        {error && <Text accessibilityRole="alert" style={fieldError}>{error}</Text>}
        <Button disabled={busy || state.status === "restoring"} onPress={() => void submit()}>{busy ? "İşleniyor..." : register ? "Kayıt ol" : "Giriş yap"}</Button>
        {state.status === "restoring" && <Text style={styles.muted}>Oturum kontrol ediliyor...</Text>}
        <Link href={register ? "/login" : "/register"} style={styles.text}>{register ? "Hesabım var, giriş yap" : "Hesabım yok, kayıt ol"}</Link>
      </>}
      <Link href="/" style={styles.text}>Kataloğa dön</Link>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const input = { minHeight: 48, backgroundColor: "white", borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, color: colors.ink, fontSize: 16 };
const fieldError = { ...styles.text, color: colors.error };
