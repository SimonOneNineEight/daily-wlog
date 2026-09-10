import AsyncStorage from '@react-native-async-storage/async-storage';

import { type StringCatalog, strings as zhTW } from './strings';

export type { StringCatalog } from './strings';

// The App Language (CONTEXT.md): the language the interface renders in.
// Follows the phone — any Chinese language → 繁體中文, anything else →
// English — unless the User stored an explicit per-device override.
export type AppLanguage = 'zh-TW' | 'en';

// null is System Default: no stored choice, follow the phone.
export type LanguageOverride = AppLanguage | null;

// Structural slice of expo-localization's Locale, so pure code and tests
// need no native module.
export type DeviceLocale = { languageCode: string | null };

export function resolveAppLanguage(
  locales: readonly DeviceLocale[],
  override: LanguageOverride,
): AppLanguage {
  if (override !== null) return override;
  return locales[0]?.languageCode === 'zh' ? 'zh-TW' : 'en';
}

// Until the English catalog lands (#34), en temporarily serves the zh-TW
// catalog, so the app renders exactly as today for every user.
const catalogs: Record<AppLanguage, StringCatalog> = { 'zh-TW': zhTW, en: zhTW };

export function catalogFor(language: AppLanguage): StringCatalog {
  return catalogs[language];
}

// Versioned like the hidden-set store: an unreadable or future-versioned
// store reads as System Default instead of crashing the app.
const STORAGE_KEY = 'appLanguage.v1';

// System Default is the absence of a store, never a stored value: only an
// explicit language choice is written.
type Store = { v: 1; override: AppLanguage };

export async function loadOverride(): Promise<LanguageOverride> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Store;
    if (parsed.v !== 1 || (parsed.override !== 'zh-TW' && parsed.override !== 'en')) {
      return null;
    }
    return parsed.override;
  } catch {
    return null;
  }
}

export async function saveOverride(override: LanguageOverride): Promise<void> {
  try {
    if (override === null) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      const store: Store = { v: 1, override };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  } catch {
    // Storage refused the write; the choice still holds for this session.
  }
}
