import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import type { components } from '../api/types.gen';
import { strings } from '../i18n/strings';
import { createStyles } from '../theme';

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
        <Text style={styles.status}>{strings.health.unreachable}</Text>
      ) : health ? (
        <>
          <Text style={styles.status}>{strings.health.ok}</Text>
          <Text style={styles.meta}>{strings.health.schemaVersion(health.schemaVersion)}</Text>
        </>
      ) : (
        <Text style={styles.meta}>{strings.health.loading}</Text>
      )}
    </View>
  );
}

const styles = createStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.space2,
  },
  status: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
  },
  meta: {
    ...t.typography.meta,
    color: t.colors.textSecondary,
  },
}));
