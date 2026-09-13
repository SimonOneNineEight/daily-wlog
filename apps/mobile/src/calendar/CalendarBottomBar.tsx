import { Plus } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStrings } from '../i18n/AppLanguageProvider';
import { Pressable } from '../theme/press';
import { createStyles, theme } from '../theme';

type Props = {
  /**
   * Returns the surface to now (#40). Optional only because a surface may be
   * rendered without the navigation callback it needs (the day view's
   * onChangeDate); a dead 今天 is worse than none.
   */
  onToday?: () => void;
  /** This surface's status line, centred on the bar; omitted where none exists. */
  status?: string;
  /**
   * Creates into this surface's unambiguous target. Omitted on the year view,
   * which has no selected day, so a + there could only mean "today" (#50).
   */
  onAdd?: () => void;
};

// The calendar bottom bar (#50): 今天 left, the surface's status centred, +
// right. 今天 left the nav bar because it is a destination rather than a tool,
// and a nav bar's tool group wants one voice — a lone word beside two glyphs
// reads unresolved. The + moved in from its floating circle, amending Simon's
// 2026-08-19 ruling: the black filled + survives, but a circle left floating
// above a bar leaves dead space beneath it and stops the status centring on
// the true middle.
//
// The bar is a flex sibling, not an overlay, so content ends above it and
// nothing is ever occluded — the year view's count used to sit where two
// floating controls would have covered it.
export function CalendarBottomBar({ onToday, status, onAdd }: Props) {
  const strings = useStrings();
  return (
    // The bar owns the bottom inset rather than the screen's SafeAreaView, so
    // its material runs to the screen edge instead of stopping above the home
    // indicator and leaving a bare strip beneath it.
    <SafeAreaView style={styles.bar} edges={['bottom']}>
      {/* Absolutely spanned first child: the status centres on the bar, not
          on the gap between unequal slots — the same approach the sheets use
          for their titles. It is what lets the year view centre its count
          with only one flanking control. */}
      {status !== undefined ? <Text style={styles.status}>{status}</Text> : null}
      {onToday ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.year.today}
          style={styles.todayButton}
          onPress={onToday}
        >
          <Text style={styles.todayLabel}>{strings.year.today}</Text>
        </Pressable>
      ) : null}
      <View style={styles.spacer} />
      {onAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.day.addEntry}
          feedback="scale"
          hitSlop={4}
          style={styles.addButton}
          onPress={onAdd}
        >
          <Plus size={22} color={theme.colors.controlPrimaryFg} strokeWidth={2} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = createStyles((t) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: t.spacing.tabBarHeight,
    paddingHorizontal: t.spacing.screenGutter,
    backgroundColor: t.colors.materialBar,
    borderTopWidth: t.border.hairline,
    borderTopColor: t.colors.lineSeparator,
  },
  status: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  // Stretched rather than sized: the bar's own height is the touch target.
  todayButton: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingRight: t.spacing.space4,
  },
  todayLabel: {
    ...t.typography.note,
    color: t.colors.controlGhostFg,
  },
  spacer: {
    flex: 1,
  },
  // A bar control rather than the 56pt circle it was; hitSlop carries the
  // smaller target back over 44pt.
  addButton: {
    width: t.spacing.space10,
    height: t.spacing.space10,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.controlPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
