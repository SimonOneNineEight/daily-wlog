import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { installMockApi, type MockApi } from './testing/mockApi';
import { AppRoot } from './AppRoot';

type MockSession = { access_token: string; user: { id: string } };
type Listener = (event: string, session: MockSession | null) => void;

const mockAuthState = {
  listeners: [] as Listener[],
  session: null as MockSession | null,
};

jest.mock('./auth/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: mockAuthState.session } })),
      onAuthStateChange: jest.fn((listener: Listener) => {
        mockAuthState.listeners.push(listener);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
      signOut: jest.fn(async () => {
        mockAuthState.session = null;
        mockAuthState.listeners.forEach((listener) => listener('SIGNED_OUT', null));
      }),
    },
  },
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  init: jest.fn(),
  wrap: (component: unknown) => component,
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => false),
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { BLACK: 0 },
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: jest.fn(),
}));

let api: MockApi;

beforeEach(() => {
  mockAuthState.listeners.length = 0;
  mockAuthState.session = null;
  api = installMockApi();
});

afterEach(() => {
  api.restore();
});

it('shows the sign-in screen when no session exists', async () => {
  render(<AppRoot />);

  expect(await screen.findByText('每天五分鐘，留下你的生活')).toBeTruthy();
  expect(screen.getByText('daily-wlog')).toBeTruthy();
});

it('shows the app and provisions the world when a session exists', async () => {
  mockAuthState.session = { access_token: 'token-1', user: { id: 'u1' } };
  render(<AppRoot />);

  expect(await screen.findByLabelText('新增紀錄')).toBeTruthy();
  const meCall = (globalThis.fetch as jest.Mock).mock.calls.find(([url]) => String(url).endsWith('/me'));
  expect(meCall).toBeTruthy();
  expect(meCall?.[1]?.headers?.Authorization).toBe('Bearer token-1');
  // The resolved App Language rides along as the Starter Category seeding
  // hint (#36); the harness pins it to zh-TW.
  expect(JSON.parse(meCall?.[1]?.body ?? '')).toEqual({ language: 'zh-TW' });
});

it('returns to the sign-in screen on sign-out through settings', async () => {
  mockAuthState.session = { access_token: 'token-1', user: { id: 'u1' } };
  render(<AppRoot />);

  // Sign-out lives in 設定 (#15), behind the month nav's gear.
  fireEvent.press(await screen.findByLabelText('設定'));
  await act(async () => {
    fireEvent.press(await screen.findByText('登出'));
  });

  expect(await screen.findByText('每天五分鐘，留下你的生活')).toBeTruthy();
});

it('gates a deactivated account and restores only on the deliberate tap', async () => {
  mockAuthState.session = { access_token: 'token-1', user: { id: 'u1' } };
  api.restore();
  api = installMockApi({ deactivated: true });

  render(<AppRoot />);
  // A session restore lands on the gate, never silently back in the app.
  expect(await screen.findByText('帳號已停用')).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByText('復原帳號'));
  });
  const reactivateCall = (globalThis.fetch as jest.Mock).mock.calls.find(([u]) =>
    String(u).endsWith('/me/reactivate'),
  );
  expect(reactivateCall).toBeTruthy();
  expect(await screen.findByText(`${new Date().getMonth() + 1}月`)).toBeTruthy();
});

// The zoom-out spans three screens and the routes between them (#40 item 10),
// so it is only true end to end: the month view hands its year over, the
// route carries it, and the year view opens on it. Asserting the two ends
// separately would leave the join untested.
it('returns to the year you came from, not the current one (#40 item 10)', async () => {
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;
  mockAuthState.session = { access_token: 'token-1', user: { id: 'u1' } };
  render(<AppRoot />);
  await screen.findByLabelText('新增紀錄');

  // Month view → year view, back one year, into that year's March.
  await act(async () => {
    fireEvent.press(screen.getByLabelText('年'));
  });
  await screen.findByLabelText('選擇年份');
  act(() => {
    fireGestureHandler(getByGestureTestId('year-fling-prev'), [
      { state: State.BEGAN },
      { state: State.ACTIVE },
      { state: State.END },
    ]);
  });
  expect(screen.getByText(`${lastYear}年`)).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByLabelText('3月'));
  });
  expect(await screen.findByText('3月')).toBeTruthy();

  // ‹年 from there zooms back out to the year that month belongs to.
  await act(async () => {
    fireEvent.press(screen.getByLabelText('年'));
  });
  await waitFor(() => expect(screen.getByLabelText('選擇年份')).toBeTruthy());
  expect(screen.getByText(`${lastYear}年`)).toBeTruthy();
  expect(screen.queryByText(`${thisYear}年`)).toBeNull();
});
