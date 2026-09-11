import AsyncStorage from '@react-native-async-storage/async-storage';

// The versioned-envelope discipline every on-device store follows: data
// lives under a version-suffixed key inside a { v: N, … } envelope, an
// absent / unreadable / future-versioned envelope reads as the caller's
// fallback instead of crashing, and a refused write is swallowed — the
// value still holds in memory for the session. Callers own their exact
// envelope shape through encode/decode, so existing devices' data stays
// readable across this extraction.
export type VersionedStore<T> = {
  load(): Promise<T>;
  save(value: T): Promise<void>;
  remove(): Promise<void>;
};

export function versionedStore<T>(options: {
  /** Version-suffixed storage key; bumping the suffix orphans old data on purpose. */
  key: string;
  /** What an absent, unreadable, or rejected envelope reads as. */
  fallback: T;
  /** Full-envelope check (version field included). Return null to fall back. */
  decode: (envelope: unknown) => T | null;
  /** The exact on-disk envelope, version field included. */
  encode: (value: T) => unknown;
}): VersionedStore<T> {
  const { key, fallback, decode, encode } = options;
  return {
    async load() {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw === null) return fallback;
        return decode(JSON.parse(raw)) ?? fallback;
      } catch {
        return fallback;
      }
    },
    async save(value) {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(encode(value)));
      } catch {
        // Swallowed by contract; see the module comment.
      }
    },
    async remove() {
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // Same contract as save.
      }
    },
  };
}
