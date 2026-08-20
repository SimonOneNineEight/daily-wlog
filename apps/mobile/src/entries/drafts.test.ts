import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EntryDraft } from './drafts';
import { clearDraft, listDrafts, newDraftId, saveDraft } from './drafts';

const draft = (overrides: Partial<EntryDraft> = {}): EntryDraft => ({
  id: 'd-1',
  date: '2026-08-19',
  categoryId: 'c-sport',
  content: '{"v":1,"title":"晨跑","note":""}',
  photos: [],
  savedAt: '2026-08-19T12:00:00Z',
  ...overrides,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('round-trips a draft, filtered to its date', async () => {
  await saveDraft(draft());
  await saveDraft(draft({ id: 'd-2', date: '2026-08-20' }));

  expect(await listDrafts('2026-08-19')).toEqual([draft()]);
  expect(await listDrafts('2026-08-20')).toEqual([draft({ id: 'd-2', date: '2026-08-20' })]);
  expect(await listDrafts('2026-08-21')).toEqual([]);
});

it('keeps every draft for a date, oldest first', async () => {
  await saveDraft(draft());
  await saveDraft(draft({ id: 'd-2' }));

  expect((await listDrafts('2026-08-19')).map((d) => d.id)).toEqual(['d-1', 'd-2']);
});

it('upserts by id: a retried failure refreshes its draft in place', async () => {
  await saveDraft(draft());
  await saveDraft(draft({ content: '{"v":1,"title":"夜跑","note":""}', entryId: 'e1' }));

  const found = await listDrafts('2026-08-19');
  expect(found).toHaveLength(1);
  expect(found[0].content).toContain('夜跑');
  expect(found[0].entryId).toBe('e1');
});

it('clears by id and tolerates clearing an id never persisted', async () => {
  await saveDraft(draft());
  await clearDraft('d-1');
  await clearDraft('never-saved');

  expect(await listDrafts('2026-08-19')).toEqual([]);
});

it('reads an unreadable or future-versioned store as empty', async () => {
  await AsyncStorage.setItem('entryDrafts.v1', 'not json');
  expect(await listDrafts('2026-08-19')).toEqual([]);

  await AsyncStorage.setItem('entryDrafts.v1', JSON.stringify({ v: 2, drafts: [draft()] }));
  expect(await listDrafts('2026-08-19')).toEqual([]);
});

it('mints distinct draft ids', () => {
  expect(newDraftId()).not.toBe(newDraftId());
});
