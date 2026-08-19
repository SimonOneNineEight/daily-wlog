import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { encodeContent } from '../entries/content';
import { DayScreen } from './DayScreen';

const categories = [
  { id: 'c-sport', name: '運動', color: '#73B062', icon: 'dumbbell', position: 1 },
  { id: 'c-food', name: '美食', color: '#D3AE40', icon: 'utensils', position: 2 },
];

const realFetch = globalThis.fetch;
let listedEntries: object[] = [];

beforeEach(() => {
  listedEntries = [];
  globalThis.fetch = jest.fn(async (url: unknown, init?: { method?: string; body?: string }) => {
    if (init?.method === 'PUT') {
      const body = JSON.parse(init.body ?? '{}');
      const byId = Object.fromEntries(listedEntries.map((e: { id?: string }) => [e.id, e]));
      return { ok: true, json: async () => ({ entries: body.entryIds.map((id: string) => byId[id]) }) };
    }
    if (init?.method === 'PATCH') {
      return { ok: true, json: async () => ({ ...listedEntries[0], content: JSON.parse(init.body ?? '{}').content }) };
    }
    if (init?.method === 'DELETE') {
      return { ok: true, status: 204, json: async () => ({}) };
    }
    if (String(url).includes('/entries') && init?.method === 'POST') {
      const body = JSON.parse(init.body ?? '{}');
      return {
        ok: true,
        json: async () => ({
          id: 'e-new',
          date: body.date,
          position: listedEntries.length + 1,
          categoryId: body.categoryId,
          authorId: 'u1',
          content: body.content,
        }),
      };
    }
    if (String(url).includes('/entries')) {
      return { ok: true, json: async () => ({ entries: listedEntries }) };
    }
    throw new Error(`unexpected fetch ${String(url)}`);
  }) as jest.Mock;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

it('renders the day entries with decoded titles, in order', async () => {
  listedEntries = [
    { id: 'e1', date: '2026-08-19', position: 1, categoryId: 'c-sport', authorId: 'u1', content: encodeContent({ title: '晨跑', note: '' }) },
    { id: 'e2', date: '2026-08-19', position: 2, categoryId: 'c-food', authorId: 'u1', content: encodeContent({ title: '午餐吃了拉麵', note: '' }) },
  ];
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);

  expect(await screen.findByText('晨跑')).toBeTruthy();
  expect(screen.getByText('午餐吃了拉麵')).toBeTruthy();
});

it('shows the empty state when the day has no entries', async () => {
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);

  expect(await screen.findByText('今天還沒有紀錄')).toBeTruthy();
});

it('does not save until a category is picked and a title is typed', async () => {
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);
  fireEvent.press(await screen.findByText('新增紀錄'));

  fireEvent.press(screen.getByText('儲存'));
  const posts = () =>
    (globalThis.fetch as jest.Mock).mock.calls.filter(([, init]) => init?.method === 'POST');
  expect(posts()).toHaveLength(0);

  fireEvent.press(screen.getByText('運動'));
  fireEvent.press(screen.getByText('儲存'));
  expect(posts()).toHaveLength(0);
});

it('saves an entry as an encoded blob and returns to the list', async () => {
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);
  fireEvent.press(await screen.findByText('新增紀錄'));

  fireEvent.press(screen.getByText('運動'));
  fireEvent.changeText(screen.getByPlaceholderText('標題'), '晚上打籃球');
  fireEvent.changeText(screen.getByPlaceholderText('備註（選填）'), '和同事');
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  const post = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
  expect(post).toBeTruthy();
  const body = JSON.parse(post?.[1]?.body ?? '{}');
  expect(body.categoryId).toBe('c-sport');
  expect(JSON.parse(body.content)).toEqual({ v: 1, title: '晚上打籃球', note: '和同事' });

  // Back on the list: the form's placeholder is gone.
  expect(screen.queryByPlaceholderText('標題')).toBeNull();
});

it('filters the category picker by search', async () => {
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);
  fireEvent.press(await screen.findByText('新增紀錄'));

  fireEvent.changeText(screen.getByPlaceholderText('類別'), '美');
  expect(screen.queryByText('運動')).toBeNull();
  expect(screen.getByText('美食')).toBeTruthy();
});

const dayEntriesFixture = () => [
  { id: 'e1', date: '2026-08-19', position: 1, categoryId: 'c-sport', authorId: 'u1', content: encodeContent({ title: '晨跑', note: '河濱' }) },
  { id: 'e2', date: '2026-08-19', position: 2, categoryId: 'c-food', authorId: 'u1', content: encodeContent({ title: '午餐', note: '' }) },
];

it('persists a drag reorder through the API', async () => {
  listedEntries = dayEntriesFixture();
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);
  await screen.findByText('晨跑');

  const mockDragState = (globalThis as { __mockDragState?: { onDragEnd?: (p: { data: object[] }) => void } })
    .__mockDragState!;
  expect(typeof mockDragState.onDragEnd).toBe('function');
  await act(async () => {
    mockDragState.onDragEnd?.({ data: [listedEntries[1], listedEntries[0]] });
  });

  const put = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'PUT');
  expect(put).toBeTruthy();
  expect(String(put?.[0])).toContain('/days/2026-08-19/order');
  expect(JSON.parse(put?.[1]?.body ?? '{}').entryIds).toEqual(['e2', 'e1']);
});

it('opens an entry for editing, prefilled, and saves via PATCH', async () => {
  listedEntries = dayEntriesFixture();
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);

  const card = await screen.findByText('晨跑');
  await act(async () => {
    fireEvent.press(card);
  });
  expect(screen.getByPlaceholderText('標題').props.value).toBe('晨跑');
  expect(screen.getByPlaceholderText('備註（選填）').props.value).toBe('河濱');

  fireEvent.changeText(screen.getByPlaceholderText('標題'), '夜跑');
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  const patch = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'PATCH');
  expect(patch).toBeTruthy();
  expect(String(patch?.[0])).toContain('/entries/e1');
  const body = JSON.parse(patch?.[1]?.body ?? '{}');
  expect(body.categoryId).toBe('c-sport');
  expect(JSON.parse(body.content)).toEqual({ v: 1, title: '夜跑', note: '河濱' });
});

it('deletes an entry after confirmation', async () => {
  listedEntries = dayEntriesFixture();
  const alertSpy = jest.spyOn(Alert, 'alert');
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);

  const card = await screen.findByText('晨跑');
  await act(async () => {
    fireEvent.press(card);
  });
  await act(async () => {
    fireEvent.press(screen.getByText('刪除紀錄'));
  });

  expect(alertSpy).toHaveBeenCalled();
  const buttons = alertSpy.mock.calls[0][2] ?? [];
  const destructive = buttons.find((b) => b.style === 'destructive');
  expect(destructive).toBeTruthy();
  await act(async () => {
    destructive?.onPress?.();
  });

  const del = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'DELETE');
  expect(del).toBeTruthy();
  expect(String(del?.[0])).toContain('/entries/e1');
  alertSpy.mockRestore();
});
