import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppRoot } from './src/AppRoot';
import { AppLanguageProvider } from './src/i18n/AppLanguageProvider';
import { HealthScreen } from './src/screens/HealthScreen';
import { SpecimenScreen } from './src/screens/SpecimenScreen';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
});

// Dev switches: the token specimen (#3) and the walking skeleton's health
// readout (#2) stay reachable by env; real navigation arrives with the
// month view.
const devScreens: Record<string, () => React.JSX.Element> = {
  specimen: () => <SpecimenScreen />,
  health: () => <HealthScreen />,
};
const DevScreen = devScreens[process.env.EXPO_PUBLIC_SCREEN ?? ''];

export default Sentry.wrap(function App() {
  return (
    <GestureHandlerRootView style={rootStyle}>
      {/* One provider for the whole app (#42, ADR-0006): every form and sheet
          below reads the keyboard from here, so no surface hand-tunes its own
          avoidance. */}
      <KeyboardProvider>
        <SafeAreaProvider>
          <AppLanguageProvider>{DevScreen ? <DevScreen /> : <AppRoot />}</AppLanguageProvider>
          {/* Light-only MVP on a light background: status bar content is dark. */}
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
});

const rootStyle = { flex: 1 } as const;
