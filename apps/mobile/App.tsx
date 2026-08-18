import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';

import { HealthScreen } from './src/screens/HealthScreen';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
});

export default Sentry.wrap(function App() {
  return (
    <>
      <HealthScreen />
      {/* TODO(#3): drive from the theme tokens once the foundation lands. */}
      <StatusBar style="dark" />
    </>
  );
});
