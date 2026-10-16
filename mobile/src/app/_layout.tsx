import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../components/ui";
export default function RootLayout() {
  return <SafeAreaProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.cream }, headerTintColor: colors.green, contentStyle: { backgroundColor: colors.cream } }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="meals/[id]" options={{ title: "Gıda detayı", headerBackTitle: "Katalog" }} />
  </Stack></SafeAreaProvider>;
}
