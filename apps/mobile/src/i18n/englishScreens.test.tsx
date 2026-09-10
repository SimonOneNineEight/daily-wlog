import { render, screen } from '@testing-library/react-native';

import { AppLanguageProvider } from './AppLanguageProvider';
import { SpecimenScreen } from '../screens/SpecimenScreen';

// The one place the harness runs in English (#34): an English-language
// phone, no stored override, a screen rendered through the provider.
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
}));

describe('an English phone with no override', () => {
  it('renders the specimen screen in English end to end', async () => {
    render(
      <AppLanguageProvider>
        <SpecimenScreen />
      </AppLanguageProvider>,
    );

    expect(await screen.findByText('Design specimen')).toBeTruthy();
    expect(screen.getByText('Semantic colors')).toBeTruthy();
    expect(screen.queryByText('設計樣本')).toBeNull();
  });
});
