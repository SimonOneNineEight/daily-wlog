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
    if (u.includes('/color-recents') && init?.method === 'PUT') {
      return { ok: true, json: async () => ({ colors: [JSON.parse(init.body ?? '{}').color] }) };
    }
    if (u.includes('/color-recents')) {
      return { ok: true, json: async () => ({ colors: ['#123456'] }) };
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

it('lists parents with subcategories as a subtitle line, per the canvas', () => {
  renderScreen();
  expect(screen.getByText('工作')).toBeTruthy();
  expect(screen.getByText('運動')).toBeTruthy();
  // The child rides its parent's row as subtitle text, not its own row.
  expect(screen.getByText('健身房')).toBeTruthy();
  fireEvent.press(screen.getByText('運動'));
  expect(screen.getByDisplayValue('運動')).toBeTruthy();
});

it('edits a subcategory through the parent sheet with sections disabled', () => {
  renderScreen();
  fireEvent.press(screen.getByText('運動'));
  // The parent sheet's inline sub list opens the child's editor.
  fireEvent.press(screen.getAllByText('健身房')[screen.getAllByText('健身房').length - 1]);
  expect(screen.getByDisplayValue('健身房')).toBeTruthy();
  // Icon/color sections stay present (disabled) and the inherit hint shows.
  expect(screen.getAllByText('圖示').length).toBeGreaterThan(0);
  expect(screen.getByText('子類別沿用上層分類的圖示與顏色。')).toBeTruthy();
});

it('renames a category through the editor', async () => {
  const onCategoriesChanged = jest.fn();
  renderScreen({ onCategoriesChanged });

  fireEvent.press(screen.getByText('運動'));
  fireEvent.changeText(screen.getByDisplayValue('運動'), '健身');
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
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
    fireEvent.press(screen.getByText('儲存'));
  });

  const post = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
  expect(post).toBeTruthy();
  const body = JSON.parse(post?.[1]?.body ?? '{}');
  expect(body).toEqual({ name: '游泳', color: '#73B062', parentId: 'c-sport' });
});

it('creates a top-level category with its icon in one call', async () => {
  renderScreen();

  fireEvent.press(screen.getByLabelText('新增類別'));
  fireEvent.changeText(screen.getByPlaceholderText('名稱'), '園藝');
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  const post = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
  expect(post).toBeTruthy();
  const body = JSON.parse(post?.[1]?.body ?? '{}');
  expect(body.name).toBe('園藝');
  expect(body.icon).toBe('tag');
  const patch = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'PATCH');
  expect(patch).toBeUndefined();
});

it('saves a custom color to the recents only once the category persists', async () => {
  renderScreen();

  fireEvent.press(screen.getByText('美食'));
  fireEvent.press(screen.getByLabelText('自訂顏色'));
  fireEvent.press(await screen.findByLabelText('#123456'));
  await act(async () => {
    fireEvent.press(screen.getByText('完成')); // drawer confirm
  });
  // Drawer confirmed, sheet not saved yet: no recent recorded.
  expect(
    (globalThis.fetch as jest.Mock).mock.calls.find(
      ([url, init]) => String(url).includes('/color-recents') && init?.method === 'PUT',
    ),
  ).toBeUndefined();

  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });
  const put = (globalThis.fetch as jest.Mock).mock.calls.find(
    ([url, init]) => String(url).includes('/color-recents') && init?.method === 'PUT',
  );
  expect(put).toBeTruthy();
  expect(JSON.parse(put?.[1]?.body ?? '{}')).toEqual({ color: '#123456' });
});

it('creates a subcategory by picking a parent in the create sheet', async () => {
  renderScreen();

  fireEvent.press(screen.getByLabelText('新增類別'));
  fireEvent.changeText(screen.getByPlaceholderText('名稱'), '游泳');
  // Expand the 上層分類 row, then pick 運動 (the option row renders last;
  // the month list behind the sheet shares the label).
  fireEvent.press(screen.getByText('無'));
  const options = screen.getAllByText('運動');
  fireEvent.press(options[options.length - 1]);
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  const post = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
  expect(post).toBeTruthy();
  expect(JSON.parse(post?.[1]?.body ?? '{}')).toEqual({
    name: '游泳',
    color: '#73B062',
    parentId: 'c-sport',
  });
});
