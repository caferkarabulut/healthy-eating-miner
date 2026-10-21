import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import { SessionClient } from "./session";
import { secureTokenStore } from "./store";
const Context = createContext<SessionClient | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => new SessionClient(process.env.EXPO_PUBLIC_API_URL, secureTokenStore));
  useEffect(() => {
    void client.restore();
    const listener = AppState.addEventListener("change", state => { if (state === "active") void client.me().catch(() => {}); });
    return () => listener.remove();
  }, [client]);
  return <Context.Provider value={client}>{children}</Context.Provider>;
}
export function useSession() {
  const client = useContext(Context);
  if (!client) throw new Error("SessionProvider required");
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  return { client, state };
}
