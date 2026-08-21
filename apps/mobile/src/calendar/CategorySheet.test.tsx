import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { CategorySheet } from './CategorySheet';

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
          icon: body.icon ?? 'tag',
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

function renderSheet(overrides: Partial<React.ComponentProps<typeof CategorySheet>> = {}) {
  const onChange = jest.fn();
  const onCategoriesChanged = jest.fn();
  render(
    <CategorySheet
      accessToken="tok"
      categories={categories}
      filter={{ categoryIds: [], subcategoryIds: [] }}
      onChange={onChange}
      onCategoriesChanged={onCategoriesChanged}
      onClose={jest.fn()}
      {...overrides}
    />,
  );
  return { onChange, onCategoriesChanged };
}

it('splits each row into a filter zone and an edit zone', () => {
  const { onChange } = renderSheet();

  // Tapping the row toggles the lens; tapping ✎ opens the editor instead.
  fireEvent.press(screen.getByText('運動'));
  expect(onChange).toHaveBeenCalledWith({ categoryIds: ['c-sport'], subcategoryIds: [] });

  fireEvent.press(screen.getAllByLabelText('編輯類別')[1]);
  expect(screen.getByDisplayValue('運動')).toBeTruthy();
  expect(onChange).toHaveBeenCalledTimes(1);
});

it('renames a category through the row editor', async () => {
  const { onCategoriesChanged } = renderSheet();

  fireEvent.press(screen.getAllByLabelText('編輯類別')[1]);
  fireEvent.changeText(screen.getByDisplayValue('運動'), '健身');
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  const patch = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'PATCH');
  expect(String(patch?.[0])).toContain('/categories/c-sport');
  expect(JSON.parse(patch?.[1]?.body ?? '{}')).toEqual({ name: '健身' });
  expect(onCategoriesChanged).toHaveBeenCalled();
});

it('edits a subcategory from its expanded row with sections disabled', () => {
  renderSheet();

  fireEvent.press(screen.getByLabelText('展開子類別'));
  // The last ✎ belongs to the freshly revealed 健身房 row.
  const editButtons = screen.getAllByLabelText('編輯類別');
  fireEvent.press(editButtons[editButtons.length - 2]);
  expect(screen.getByDisplayValue('健身房')).toBeTruthy();
  expect(screen.getByText('子類別沿用上層分類的圖示與顏色。')).toBeTruthy();
});

it('deletes an unused category after confirmation', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  renderSheet();

  const editButtons = screen.getAllByLabelText('編輯類別');
  fireEvent.press(editButtons[editButtons.length - 1]); // 美食
  fireEvent.press(screen.getByText('刪除類別'));
  const buttons = alertSpy.mock.calls[0][2] ?? [];
  const destructive = buttons.find((b) => b.style === 'destructive');
  await act(async () => {
    destructive?.onPress?.();
  });

  const del = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'DELETE');
  expect(String(del?.[0])).toContain('/categories/c-food');
  alertSpy.mockRestore();
});

it('creates from the 新增類別 row with the icon in one call', async () => {
  renderSheet();

  fireEvent.press(screen.getByText('新增類別'));
  fireEvent.changeText(screen.getByPlaceholderText('名稱'), '園藝');
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  const post = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
  const body = JSON.parse(post?.[1]?.body ?? '{}');
  expect(body.name).toBe('園藝');
  expect(body.icon).toBe('tag');
});

it('saves a custom color to the recents only once the category persists', async () => {
  renderSheet();

  const editButtons = screen.getAllByLabelText('編輯類別');
  fireEvent.press(editButtons[editButtons.length - 1]); // 美食
  fireEvent.press(screen.getByLabelText('自訂顏色'));
  fireEvent.press(await screen.findByLabelText('#123456'));
  await act(async () => {
    // The sheet's own 完成 is also on screen; the drawer's renders last.
    const confirms = screen.getAllByText('完成');
    fireEvent.press(confirms[confirms.length - 1]);
  });
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
  expect(JSON.parse(put?.[1]?.body ?? '{}')).toEqual({ color: '#123456' });
});

it('creates a subcategory by picking a parent in the editor', async () => {
  renderSheet();

  fireEvent.press(screen.getByText('新增類別'));
  fireEvent.changeText(screen.getByPlaceholderText('名稱'), '游泳');
  fireEvent.press(screen.getByText('無'));
  const options = screen.getAllByText('運動');
  fireEvent.press(options[options.length - 1]);
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });

  const post = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
  expect(JSON.parse(post?.[1]?.body ?? '{}')).toEqual({
    name: '游泳',
    color: '#73B062',
    parentId: 'c-sport',
  });
});
