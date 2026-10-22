import { SessionProvider } from "../auth/context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../components/ui";
export default function RootLayout() {
  return <SafeAreaProvider><SessionProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.cream }, headerTintColor: colors.green, contentStyle: { backgroundColor: colors.cream } }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="meals/[id]" options={{ title: "Gıda detayı", headerBackTitle: "Katalog" }} />
    <Stack.Screen name="login" options={{ title: "Giriş yap", headerBackTitle: "Katalog" }} />
    <Stack.Screen name="register" options={{ title: "Kayıt ol", headerBackTitle: "Geri" }} />
    <Stack.Screen name="account" options={{ title: "Hesabım", headerBackTitle: "Katalog" }} />
  </Stack></SessionProvider></SafeAreaProvider>;
}
