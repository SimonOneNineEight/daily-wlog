import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

import { saveOverride } from './appLanguage';
import { AppLanguageProvider, useAppLanguage, useStrings } from './AppLanguageProvider';

// The harness mock pins the phone to Traditional Chinese, so with no
// override the provider resolves zh-TW.
function Probe() {
  const strings = useStrings();
  const { language, setOverride } = useAppLanguage();
  return (
    <View>
      <Text>{`language:${language}`}</Text>
      <Text>{strings.settings.title}</Text>
      <Pressable onPress={() => setOverride('en')}>
        <Text>choose English</Text>
      </Pressable>
      <Pressable onPress={() => setOverride(null)}>
        <Text>choose System Default</Text>
      </Pressable>
    </View>
  );
}

function renderProbe() {
  return render(
    <AppLanguageProvider>
      <Probe />
    </AppLanguageProvider>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('AppLanguageProvider', () => {
  it('follows the phone and serves its catalog through useStrings', async () => {
    renderProbe();
    expect(await screen.findByText('language:zh-TW')).toBeTruthy();
    expect(screen.getByText('設定')).toBeTruthy();
  });

  it('a stored override wins at launch', async () => {
    await saveOverride('en');
    renderProbe();
    expect(await screen.findByText('language:en')).toBeTruthy();
  });

  it('choosing a language applies immediately and survives a remount', async () => {
    const first = renderProbe();
    fireEvent.press(await screen.findByText('choose English'));
    expect(screen.getByText('language:en')).toBeTruthy();

    first.unmount();
    renderProbe();
    expect(await screen.findByText('language:en')).toBeTruthy();
  });

  it('System Default returns to following the phone, also after a remount', async () => {
    await saveOverride('en');
    const first = renderProbe();
    fireEvent.press(await screen.findByText('choose System Default'));
    expect(screen.getByText('language:zh-TW')).toBeTruthy();

    first.unmount();
    renderProbe();
    expect(await screen.findByText('language:zh-TW')).toBeTruthy();
  });
});

describe('without a provider (the screen-suite harness)', () => {
  it('useStrings serves the zh-TW catalog', () => {
    render(<Probe />);
    expect(screen.getByText('language:zh-TW')).toBeTruthy();
    expect(screen.getByText('設定')).toBeTruthy();
  });
});
