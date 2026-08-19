import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { encodeContent } from '../entries/content';
import { DayScreen } from './DayScreen';

const categories = [
  { id: 'c-sport', name: '運動', color: '#73B062', icon: 'dumbbell', position: 1 },
  { id: 'c-food', name: '美食', color: '#D3AE40', icon: 'utensils', position: 2 },
  { id: 'c-gym', name: '健身房', color: '#73B062', icon: 'tag', position: 1, parentId: 'c-sport' },
];

const realFetch = globalThis.fetch;
let listedEntries: object[] = [];

beforeEach(() => {
  listedEntries = [];
  globalThis.fetch = jest.fn(async (url: unknown, init?: { method?: string; body?: string }) => {
    if (String(url).includes('/categories') && init?.method === 'POST') {
      const body = JSON.parse(init.body ?? '{}');
      return {
        ok: true,
        json: async () => ({
          id: 'c-new',
          name: body.name,
          color: body.color,
          icon: 'tag',
          parentId: body.parentId,
          position: 9,
        }),
      };
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
  expect(body.subcategoryId).toBeUndefined();
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

it('keeps the picker to top-level categories', async () => {
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);
  fireEvent.press(await screen.findByText('新增紀錄'));

  expect(screen.getByText('運動')).toBeTruthy();
  expect(screen.queryByText('健身房')).toBeNull();
});

it('creates a category inline from an unmatched search', async () => {
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);
  fireEvent.press(await screen.findByText('新增紀錄'));

  fireEvent.changeText(screen.getByPlaceholderText('類別'), '園藝');
  await act(async () => {
    fireEvent.press(screen.getByText('建立「園藝」'));
  });
  await act(async () => {
    fireEvent.press(screen.getByText('建立類別'));
  });

  const post = (globalThis.fetch as jest.Mock).mock.calls.find(
    ([url, init]) => String(url).includes('/categories') && init?.method === 'POST',
  );
  expect(post).toBeTruthy();
  const body = JSON.parse(post?.[1]?.body ?? '{}');
  expect(body.name).toBe('園藝');
  expect(typeof body.color).toBe('string');
  expect(body.parentId).toBeUndefined();

  // The new category is selected: the title field is available.
  expect(screen.getByPlaceholderText('標題')).toBeTruthy();
  expect(screen.getByText('園藝')).toBeTruthy();
});

it('links an optional subcategory into the saved entry', async () => {
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);
  fireEvent.press(await screen.findByText('新增紀錄'));

  fireEvent.press(screen.getByText('運動'));
  fireEvent.press(screen.getByText('健身房'));
  fireEvent.changeText(screen.getByPlaceholderText('標題'), '腿日');
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  const post = (globalThis.fetch as jest.Mock).mock.calls.find(
    ([url, init]) => String(url).includes('/entries') && init?.method === 'POST',
  );
  const body = JSON.parse(post?.[1]?.body ?? '{}');
  expect(body.subcategoryId).toBe('c-gym');
});

it('creates a subcategory inline under the picked category', async () => {
  render(<DayScreen accessToken="tok" categories={categories} date="2026-08-19" />);
  fireEvent.press(await screen.findByText('新增紀錄'));

  fireEvent.press(screen.getByText('運動'));
  fireEvent.press(screen.getByLabelText('新增子類別'));
  fireEvent.changeText(screen.getByPlaceholderText('子類別'), '晨跑');
  await act(async () => {
    fireEvent.press(screen.getByText('建立'));
  });

  const post = (globalThis.fetch as jest.Mock).mock.calls.find(
    ([url, init]) => String(url).includes('/categories') && init?.method === 'POST',
  );
  const body = JSON.parse(post?.[1]?.body ?? '{}');
  expect(body.name).toBe('晨跑');
  expect(body.parentId).toBe('c-sport');
  expect(body.color).toBe('#73B062');
});
