// Manual mock, auto-applied: jest-expo does not stub expo-localization's
// native module. It pins the harness to a Traditional-Chinese phone, so the
// screen suites keep asserting the zh-TW catalog (#33 testing decision).
import type { Locale } from 'expo-localization';

const zhTWPhone: Locale = {
  languageTag: 'zh-TW',
  languageCode: 'zh',
  languageScriptCode: 'Hant',
  regionCode: 'TW',
  languageRegionCode: 'TW',
  currencyCode: 'TWD',
  currencySymbol: 'NT$',
  languageCurrencyCode: 'TWD',
  languageCurrencySymbol: 'NT$',
  decimalSeparator: '.',
  digitGroupingSeparator: ',',
  textDirection: 'ltr',
  measurementSystem: 'metric',
  temperatureUnit: 'celsius',
};

export const useLocales = (): [Locale] => [zhTWPhone];
