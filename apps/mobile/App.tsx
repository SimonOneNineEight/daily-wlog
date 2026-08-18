import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';

import { HealthScreen } from './src/screens/HealthScreen';
import { SpecimenScreen } from './src/screens/SpecimenScreen';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
});

// Dev switch for the token specimen screen (issue #3); real navigation
// arrives with the month view.
const showSpecimen = process.env.EXPO_PUBLIC_SCREEN === 'specimen';

export default Sentry.wrap(function App() {
  return (
    <>
      {showSpecimen ? <SpecimenScreen /> : <HealthScreen />}
      {/* Light-only MVP on a light background: status bar content is dark. */}
      <StatusBar style="dark" />
    </>
  );
});
