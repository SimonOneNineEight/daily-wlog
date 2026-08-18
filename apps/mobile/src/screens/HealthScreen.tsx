import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '../api/types.gen';
import { strings } from '../i18n/strings';

type Health = components['schemas']['Health'];

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export function HealthScreen() {
  const [health, setHealth] = useState<Health | null>(null);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/healthz`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`healthz responded ${response.status}`);
        }
        return (await response.json()) as Health;
      })
      .then((body) => {
        if (active) setHealth(body);
      })
      .catch(() => {
        if (active) setUnreachable(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      {unreachable ? (
        <Text>{strings.health.unreachable}</Text>
      ) : health ? (
        <>
          <Text>{strings.health.ok}</Text>
          <Text>{strings.health.schemaVersion(health.schemaVersion)}</Text>
        </>
      ) : (
        <Text>{strings.health.loading}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // TODO(#3): replace with semantic color tokens once the theme foundation
    // lands; the spec bans hardcoded colors from the first real component.
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
