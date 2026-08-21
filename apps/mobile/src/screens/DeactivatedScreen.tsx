import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '../i18n/strings';
import { createStyles } from '../theme';

type Props = {
  onRestore: () => Promise<void>;
  onSignOut: () => void;
};

// The deactivated gate (#15), derived — no canvas artboard: a flat statement
// of where the account stands, with the deliberate restore and 登出. The API
// refuses everything else until one of these is taken.
export function DeactivatedScreen({ onRestore, onSignOut }: Props) {
  const [restoring, setRestoring] = useState(false);
  const [failed, setFailed] = useState(false);

  const restore = async () => {
    setRestoring(true);
    setFailed(false);
    try {
      await onRestore();
    } catch {
      setFailed(true);
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Text style={styles.title}>{strings.settings.deactivatedTitle}</Text>
        <Text style={styles.note}>{strings.settings.deactivatedBody}</Text>
        {failed ? <Text style={styles.error}>{strings.settings.restoreFailed}</Text> : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={styles.restoreButton}
          disabled={restoring}
          onPress={() => void restore()}
        >
          <Text style={styles.restoreLabel}>{strings.settings.restore}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.signOutButton} onPress={onSignOut}>
          <Text style={styles.signOutLabel}>{strings.settings.signOut}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.surface,
    paddingHorizontal: t.spacing.screenGutter,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: t.spacing.space4,
  },
  title: {
    ...t.typography.navTitle,
    color: t.colors.textPrimary,
  },
  note: {
    ...t.typography.note,
    color: t.colors.textSecondary,
  },
  error: {
    ...t.typography.meta,
    color: t.colors.textDestructive,
  },
  actions: {
    gap: t.spacing.space5,
    paddingBottom: t.spacing.space10,
  },
  restoreButton: {
    height: t.spacing.hitMin,
    borderRadius: t.radius.r3,
    backgroundColor: t.colors.controlPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreLabel: {
    ...t.typography.entryTitle,
    color: t.colors.controlPrimaryFg,
  },
  signOutButton: {
    height: t.spacing.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: {
    ...t.typography.entryTitle,
    color: t.colors.textSecondary,
  },
}));
