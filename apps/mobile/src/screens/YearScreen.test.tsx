import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { YearScreen } from './YearScreen';

const categories = [
  { id: 'c-work', name: '工作', color: '#4A93C4', icon: 'briefcase', position: 1 },
  { id: 'c-sport', name: '運動', color: '#73B062', icon: 'dumbbell', position: 2 },
];

const realFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = jest.fn(async (url: unknown) => {
    if (String(url).includes('/years/2026')) {
      return {
        ok: true,
        json: async () => ({
          days: [
            { date: '2026-03-15', categoryId: 'c-sport' },
            { date: '2026-08-02', categoryId: 'c-work' },
          ],
          totalEntries: 3,
        }),
      };
    }
    throw new Error(`unexpected fetch ${String(url)}`);
  }) as jest.Mock;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function renderScreen(overrides: Partial<React.ComponentProps<typeof YearScreen>> = {}) {
  return render(
    <YearScreen
      accessToken="tok"
      categories={categories}
      today={new Date(2026, 7, 5)}
      onOpenMonth={jest.fn()}
      onBack={jest.fn()}
      {...overrides}
    />,
  );
}

it('renders twelve mini months with first-entry colors and the year count', async () => {
  renderScreen();

  for (let month = 1; month <= 12; month++) {
    expect(screen.getByLabelText(`${month}月`)).toBeTruthy();
  }
  await waitFor(() => expect(screen.getByTestId('year-day-3-15')).toBeTruthy());
  expect(screen.getByTestId('year-day-3-15')).toHaveStyle({ backgroundColor: '#73B062' });
  expect(screen.getByTestId('year-day-8-2')).toHaveStyle({ backgroundColor: '#4A93C4' });
  expect(screen.getByText('今年到目前為止 3 則紀錄')).toBeTruthy();
});

it('opens the tapped month', async () => {
  const onOpenMonth = jest.fn();
  renderScreen({ onOpenMonth });

  await waitFor(() => expect(screen.getByTestId('year-day-3-15')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('3月'));
  expect(onOpenMonth).toHaveBeenCalledWith(2026, 3);
});

it('jumps back to today through the trailing action', async () => {
  const onOpenMonth = jest.fn();
  renderScreen({ onOpenMonth });

  await waitFor(() => expect(screen.getByTestId('year-day-3-15')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('今天'));
  expect(onOpenMonth).toHaveBeenCalledWith(2026, 8);
});
