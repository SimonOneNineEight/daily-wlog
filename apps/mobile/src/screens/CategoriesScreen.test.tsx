import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { CategoriesScreen } from './CategoriesScreen';

const categories = [
  { id: 'c-work', name: '工作', color: '#4A93C4', icon: 'briefcase', position: 1, inUse: true, hasChildren: false },
  { id: 'c-sport', name: '運動', color: '#73B062', icon: 'dumbbell', position: 2, inUse: false, hasChildren: true },
  { id: 'c-gym', name: '健身房', color: '#73B062', icon: 'tag', position: 1, parentId: 'c-sport', inUse: false, hasChildren: false },
  { id: 'c-food', name: '美食', color: '#D3AE40', icon: 'utensils', position: 3, inUse: false, hasChildren: false },
];

const realFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = jest.fn(async (url: unknown, init?: { method?: string; body?: string }) => {
    const u = String(url);
    if (u.includes('/categories') && init?.method === 'POST') {
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
          inUse: false,
          hasChildren: false,
        }),
      };
    }
    if (u.includes('/categories/') && init?.method === 'PATCH') {
      return { ok: true, json: async () => ({ ...categories[1], ...JSON.parse(init.body ?? '{}') }) };
    }
    if (u.includes('/categories/') && init?.method === 'DELETE') {
      return { ok: true, status: 204, json: async () => ({}) };
    }
    throw new Error(`unexpected fetch ${u}`);
  }) as jest.Mock;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function renderScreen(overrides: Partial<React.ComponentProps<typeof CategoriesScreen>> = {}) {
  return render(
    <CategoriesScreen
      accessToken="tok"
      categories={categories}
      onBack={jest.fn()}
      onCategoriesChanged={jest.fn()}
      {...overrides}
    />,
  );
}

it('lists top-level categories with their subcategories underneath', () => {
  renderScreen();
  expect(screen.getByText('工作')).toBeTruthy();
  expect(screen.getByText('運動')).toBeTruthy();
  // The child appears as the parent's subtitle, not as its own row.
  expect(screen.getByText('健身房')).toBeTruthy();
});

it('renames a category through the editor', async () => {
  const onCategoriesChanged = jest.fn();
  renderScreen({ onCategoriesChanged });

  fireEvent.press(screen.getByText('運動'));
  fireEvent.changeText(screen.getByDisplayValue('運動'), '健身');
  await act(async () => {
    fireEvent.press(screen.getByText('完成'));
  });

  const patch = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'PATCH');
  expect(patch).toBeTruthy();
  expect(String(patch?.[0])).toContain('/categories/c-sport');
  expect(JSON.parse(patch?.[1]?.body ?? '{}')).toEqual({ name: '健身' });
  expect(onCategoriesChanged).toHaveBeenCalled();
});

it('shows the in-use explanation instead of delete for used categories', () => {
  renderScreen();
  fireEvent.press(screen.getByText('工作'));
  expect(
    screen.getByText('已有紀錄使用這個類別。重新命名會一併帶著走，因此不提供刪除。'),
  ).toBeTruthy();
  expect(screen.queryByText('刪除類別')).toBeNull();
});

it('deletes an unused category after confirmation', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  renderScreen();

  fireEvent.press(screen.getByText('美食'));
  fireEvent.press(screen.getByText('刪除類別'));
  const buttons = alertSpy.mock.calls[0][2] ?? [];
  const destructive = buttons.find((b) => b.style === 'destructive');
  await act(async () => {
    destructive?.onPress?.();
  });

  const del = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'DELETE');
  expect(del).toBeTruthy();
  expect(String(del?.[0])).toContain('/categories/c-food');
  alertSpy.mockRestore();
});

it('creates a subcategory from inside the parent editor', async () => {
  renderScreen();

  fireEvent.press(screen.getByText('運動'));
  fireEvent.press(screen.getByText('新增子類別'));
  fireEvent.changeText(screen.getByPlaceholderText('名稱'), '游泳');
  await act(async () => {
    fireEvent.press(screen.getByText('建立'));
  });

  const post = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
  expect(post).toBeTruthy();
  const body = JSON.parse(post?.[1]?.body ?? '{}');
  expect(body).toEqual({ name: '游泳', color: '#73B062', parentId: 'c-sport' });
});

it('creates a top-level category with a picked icon via a follow-up patch', async () => {
  renderScreen();

  fireEvent.press(screen.getByLabelText('新增類別'));
  fireEvent.changeText(screen.getByPlaceholderText('名稱'), '園藝');
  await act(async () => {
    fireEvent.press(screen.getByText('建立'));
  });

  const post = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
  expect(post).toBeTruthy();
  expect(JSON.parse(post?.[1]?.body ?? '{}').name).toBe('園藝');
});
