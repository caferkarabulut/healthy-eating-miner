import { useLocalSearchParams } from "expo-router";
import DiaryScreen from "../components/DiaryScreen";
import { isDiaryDate } from "../api/diary";
export default function DiaryRoute() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <DiaryScreen initialDate={typeof date === "string" && isDiaryDate(date) ? date : undefined} />;
}
