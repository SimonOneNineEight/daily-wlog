import { useLocales } from 'expo-localization';
import { createContext, useContext, useEffect, useState } from 'react';

import {
  type AppLanguage,
  type LanguageOverride,
  catalogFor,
  loadOverride,
  resolveAppLanguage,
  saveOverride,
} from './appLanguage';
import { type StringCatalog, strings as zhTW } from './strings';

type AppLanguageValue = {
  language: AppLanguage;
  strings: StringCatalog;
  override: LanguageOverride;
  setOverride: (override: LanguageOverride) => void;
};

// The default pins provider-less trees to zh-TW: the entire screen-test
// suite renders without providers and keeps asserting the primary language.
const AppLanguageContext = createContext<AppLanguageValue>({
  language: 'zh-TW',
  strings: zhTW,
  override: null,
  setOverride: () => {},
});

export function AppLanguageProvider({ children }: { children: React.ReactNode }) {
  const locales = useLocales();
  // undefined = the stored override is still loading (useSession's tri-state).
  const [override, setOverrideState] = useState<LanguageOverride | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void loadOverride().then((stored) => {
      if (active) setOverrideState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  // Behind the splash for one storage read; never a wrong-language flash.
  if (override === undefined) return null;

  const setOverride = (next: LanguageOverride) => {
    setOverrideState(next);
    void saveOverride(next);
  };

  const language = resolveAppLanguage(locales, override);
  const value = { language, strings: catalogFor(language), override, setOverride };
  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function useStrings(): StringCatalog {
  return useContext(AppLanguageContext).strings;
}

export function useAppLanguage(): AppLanguageValue {
  return useContext(AppLanguageContext);
}
