import { modelConnectionIdentity } from "@/lib/model-api-config";
import type { ModelApiProfile } from "@/types/config";

/** Per-AppProvider memory only; no browser storage, serialization, or server singleton. */
export function createModelCredentialStore() {
  const keys = new Map<string, { identity: string; key: string }>();
  return {
    get(profile: ModelApiProfile): string {
      const entry = keys.get(profile.id);
      return entry?.identity === modelConnectionIdentity(profile) ? entry.key : "";
    },
    set(profile: ModelApiProfile, key: string) {
      keys.delete(profile.id);
      if (key.trim()) keys.set(profile.id, { identity: modelConnectionIdentity(profile), key: key.trim() });
    },
    delete(id: string) { keys.delete(id); },
    clear() { keys.clear(); },
  };
}
