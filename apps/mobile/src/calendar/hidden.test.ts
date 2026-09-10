import {
  allHidden,
  entryIsVisible,
  familyIsVisible,
  hiddenParams,
  hideAll,
  loadHidden,
  nothingHidden,
  saveHidden,
  toggleFamily,
  toggleSubcategory,
} from './hidden';

const sport = { id: 'c-sport' };
const gym = { id: 'c-gym', parentId: 'c-sport' };
const run = { id: 'c-run', parentId: 'c-sport' };
const work = { id: 'c-work' };
const all = [sport, gym, run, work];

describe('entry visibility', () => {
  it('an unrefined entry follows its category', () => {
    const hidden = { categoryIds: ['c-sport'], subcategoryIds: [] };
    expect(entryIsVisible({ categoryId: 'c-sport' }, hidden)).toBe(false);
    expect(entryIsVisible({ categoryId: 'c-work' }, hidden)).toBe(true);
  });

  it('a refined entry follows its subcategory, even under a hidden parent', () => {
    const hidden = { categoryIds: ['c-sport'], subcategoryIds: ['c-run'] };
    expect(entryIsVisible({ categoryId: 'c-sport', subcategoryId: 'c-gym' }, hidden)).toBe(true);
    expect(entryIsVisible({ categoryId: 'c-sport', subcategoryId: 'c-run' }, hidden)).toBe(false);
  });
});

describe('family master switch', () => {
  it('hides the whole family while any member is visible, shows it when none are', () => {
    let hidden = nothingHidden;
    expect(familyIsVisible(hidden, sport, [gym, run])).toBe(true);

    hidden = toggleFamily(hidden, sport, [gym, run]);
    expect(hidden.categoryIds).toContain('c-sport');
    expect(hidden.subcategoryIds).toEqual(expect.arrayContaining(['c-gym', 'c-run']));
    expect(familyIsVisible(hidden, sport, [gym, run])).toBe(false);

    // One child re-lit: the family circle lights, and the next master tap
    // hides everything again rather than toggling blindly.
    hidden = toggleSubcategory(hidden, 'c-gym');
    expect(familyIsVisible(hidden, sport, [gym, run])).toBe(true);
    hidden = toggleFamily(hidden, sport, [gym, run]);
    expect(familyIsVisible(hidden, sport, [gym, run])).toBe(false);

    hidden = toggleFamily(hidden, sport, [gym, run]);
    expect(hidden).toEqual(nothingHidden);
  });

  it('a category without children is a plain toggle', () => {
    let hidden = toggleFamily(nothingHidden, work, []);
    expect(hidden.categoryIds).toEqual(['c-work']);
    hidden = toggleFamily(hidden, work, []);
    expect(hidden.categoryIds).toEqual([]);
  });
});

describe('全部隱藏 / 全部顯示', () => {
  it('hideAll covers both levels and allHidden reports it', () => {
    const hidden = hideAll(all);
    expect(allHidden(hidden, all)).toBe(true);
    expect(allHidden(nothingHidden, all)).toBe(false);
    // A category created afterwards is born visible.
    expect(allHidden(hidden, [...all, { id: 'c-new' }])).toBe(false);
  });

  it('an empty account is never "all hidden"', () => {
    expect(allHidden(nothingHidden, [])).toBe(false);
  });
});

describe('API params', () => {
  it('is undefined when nothing is hidden, the id lists otherwise', () => {
    expect(hiddenParams(nothingHidden)).toBeUndefined();
    expect(hiddenParams({ categoryIds: ['c-work'], subcategoryIds: ['c-gym'] })).toEqual({
      hiddenCategories: ['c-work'],
      hiddenSubcategories: ['c-gym'],
    });
  });
});

describe('persistence', () => {
  it('round-trips through storage and reads absent state as nothing hidden', async () => {
    expect(await loadHidden()).toEqual(nothingHidden);
    const hidden = { categoryIds: ['c-sport'], subcategoryIds: ['c-gym'] };
    await saveHidden(hidden);
    expect(await loadHidden()).toEqual(hidden);
    await saveHidden(nothingHidden);
  });
});
