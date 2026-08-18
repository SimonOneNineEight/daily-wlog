import { render, screen } from '@testing-library/react-native';

import { HealthScreen } from './HealthScreen';

describe('HealthScreen', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('shows the API status and schema version from /healthz', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', schemaVersion: 1 }),
    }) as jest.Mock;

    render(<HealthScreen />);

    expect(await screen.findByText('系統狀態:正常')).toBeTruthy();
    expect(screen.getByText('資料庫版本:1')).toBeTruthy();
  });

  it('shows an unreachable message when the request fails', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('network down')) as jest.Mock;

    render(<HealthScreen />);

    expect(await screen.findByText('無法連線到伺服器')).toBeTruthy();
  });

  it('shows an unreachable message when the API reports unhealthy', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'database unreachable' }),
    }) as jest.Mock;

    render(<HealthScreen />);

    expect(await screen.findByText('無法連線到伺服器')).toBeTruthy();
  });
});
