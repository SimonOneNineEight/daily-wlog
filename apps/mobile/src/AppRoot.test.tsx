import { act, fireEvent, render, screen } from '@testing-library/react-native';

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

const realFetch = globalThis.fetch;

beforeEach(() => {
  mockAuthState.listeners.length = 0;
  mockAuthState.session = null;
  globalThis.fetch = jest.fn(async (url: unknown, init?: { headers?: Record<string, string> }) => {
    if (String(url).endsWith('/healthz')) {
      return { ok: true, json: async () => ({ status: 'ok', schemaVersion: 1 }) };
    }
    if (String(url).endsWith('/me')) {
      return { ok: true, json: async () => ({ userId: 'u1', journalId: 'j1', categories: [] }) };
    }
    if (String(url).includes('/months/')) {
      return { ok: true, json: async () => ({ days: [] }) };
    }
    if (String(url).includes('/entries')) {
      return { ok: true, json: async () => ({ entries: [] }) };
    }
    throw new Error(`unexpected fetch ${String(url)}`);
  }) as jest.Mock;
});

afterEach(() => {
  globalThis.fetch = realFetch;
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
});

it('returns to the sign-in screen on sign-out', async () => {
  mockAuthState.session = { access_token: 'token-1', user: { id: 'u1' } };
  render(<AppRoot />);
  expect(await screen.findByText('登出')).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByText('登出'));
  });

  expect(await screen.findByText('每天五分鐘，留下你的生活')).toBeTruthy();
});
