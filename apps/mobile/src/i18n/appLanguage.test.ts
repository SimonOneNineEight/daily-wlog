import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadOverride, resolveAppLanguage, saveOverride } from './appLanguage';

// Phones, as expo-localization reports them: first locale is the phone's
// language.
const zhHantPhone = [{ languageCode: 'zh' }];
const zhHansPhone = [{ languageCode: 'zh' }, { languageCode: 'en' }];
const englishPhone = [{ languageCode: 'en' }];
const japanesePhone = [{ languageCode: 'ja' }, { languageCode: 'zh' }];
const unknownPhone = [{ languageCode: null }];

describe('App Language resolution', () => {
  it('any Chinese phone follows to 繁體中文', () => {
    expect(resolveAppLanguage(zhHantPhone, null)).toBe('zh-TW');
    expect(resolveAppLanguage(zhHansPhone, null)).toBe('zh-TW');
  });

  it('every other phone language follows to English', () => {
    expect(resolveAppLanguage(englishPhone, null)).toBe('en');
    expect(resolveAppLanguage(japanesePhone, null)).toBe('en');
  });

  it('a phone without a language code falls back to English', () => {
    expect(resolveAppLanguage(unknownPhone, null)).toBe('en');
    expect(resolveAppLanguage([], null)).toBe('en');
  });

  it('an explicit override beats the phone', () => {
    expect(resolveAppLanguage(zhHantPhone, 'en')).toBe('en');
    expect(resolveAppLanguage(englishPhone, 'zh-TW')).toBe('zh-TW');
  });

  it('System Default returns to following the phone', () => {
    expect(resolveAppLanguage(englishPhone, null)).toBe('en');
    expect(resolveAppLanguage(zhHantPhone, null)).toBe('zh-TW');
  });
});

describe('override persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('a fresh device has no override', async () => {
    expect(await loadOverride()).toBeNull();
  });

  it('round-trips a stored choice', async () => {
    await saveOverride('en');
    expect(await loadOverride()).toBe('en');
    await saveOverride('zh-TW');
    expect(await loadOverride()).toBe('zh-TW');
  });

  it('picking System Default removes the stored choice', async () => {
    await saveOverride('en');
    await saveOverride(null);
    expect(await loadOverride()).toBeNull();
  });

  it('an unreadable store falls back to System Default', async () => {
    await AsyncStorage.setItem('appLanguage.v1', 'not json');
    expect(await loadOverride()).toBeNull();
  });

  it('a future-versioned store falls back to System Default', async () => {
    await AsyncStorage.setItem('appLanguage.v1', JSON.stringify({ v: 2, override: 'en' }));
    expect(await loadOverride()).toBeNull();
  });

  it('a language the app does not ship falls back to System Default', async () => {
    await AsyncStorage.setItem('appLanguage.v1', JSON.stringify({ v: 1, override: 'fr' }));
    expect(await loadOverride()).toBeNull();
  });
});
