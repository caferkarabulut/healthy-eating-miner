import * as SecureStore from "expo-secure-store";
import type { TokenStore } from "./session";
const key = "bite-routine.identity.v1";
const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
export const secureTokenStore: TokenStore = {
  read: () => SecureStore.getItemAsync(key, options),
  write: value => SecureStore.setItemAsync(key, value, options),
  clear: () => SecureStore.deleteItemAsync(key, options),
};
