import { useEffect, useState } from "react";
export type RequestState<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; message: string };
export function useRequest<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; attempt: number; state: RequestState<T> } | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    load(controller.signal).then(data => { if (active) setResult({ load, attempt, state: { status: "ready", data } }); })
      .catch(error => { if (active) setResult({ load, attempt, state: { status: "error", message: error instanceof Error ? error.message : "Katalog alınamadı. Yeniden deneyin." } }); });
    return () => { active = false; controller.abort(); };
  }, [load, attempt]);
  const state: RequestState<T> = result?.load === load && result.attempt === attempt ? result.state : { status: "loading" };
  return { state, retry: () => setAttempt(x => x + 1) };
}
