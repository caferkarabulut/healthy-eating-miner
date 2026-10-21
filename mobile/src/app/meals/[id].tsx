import { useLocalSearchParams } from "expo-router";
import MealScreen from "../../components/MealScreen";
export default function MealRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MealScreen apiUrl={process.env.EXPO_PUBLIC_API_URL} mealId={typeof id === "string" ? id : ""} />;
}
