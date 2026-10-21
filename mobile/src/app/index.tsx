import { router } from "expo-router";
import CatalogScreen from "../components/CatalogScreen";
export default function CatalogRoute() {
  return <CatalogScreen apiUrl={process.env.EXPO_PUBLIC_API_URL} onSelect={mealId => router.push({ pathname: "/meals/[id]", params: { id: String(mealId) } })} />;
}
