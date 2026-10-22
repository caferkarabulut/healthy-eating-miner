import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { istanbulDay } from "../api/diary";
export function useDiaryDate(initial?: string) {
  const [date, update] = useState(initial ?? istanbulDay); const manual = useRef(!!initial);
  useEffect(() => {
    const tick = () => { if (!manual.current) update(istanbulDay()); };
    const timer = setInterval(tick, 30000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") tick(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  return { date, setDate: (value: string) => { manual.current = true; update(value); }, today: () => { manual.current = false; update(istanbulDay()); } };
}
