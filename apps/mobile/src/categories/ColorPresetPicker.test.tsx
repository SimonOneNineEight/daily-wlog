import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';

import { theme } from '../theme';

import { installMockApi, type MockApi } from '../testing/mockApi';
import { ColorPresetPicker } from './ColorPresetPicker';

const clay = theme.categories.clay.base;
const existingColors = ['#4A93C4', '#73B062', '#D3AE40'];

let api: MockApi;

beforeEach(() => {
  api = installMockApi({ colorRecents: ['#123456', '#654321'] });
});

afterEach(() => {
  api.restore();
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

describe('forgetting a Saved Color (#47)', () => {
  // The gesture is deliberate on purpose: a long-press, then the Alert that
  // already guards deleting a Photo, an Entry or a Category.
  function longPressSaved(color: string) {
    const alertSpy = jest.spyOn(Alert, 'alert');
    fireEvent(screen.getByLabelText(color), 'longPress');
    const buttons = alertSpy.mock.calls[0][2] ?? [];
    const title = alertSpy.mock.calls[0][0];
    alertSpy.mockRestore();
    return { title, buttons };
  }

  it('drops the color from 已存的顏色 without the drawer being reopened', async () => {
    renderPicker();
    fireEvent.press(screen.getByLabelText('自訂顏色'));
    await act(async () => {});

    const { title, buttons } = longPressSaved('#123456');
    expect(title).toBe('不再保留這個顏色？');
    await act(async () => {
      buttons.find((b) => b.style === 'destructive')?.onPress?.();
    });

    // The six digits travel bare; a "#" in a path would be percent-encoded.
    const forget = api.find('DELETE', '/color-recents/');
    expect(String(forget?.[0])).toContain('/color-recents/123456');
    // The row closed the gap where it stands — the drawer is still open.
    expect(screen.queryByLabelText('#123456')).toBeNull();
    expect(screen.getByLabelText('#654321')).toBeTruthy();
    expect(screen.getByLabelText('色相')).toBeTruthy();
  });

  // A confirmed destructive action that silently does nothing is worse than
  // one that fails loudly: the color sits there still offered, and the tap
  // looks ignored. Every sibling reports (deletePhoto alerts; deleteEntry and
  // deactivateMe raise a failed flag), so this one does too.
  it('says so when the forget fails, and keeps the color', async () => {
    api.restore();
    api = installMockApi({
      colorRecents: ['#123456', '#654321'],
      failures: { colorRecentDelete: true },
    });
    renderPicker();
    fireEvent.press(screen.getByLabelText('自訂顏色'));
    await act(async () => {});

    const alertSpy = jest.spyOn(Alert, 'alert');
    fireEvent(screen.getByLabelText('#123456'), 'longPress');
    await act(async () => {
      (alertSpy.mock.calls[0][2] ?? []).find((b) => b.style === 'destructive')?.onPress?.();
    });

    expect(alertSpy.mock.calls.at(-1)?.[0]).toBe('移除失敗，請再試一次');
    alertSpy.mockRestore();
    expect(screen.getByLabelText('#123456')).toBeTruthy();
  });

  it('keeps the color when the confirmation is canceled', async () => {
    renderPicker();
    fireEvent.press(screen.getByLabelText('自訂顏色'));
    await act(async () => {});

    const { buttons } = longPressSaved('#123456');
    await act(async () => {
      buttons.find((b) => b.style === 'cancel')?.onPress?.();
    });

    expect(api.find('DELETE', '/color-recents/')).toBeUndefined();
    expect(screen.getByLabelText('#123456')).toBeTruthy();
  });
});
