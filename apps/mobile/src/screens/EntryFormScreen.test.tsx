import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { encodeContent } from '../entries/content';
import { EntryFormScreen } from './EntryFormScreen';

const categories = [
  { id: 'c-sport', name: '運動', color: '#73B062', icon: 'dumbbell', position: 1 },
];

const realFetch = globalThis.fetch;
let postedEntry: { date?: string; subcategoryId?: string } | null = null;
let patchedEntry: { date?: string } | null = null;
let categoryPosts: { name?: string; parentId?: string; color?: string }[] = [];
let failCategoryPost = false;

beforeEach(() => {
  postedEntry = null;
  patchedEntry = null;
  categoryPosts = [];
  failCategoryPost = false;
  globalThis.fetch = jest.fn(async (url: unknown, init?: { method?: string; body?: string }) => {
    if (String(url).includes('/categories') && init?.method === 'POST') {
      const body = JSON.parse(init.body ?? '{}');
      if (failCategoryPost) {
        return { ok: false, status: 500, json: async () => ({ message: 'nope' }) };
      }
      categoryPosts.push(body);
      return {
        ok: true,
        json: async () => ({
          id: `c-new-${categoryPosts.length}`,
          name: body.name,
          color: body.color,
          icon: body.parentId ? 'tag' : (body.icon ?? 'tag'),
          parentId: body.parentId,
          position: 9,
        }),
      };
    }
    if (String(url).includes('/entries/') && init?.method === 'PATCH') {
      patchedEntry = JSON.parse(init.body ?? '{}');
      return {
        ok: true,
        json: async () => ({
          id: 'e1',
          date: patchedEntry?.date,
          position: 1,
          categoryId: 'c-sport',
          authorId: 'u1',
          content: encodeContent({ title: '晨跑', note: '' }),
        }),
      };
    }
    if (String(url).includes('/entries') && init?.method === 'POST') {
      postedEntry = JSON.parse(init.body ?? '{}');
      return {
        ok: true,
        json: async () => ({
          id: 'e-new',
          date: postedEntry?.date,
          position: 1,
          categoryId: 'c-sport',
          authorId: 'u1',
          content: encodeContent({ title: '晨跑', note: '' }),
        }),
      };
    }
    throw new Error(`unexpected fetch ${String(url)}`);
  }) as jest.Mock;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function renderForm(overrides: Partial<React.ComponentProps<typeof EntryFormScreen>> = {}) {
  return render(
    <EntryFormScreen
      accessToken="tok"
      date="2026-08-17"
      categories={categories}
      onDone={jest.fn()}
      {...overrides}
    />,
  );
}

async function fillAndSave() {
  fireEvent.press(screen.getByText('運動'));
  fireEvent.changeText(screen.getByPlaceholderText('標題'), '晨跑');
  await act(async () => {
    fireEvent.press(screen.getByText('儲存'));
  });
}

describe('date row (#24)', () => {
  it('shows the opened-for date and saves onto it untouched', async () => {
    const onDone = jest.fn();
    renderForm({ onDone });

    expect(screen.getByText('日期')).toBeTruthy();
    expect(screen.getAllByText('8月17日 星期一').length).toBeGreaterThan(0);
    await fillAndSave();
    expect(postedEntry?.date).toBe('2026-08-17');
    expect(onDone).toHaveBeenCalledWith(true);
  });

  it('saves onto the date picked in the compact picker', async () => {
    renderForm();

    fireEvent.press(screen.getByText('日期'));
    const sheet = within(screen.getByTestId('date-picker-sheet'));
    // '20' also exists as a neighboring outside cell; the first is August's.
    await act(async () => {
      fireEvent.press(sheet.getAllByText('20')[0]);
    });
    expect(screen.getAllByText('8月20日 星期四').length).toBeGreaterThan(0);

    await fillAndSave();
    expect(postedEntry?.date).toBe('2026-08-20');
  });

  it('steps the picker to a neighboring month before picking', async () => {
    renderForm();

    fireEvent.press(screen.getByText('日期'));
    fireEvent.press(screen.getByLabelText('下個月'));
    const sheet = within(screen.getByTestId('date-picker-sheet'));
    await act(async () => {
      fireEvent.press(sheet.getAllByText('2')[0]);
    });

    await fillAndSave();
    expect(postedEntry?.date).toBe('2026-09-02');
  });

  it("edit mode shows the entry's date and picking a new one drives the move (#25)", async () => {
    renderForm({
      entry: {
        id: 'e1',
        date: '2026-08-10',
        position: 1,
        categoryId: 'c-sport',
        authorId: 'u1',
        content: encodeContent({ title: '晨跑', note: '' }),
      },
    });

    expect(screen.getAllByText('8月10日 星期一').length).toBeGreaterThan(0);
    fireEvent.press(screen.getByText('日期'));
    const sheet = within(screen.getByTestId('date-picker-sheet'));
    await act(async () => {
      fireEvent.press(sheet.getAllByText('12')[0]);
    });

    await act(async () => {
      fireEvent.press(screen.getByText('儲存'));
    });
    expect(patchedEntry?.date).toBe('2026-08-12');
  });
});

describe('category step (#28)', () => {
  it('creates a typed-but-unconfirmed subcategory together with the entry at 儲存', async () => {
    renderForm();
    fireEvent.press(screen.getByText('運動'));
    fireEvent.press(screen.getByLabelText('新增子類別'));
    fireEvent.changeText(screen.getByPlaceholderText('子類別'), '夜跑');
    fireEvent(screen.getByPlaceholderText('子類別'), 'blur');

    // The pending name renders in the category line like a confirmed pick.
    expect(screen.getByText('夜跑')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('標題'), '晨跑');
    await act(async () => {
      fireEvent.press(screen.getByText('儲存'));
    });

    expect(categoryPosts).toEqual([{ name: '夜跑', color: '#73B062', parentId: 'c-sport' }]);
    expect(postedEntry?.subcategoryId).toBe('c-new-1');
  });

  it('creates nothing when the subcategory field is whitespace or cleared', async () => {
    renderForm();
    fireEvent.press(screen.getByText('運動'));
    fireEvent.press(screen.getByLabelText('新增子類別'));
    fireEvent.changeText(screen.getByPlaceholderText('子類別'), '   ');
    fireEvent(screen.getByPlaceholderText('子類別'), 'blur');

    fireEvent.changeText(screen.getByPlaceholderText('標題'), '晨跑');
    await act(async () => {
      fireEvent.press(screen.getByText('儲存'));
    });
    expect(categoryPosts).toEqual([]);
    expect(postedEntry?.subcategoryId).toBeUndefined();
  });

  it('fails the whole save into the draft path when the subcategory create fails', async () => {
    failCategoryPost = true;
    const onDone = jest.fn();
    renderForm({ onDone });
    fireEvent.press(screen.getByText('運動'));
    fireEvent.press(screen.getByLabelText('新增子類別'));
    fireEvent.changeText(screen.getByPlaceholderText('子類別'), '夜跑');
    fireEvent.changeText(screen.getByPlaceholderText('標題'), '晨跑');
    await act(async () => {
      fireEvent.press(screen.getByText('儲存'));
    });

    expect(postedEntry).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText('儲存失敗，請再試一次')).toBeTruthy();
  });

  it('pins a 新增類別 row that opens the in-form creation step without typing', async () => {
    renderForm();

    fireEvent.press(screen.getByText('新增類別'));
    fireEvent.changeText(screen.getByPlaceholderText('名稱'), '閱讀');
    await act(async () => {
      fireEvent.press(screen.getByText('建立類別'));
    });

    expect(categoryPosts).toEqual([{ name: '閱讀', color: expect.any(String) }]);
    // The step closes into the chosen-category state.
    expect(screen.getByText('閱讀')).toBeTruthy();
    expect(screen.getByPlaceholderText('標題')).toBeTruthy();
  });
});
