import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { SettingsScreen } from './SettingsScreen';

const mockSignOut = jest.fn(async () => ({ error: null }));
jest.mock('../auth/supabase', () => ({
  supabase: { auth: { signOut: () => mockSignOut() } },
}));
jest.mock('../auth/useSession', () => ({
  useSession: () => ({ access_token: 'tok', user: { id: 'u1', email: 'simon@wlog.local' } }),
}));

const realFetch = globalThis.fetch;

beforeEach(() => {
  mockSignOut.mockClear();
  globalThis.fetch = jest.fn(async (url: unknown, init?: { method?: string }) => {
    if (String(url).includes('/me') && init?.method === 'DELETE') {
      return { ok: true, status: 204, json: async () => ({}) };
    }
    throw new Error(`unexpected fetch ${String(url)}`);
  }) as jest.Mock;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function renderSettings(overrides: Partial<React.ComponentProps<typeof SettingsScreen>> = {}) {
  render(<SettingsScreen accessToken="tok" onBack={jest.fn()} {...overrides} />);
}

it('shows the account row', () => {
  renderSettings();
  expect(screen.getByText('simon@wlog.local')).toBeTruthy();
  // 類別 moved out (ratified 2026-08-20): it lives behind the calendar's
  // 類別 sheet, not in settings.
  expect(screen.queryByText('類別')).toBeNull();
});

it('signs out from its own row', () => {
  renderSettings();
  fireEvent.press(screen.getByText('登出'));
  expect(mockSignOut).toHaveBeenCalled();
});

it('deletes the account after the 30-day confirm, then signs out', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  renderSettings();

  fireEvent.press(screen.getByText('刪除帳號'));
  expect(alertSpy).toHaveBeenCalledWith(
    '刪除帳號？',
    '30天內重新登入即可復原。之後所有紀錄、照片與類別將永久刪除。',
    expect.anything(),
  );
  const buttons = alertSpy.mock.calls[0][2] ?? [];
  const destructive = buttons.find((b) => b.style === 'destructive');
  await act(async () => {
    destructive?.onPress?.();
  });

  const del = (globalThis.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'DELETE');
  expect(String(del?.[0])).toContain('/me');
  expect(mockSignOut).toHaveBeenCalled();
  alertSpy.mockRestore();
});
