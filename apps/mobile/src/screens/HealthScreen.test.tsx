import { render, screen } from '@testing-library/react-native';

import { installMockApi, type MockApi } from '../testing/mockApi';
import { HealthScreen } from './HealthScreen';

describe('HealthScreen', () => {
  let api: MockApi;
  afterEach(() => {
    api.restore();
  });

  it('shows the API status and schema version from /health', async () => {
    api = installMockApi();

    render(<HealthScreen />);

    expect(await screen.findByText('系統狀態:正常')).toBeTruthy();
    expect(screen.getByText('資料庫版本:1')).toBeTruthy();
  });

  it('shows an unreachable message when the request fails', async () => {
    api = installMockApi({ failures: { health: 'reject' } });

    render(<HealthScreen />);

    expect(await screen.findByText('無法連線到伺服器')).toBeTruthy();
  });

  it('shows an unreachable message when the API reports unhealthy', async () => {
    api = installMockApi({ failures: { health: 'unhealthy' } });

    render(<HealthScreen />);

    expect(await screen.findByText('無法連線到伺服器')).toBeTruthy();
  });
});
