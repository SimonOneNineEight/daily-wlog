import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { encodeContent } from '../entries/content';
import { EntryFormScreen } from './EntryFormScreen';

const categories = [
  { id: 'c-sport', name: '運動', color: '#73B062', icon: 'dumbbell', position: 1 },
];

const realFetch = globalThis.fetch;
let postedEntry: { date?: string } | null = null;
let patchedEntry: { date?: string } | null = null;

beforeEach(() => {
  postedEntry = null;
  patchedEntry = null;
  globalThis.fetch = jest.fn(async (url: unknown, init?: { method?: string; body?: string }) => {
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
