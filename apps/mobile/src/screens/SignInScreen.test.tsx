import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { SignInScreen } from './SignInScreen';

const mockSignInWithPassword = jest.fn(async (_args: unknown) => ({ error: null }));
const mockSignUp = jest.fn(async (_args: unknown) => ({ data: { session: null }, error: null }));
jest.mock('../auth/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (args: unknown) => mockSignInWithPassword(args),
      signUp: (args: unknown) => mockSignUp(args),
      signInWithIdToken: jest.fn(),
    },
  },
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => false),
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { BLACK: 0 },
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: jest.fn(),
}));

beforeEach(() => {
  mockSignInWithPassword.mockClear();
  mockSignUp.mockClear();
});

it('signs in with email and password', async () => {
  render(<SignInScreen />);

  fireEvent.changeText(screen.getByPlaceholderText('電子郵件'), 'pm@wlog.local');
  fireEvent.changeText(screen.getByPlaceholderText('密碼'), 'secret-123');
  await act(async () => {
    fireEvent.press(screen.getByText('登入'));
  });

  expect(mockSignInWithPassword).toHaveBeenCalledWith({
    email: 'pm@wlog.local',
    password: 'secret-123',
  });
});

it('registers through the toggle and shows the confirm-email notice', async () => {
  render(<SignInScreen />);

  fireEvent.press(screen.getByText('還沒有帳戶？註冊'));
  fireEvent.changeText(screen.getByPlaceholderText('電子郵件'), 'pm@wlog.local');
  fireEvent.changeText(screen.getByPlaceholderText('密碼'), 'secret-123');
  await act(async () => {
    fireEvent.press(screen.getByText('建立帳戶'));
  });

  expect(mockSignUp).toHaveBeenCalledWith({ email: 'pm@wlog.local', password: 'secret-123' });
  // No session back means the project requires email confirmation.
  expect(screen.getByText('請先到信箱點擊確認連結，再回來登入')).toBeTruthy();
});

it('shows the flat error line when sign-in fails', async () => {
  mockSignInWithPassword.mockResolvedValueOnce({ error: new Error('nope') } as never);
  render(<SignInScreen />);

  fireEvent.changeText(screen.getByPlaceholderText('電子郵件'), 'pm@wlog.local');
  fireEvent.changeText(screen.getByPlaceholderText('密碼'), 'wrong');
  await act(async () => {
    fireEvent.press(screen.getByText('登入'));
  });

  expect(screen.getByText('登入失敗，請再試一次')).toBeTruthy();
});
