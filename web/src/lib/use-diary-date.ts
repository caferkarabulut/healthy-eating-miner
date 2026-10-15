"use client";

import { useEffect, useRef, useState } from "react";
import { istanbulDay } from "./diary";

export function useDiaryDate(initialDate?: string) {
  const [date, setDate] = useState(initialDate ?? "");
  const manual = useRef(Boolean(initialDate));
  useEffect(() => {
    const update = () => { if (!manual.current) setDate(istanbulDay()); };
    queueMicrotask(update);
    const timer = setInterval(update, 1000);
    window.addEventListener("focus", update);
    return () => { clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  return { date, selectDate: (value: string) => { manual.current = true; setDate(value); } };
}
