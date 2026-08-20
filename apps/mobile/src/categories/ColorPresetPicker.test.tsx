import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { theme } from '../theme';

import { ColorPresetPicker } from './ColorPresetPicker';

const clay = theme.categories.clay.base;
const existingColors = ['#4A93C4', '#73B062', '#D3AE40'];

const realFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = jest.fn(async (url: unknown, init?: { method?: string; body?: string }) => {
    const u = String(url);
    if (u.includes('/color-recents') && init?.method === 'PUT') {
      const body = JSON.parse(init.body ?? '{}');
      return { ok: true, json: async () => ({ colors: [body.color, '#123456', '#654321'] }) };
    }
    if (u.includes('/color-recents')) {
      return { ok: true, json: async () => ({ colors: ['#123456', '#654321'] }) };
    }
    throw new Error(`unexpected fetch ${u}`);
  }) as jest.Mock;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function renderPicker(value: string = clay) {
  const onChange = jest.fn();
  render(
    <ColorPresetPicker
      value={value}
      onChange={onChange}
      accessToken="tok"
      existingColors={existingColors}
    />,
  );
  return onChange;
}

function backgroundOf(element: { props: { style?: unknown } }): string | undefined {
  return (StyleSheet.flatten(element.props.style) as { backgroundColor?: string }).backgroundColor;
}

it('opens the drawer from the custom swatch and lists the saved colors', async () => {
  renderPicker();

  fireEvent.press(screen.getByLabelText('自訂顏色'));

  // The canvas drawer: 已存的顏色 row (server-loaded), the color area and
  // hue strip, and the preview card — no preset row inside the drawer.
  expect(await screen.findByText('已存的顏色')).toBeTruthy();
  expect(screen.getByLabelText('#123456')).toBeTruthy();
  expect(screen.getByLabelText('#654321')).toBeTruthy();
  expect(screen.getByLabelText('飽和度與亮度')).toBeTruthy();
  expect(screen.getByLabelText('色相')).toBeTruthy();
  expect(screen.getByText('在月曆上的樣子')).toBeTruthy();
  expect(screen.getByText('與現有類別並排')).toBeTruthy();
});

it('previews the chosen color as a dot beside the existing category colors', async () => {
  renderPicker();

  fireEvent.press(screen.getByLabelText('自訂顏色'));
  fireEvent.press(await screen.findByLabelText('#123456'));

  const chosen = screen.getAllByTestId('preview-dot-chosen');
  expect(chosen.length).toBeGreaterThan(0);
  for (const dot of chosen) {
    expect(backgroundOf(dot)).toBe('#123456');
  }
  const existing = screen.getAllByTestId('preview-dot-existing');
  expect(existing.length).toBeGreaterThan(0);
  for (const dot of existing) {
    expect(existingColors).toContain(backgroundOf(dot));
  }
});

it('commits a custom color through onChange without saving a recent', async () => {
  const onChange = renderPicker();

  fireEvent.press(screen.getByLabelText('自訂顏色'));
  fireEvent.press(await screen.findByLabelText('#123456'));
  await act(async () => {
    fireEvent.press(screen.getByText('完成'));
  });

  expect(onChange).toHaveBeenCalledWith('#123456');
  // The recents save belongs to the category save: a confirmed drawer on a
  // later-canceled sheet must not mark the color as "used".
  const put = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'PUT');
  expect(put).toBeUndefined();
});

it('picks presets on the grid without opening the drawer', () => {
  const onChange = renderPicker();

  fireEvent.press(screen.getByLabelText('blue'));

  expect(onChange).toHaveBeenCalledWith(theme.categories.blue.base);
  expect(screen.queryByLabelText('色相')).toBeNull();
});

it('changes the color through the area and hue accessibility actions', async () => {
  const onChange = renderPicker();

  fireEvent.press(screen.getByLabelText('自訂顏色'));
  await act(async () => {});
  fireEvent(screen.getByLabelText('飽和度與亮度'), 'accessibilityAction', {
    nativeEvent: { actionName: 'lighter' },
  });
  fireEvent(screen.getByLabelText('色相'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  await act(async () => {
    fireEvent.press(screen.getByText('完成'));
  });

  expect(onChange).toHaveBeenCalledTimes(1);
  const committed = onChange.mock.calls[0][0] as string;
  expect(committed).toMatch(/^#[0-9A-F]{6}$/);
  expect(committed).not.toBe(clay);
});

it('cancels without committing anything', async () => {
  const onChange = renderPicker();

  fireEvent.press(screen.getByLabelText('自訂顏色'));
  await act(async () => {});
  fireEvent.press(screen.getByText('取消'));

  expect(onChange).not.toHaveBeenCalled();
  expect((globalThis.fetch as jest.Mock).mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(0);
  expect(screen.queryByLabelText('色相')).toBeNull();
});

it('shows the current custom color on the custom swatch', () => {
  renderPicker('#123456');
  // A non-preset value marks the custom swatch as the selection.
  const custom = screen.getByLabelText('自訂顏色');
  expect(backgroundOf(custom.children[0] as never)).toBe('#123456');
});
