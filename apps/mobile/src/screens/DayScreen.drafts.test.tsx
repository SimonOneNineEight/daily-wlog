import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { encodeContent } from '../entries/content';
import type { EntryDraft } from '../entries/drafts';
import { saveDraft } from '../entries/drafts';
import { DayScreen } from './DayScreen';

const categories = [
  { id: 'c-sport', name: '運動', color: '#73B062', icon: 'dumbbell', position: 1 },
  { id: 'c-food', name: '美食', color: '#D3AE40', icon: 'utensils', position: 2 },
];

const realFetch = globalThis.fetch;
let listedEntries: object[] = [];
// Failure switches, flipped mid-test to play the airplane-mode story.
let failEntryWrites = false;
let failPresign = false;

beforeEach(async () => {
  await AsyncStorage.clear();
  listedEntries = [];
  failEntryWrites = false;
  failPresign = false;
  globalThis.fetch = jest.fn(async (url: unknown, init?: { method?: string; body?: string }) => {
    const u = String(url);
    const method = init?.method ?? 'GET';
    if (u.startsWith('file://')) {
      // A draft photo's local copy; "gone" plays a cache file the OS purged.
      if (u.includes('gone')) throw new TypeError('Network request failed');
      return { ok: true, blob: async () => new Blob(['bytes']) };
    }
    if (u.startsWith('https://store/up/')) {
      return { ok: true, json: async () => ({}) };
    }
    if (u.endsWith('/photos/presign') && method === 'POST') {
      if (failPresign) throw new TypeError('Network request failed');
      const count = JSON.parse(init?.body ?? '{}').count as number;
      return {
        ok: true,
        json: async () => ({
          uploads: Array.from({ length: count }, (_, i) => ({
            objectPath: `u/e/${i}.jpg`,
            thumbPath: `u/e/${i}_t.jpg`,
            uploadUrl: `https://store/up/${i}`,
            thumbUploadUrl: `https://store/up/${i}t`,
          })),
        }),
      };
    }
    if (u.endsWith('/photos') && method === 'POST') {
      return { ok: true, status: 201, json: async () => ({ photos: [] }) };
    }
    if (method === 'PATCH') {
      if (failEntryWrites) throw new TypeError('Network request failed');
      const body = JSON.parse(init?.body ?? '{}');
      return {
        ok: true,
        json: async () => ({
          id: u.split('/').pop(),
          date: '2026-08-19',
          position: 1,
          categoryId: body.categoryId,
          authorId: 'u1',
          content: body.content,
        }),
      };
    }
    if (u.endsWith('/entries') && method === 'POST') {
      if (failEntryWrites) throw new TypeError('Network request failed');
      const body = JSON.parse(init?.body ?? '{}');
      return {
        ok: true,
        json: async () => ({
          id: 'e-new',
          date: body.date,
          position: 1,
          categoryId: body.categoryId,
          authorId: 'u1',
          content: body.content,
        }),
      };
    }
    if (u.includes('/entries')) {
      return { ok: true, json: async () => ({ entries: listedEntries }) };
    }
    throw new Error(`unexpected fetch ${u}`);
  }) as jest.Mock;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const calls = () => (globalThis.fetch as jest.Mock).mock.calls;
const entryPosts = () =>
  calls().filter(([u, init]) => String(u).endsWith('/entries') && init?.method === 'POST');

const storedDrafts = async (): Promise<EntryDraft[]> => {
  const raw = await AsyncStorage.getItem('entryDrafts.v1');
  return raw ? (JSON.parse(raw).drafts as EntryDraft[]) : [];
};

it('keeps a failed save as a draft, resurfaces it after relaunch, and clears it on a successful retry', async () => {
  failEntryWrites = true;
  const first = render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);
  fireEvent.press(await screen.findByLabelText('新增紀錄'));
  fireEvent.press(screen.getByText('運動'));
  fireEvent.changeText(screen.getByPlaceholderText('標題'), '晨跑');
  fireEvent.changeText(screen.getByPlaceholderText('備註（選填）'), '河濱公園');
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  // The failure is stated and the full Entry sits in storage.
  expect(screen.getByText('儲存失敗，請再試一次')).toBeTruthy();
  const kept = await storedDrafts();
  expect(kept).toHaveLength(1);
  expect(kept[0].date).toBe('2026-08-19');
  expect(kept[0].categoryId).toBe('c-sport');
  expect(kept[0].entryId).toBeUndefined();
  expect(JSON.parse(kept[0].content)).toEqual({ v: 1, title: '晨跑', note: '河濱公園' });

  // Relaunch: a fresh mount, the network back.
  first.unmount();
  failEntryWrites = false;
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);

  const row = await screen.findByText('晨跑');
  expect(screen.getByText('尚未儲存')).toBeTruthy();
  await act(async () => {
    fireEvent.press(row);
  });

  // Prefilled from the draft.
  expect(screen.getByPlaceholderText('標題').props.value).toBe('晨跑');
  expect(screen.getByPlaceholderText('備註（選填）').props.value).toBe('河濱公園');
  expect(screen.getByText('運動')).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  // The retry carried the exact payload the failed attempt had, and success
  // cleared the draft.
  const posts = entryPosts();
  expect(posts).toHaveLength(2); // the failed attempt, then the retry
  expect(posts[1][1]?.body).toBe(posts[0][1]?.body);
  const body = JSON.parse(posts[1][1]?.body ?? '{}');
  expect(body.date).toBe('2026-08-19');
  expect(body.categoryId).toBe('c-sport');
  expect(JSON.parse(body.content)).toEqual({ v: 1, title: '晨跑', note: '河濱公園' });
  expect(await storedDrafts()).toEqual([]);
  expect(screen.queryByText('尚未儲存')).toBeNull();
});

it('keeps a failed edit pinned to its Entry and retries as an update', async () => {
  listedEntries = [
    { id: 'e1', date: '2026-08-19', position: 1, categoryId: 'c-sport', authorId: 'u1', content: encodeContent({ title: '晨跑', note: '河濱' }) },
  ];
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);

  const card = await screen.findByText('晨跑');
  await act(async () => {
    fireEvent.press(card);
  });
  fireEvent.changeText(screen.getByPlaceholderText('標題'), '夜跑');
  failEntryWrites = true;
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  expect(screen.getByText('儲存失敗，請再試一次')).toBeTruthy();
  const kept = await storedDrafts();
  expect(kept).toHaveLength(1);
  expect(kept[0].entryId).toBe('e1');

  // Leaving the form loses nothing: the day now shows the kept draft.
  await act(async () => {
    fireEvent.press(screen.getByText('取消'));
  });
  const row = await screen.findByText('夜跑');
  expect(screen.getByText('尚未儲存')).toBeTruthy();

  failEntryWrites = false;
  await act(async () => {
    fireEvent.press(row);
  });
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  const patch = calls().find(([, init]) => init?.method === 'PATCH');
  expect(String(patch?.[0])).toContain('/entries/e1');
  expect(JSON.parse(JSON.parse(patch?.[1]?.body ?? '{}').content).title).toBe('夜跑');
  expect(entryPosts()).toHaveLength(0); // never a duplicate create
  expect(await storedDrafts()).toEqual([]);
});

it('keeps the photos when only the upload fails, then retries as an update with the photos', async () => {
  await saveDraft({
    id: 'd-photos',
    date: '2026-08-19',
    categoryId: 'c-sport',
    content: encodeContent({ title: '拍照', note: '' }),
    photos: [{ fullUri: 'file:///a.jpg', thumbUri: 'file:///a_t.jpg' }],
    savedAt: '2026-08-19T12:00:00Z',
  });
  failPresign = true;
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);

  const row = await screen.findByText('拍照');
  await act(async () => {
    fireEvent.press(row);
  });
  expect(screen.getByTestId('grid-item-staged:0')).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  // The Entry's words landed; the draft keeps the photos, pinned to the id.
  expect(screen.getByText('照片上傳失敗，請再試一次')).toBeTruthy();
  const kept = await storedDrafts();
  expect(kept[0].entryId).toBe('e-new');
  expect(kept[0].photos).toEqual([{ fullUri: 'file:///a.jpg', thumbUri: 'file:///a_t.jpg' }]);

  failPresign = false;
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  // One create, then an update — and the photo pipeline ran to the end.
  expect(entryPosts()).toHaveLength(1);
  const patch = calls().find(([, init]) => init?.method === 'PATCH');
  expect(String(patch?.[0])).toContain('/entries/e-new');
  const puts = calls().filter(([u, init]) => String(u).startsWith('https://store/up/') && init?.method === 'PUT');
  expect(puts).toHaveLength(2);
  const register = calls().find(([u, init]) => String(u).endsWith('/photos') && init?.method === 'POST');
  expect(String(register?.[0])).toContain('/entries/e-new/photos');
  expect(await storedDrafts()).toEqual([]);
});

it('prunes purged photo files from a restored draft, says so, and still saves', async () => {
  await saveDraft({
    id: 'd-purged',
    date: '2026-08-19',
    categoryId: 'c-sport',
    content: encodeContent({ title: '舊照', note: '' }),
    photos: [
      { fullUri: 'file:///gone.jpg', thumbUri: 'file:///gone_t.jpg' },
      { fullUri: 'file:///a.jpg', thumbUri: 'file:///a_t.jpg' },
    ],
    savedAt: '2026-08-19T12:00:00Z',
  });
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);

  const row = await screen.findByText('舊照');
  await act(async () => {
    fireEvent.press(row);
  });

  expect(await screen.findByText('部分照片已無法讀取')).toBeTruthy();
  // Only the surviving photo remains staged.
  expect(screen.getByTestId('grid-item-staged:0')).toBeTruthy();
  expect(screen.queryByTestId('grid-item-staged:1')).toBeNull();

  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  const presign = calls().find(([u, init]) => String(u).endsWith('/photos/presign') && init?.method === 'POST');
  expect(JSON.parse(presign?.[1]?.body ?? '{}').count).toBe(1);
  expect(await storedDrafts()).toEqual([]);
});
