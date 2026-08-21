import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deactivateMe } from '../api/client';
import { supabase } from '../auth/supabase';
import { useSession } from '../auth/useSession';
import { strings } from '../i18n/strings';
import { Pressable } from '../theme/press';
import { createStyles, theme } from '../theme';

type Props = {
  accessToken: string;
  onBack: () => void;
};

// Settings (#15), derived — no canvas artboard: quiet cards of rows in the
// list idiom (類別 moved to the calendar's 類別 sheet, ratified 2026-08-20);
// leaving is a right, so 刪除帳號 closes the screen with the grace spelled
// out.
export function SettingsScreen({ accessToken, onBack }: Props) {
  const session = useSession();
  const [failed, setFailed] = useState(false);

  const confirmDelete = () => {
    Alert.alert(strings.settings.deleteConfirmTitle, strings.settings.deleteConfirmBody, [
      { text: strings.entryForm.cancel, style: 'cancel' },
      {
        text: strings.settings.deleteConfirm,
        style: 'destructive',
        onPress: () => {
          // Global sign-out revokes every device's refresh token: a deletion
          // must not be silently undone by another signed-in phone.
          deactivateMe(accessToken)
            .then(() => supabase.auth.signOut({ scope: 'global' }))
            .catch(() => setFailed(true));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.day.back}
          style={styles.navButton}
          onPress={onBack}
        >
          <ChevronLeft size={22} color={theme.colors.iconDefault} strokeWidth={2} />
        </Pressable>
        <Text style={styles.navTitle}>{strings.settings.title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View>
          <Text style={styles.sectionHeader}>{strings.settings.accountHeader}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.rowTitle, styles.rowText]} numberOfLines={1}>
                {session?.user.email ?? ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            style={styles.row}
            onPress={() => {
              void supabase.auth.signOut();
            }}
          >
            <Text style={[styles.rowTitle, styles.rowText]}>{strings.settings.signOut}</Text>
          </Pressable>
        </View>

        {failed ? <Text style={styles.error}>{strings.settings.deleteFailed}</Text> : null}

        <Pressable accessibilityRole="button" style={styles.deleteButton} onPress={confirmDelete}>
          <Trash2 size={16} color={theme.colors.textDestructive} strokeWidth={2} />
          <Text style={styles.deleteLabel}>{strings.settings.deleteAccount}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space4,
    height: t.spacing.navBarHeight,
    paddingHorizontal: t.spacing.space4,
  },
  navButton: {
    width: t.spacing.hitMin,
    height: t.spacing.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
    flex: 1,
  },
  body: {
    gap: t.spacing.space7,
    paddingHorizontal: t.spacing.screenGutter,
    paddingTop: t.spacing.space5,
    paddingBottom: t.spacing.space10,
  },
  sectionHeader: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
    marginBottom: t.spacing.space4,
    marginLeft: t.spacing.space1,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space5,
    minHeight: t.spacing.rowHeight,
    paddingVertical: t.spacing.rowPaddingY,
    paddingHorizontal: t.spacing.cardPadding,
  },
  rowDivided: {
    borderBottomWidth: t.border.hairline,
    borderBottomColor: t.colors.lineSeparator,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
    flexShrink: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.spacing.space3,
    height: t.spacing.hitMin,
    paddingHorizontal: t.spacing.space2,
  },
  deleteLabel: {
    ...t.typography.entryTitle,
    color: t.colors.textDestructive,
  },
  error: {
    ...t.typography.meta,
    color: t.colors.textDestructive,
  },
}));
