import AsyncStorage from '@react-native-async-storage/async-storage';

import { versionedStore } from './versionedStore';

// A toy store exercising the full interface; the real stores (hidden set,
// drafts, App Language override) declare their own shapes the same way.
type Pet = { name: string };

const pets = versionedStore<Pet>({
  key: 'petStore.v1',
  fallback: { name: 'nobody' },
  decode: (envelope) => {
    const parsed = envelope as { v?: number; name?: unknown };
    return parsed.v === 1 && typeof parsed.name === 'string' ? { name: parsed.name } : null;
  },
  encode: (pet) => ({ v: 1, ...pet }),
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('versionedStore', () => {
  it('a missing store reads as the fallback', async () => {
    expect(await pets.load()).toEqual({ name: 'nobody' });
  });

  it('round-trips through the exact envelope shape', async () => {
    await pets.save({ name: '黑糖' });
    expect(await pets.load()).toEqual({ name: '黑糖' });
    // The on-disk bytes are the caller's encode verbatim: existing devices'
    // data stays readable across the extraction.
    expect(await AsyncStorage.getItem('petStore.v1')).toBe('{"v":1,"name":"黑糖"}');
  });

  it('an unreadable store reads as the fallback', async () => {
    await AsyncStorage.setItem('petStore.v1', 'not json');
    expect(await pets.load()).toEqual({ name: 'nobody' });
  });

  it('a future-versioned store reads as the fallback', async () => {
    await AsyncStorage.setItem('petStore.v1', JSON.stringify({ v: 2, name: '黑糖' }));
    expect(await pets.load()).toEqual({ name: 'nobody' });
  });

  it('remove returns the store to the fallback', async () => {
    await pets.save({ name: '黑糖' });
    await pets.remove();
    expect(await pets.load()).toEqual({ name: 'nobody' });
  });

  it('a refused write is swallowed, keeping the stored value', async () => {
    await pets.save({ name: '黑糖' });
    const setItem = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await expect(pets.save({ name: '拿鐵' })).resolves.toBeUndefined();
    setItem.mockRestore();
    expect(await pets.load()).toEqual({ name: '黑糖' });
  });

  it('a refused remove is swallowed too', async () => {
    const removeItem = jest
      .spyOn(AsyncStorage, 'removeItem')
      .mockRejectedValueOnce(new Error('disk full'));
    await expect(pets.remove()).resolves.toBeUndefined();
    removeItem.mockRestore();
  });
});
