import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';

import { useStrings } from '../i18n/AppLanguageProvider';
import { Pressable } from '../theme/press';
import { createStyles, theme } from '../theme';

/**
 * Bottom padding a scrolling surface needs so its last row clears the floats
 * instead of sitting under them. The controls hover over content, so the
 * content has to make room rather than the chrome taking it permanently.
 */
export const FLOAT_CLEARANCE = theme.spacing.fabSize + theme.spacing.fabInset * 2;

// --duration-fast (design/tokens/motion.css); the generator does not emit
// motion tokens, so the value is carried here.
const FADE_MS = 150;

type Props = {
  /**
   * Returns the surface to now (#40). Optional only because a surface may be
   * rendered without the navigation callback it needs (the day view's
   * onChangeDate); a dead 今天 is worse than none.
   */
  onToday?: () => void;
  /**
   * Creates into this surface's unambiguous target. Omitted on the year view,
   * which has no selected day, so a + there could only mean "today" (#50).
   */
  onAdd?: () => void;
  /** False while the surface is scrolling; the controls fade out (#50). */
  visible?: boolean;
};

// The calendar's floating actions (#50): 今天 bottom-left, + bottom-right,
// hovering over content rather than sitting in a bar. 今天 left the nav bar
// because it is a destination rather than a tool, and a lone word beside two
// glyphs read unresolved.
//
// This began as a solid bottom bar, which was the wrong instinct (Simon,
// 2026-09-12): DESIGN.md's ban 7 says depth comes from shadow and layering,
// which is a floating capsule, not a bordered fill. The bar had also taken
// the + out of the floating circle Simon ratified on 2026-08-19; it is back.
//
// Floating means content can pass underneath, so every scrolling surface pads
// its content by FLOAT_CLEARANCE, and the controls fade while you scroll.
export function CalendarFloatingActions({ onToday, onAdd, visible = true }: Props) {
  const strings = useStrings();
  // useState's initialiser, not a ref: the value is read during render for
  // the style, and reading a ref there is what the compiler rule forbids.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    // box-none so taps in the gap between the two controls reach the content
    // beneath; none while hidden, so a faded control is not a tap target.
    <Animated.View
      style={[styles.layer, { opacity }]}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      {onToday ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.year.today}
          style={styles.todayPill}
          onPress={onToday}
        >
          <Text style={styles.todayLabel}>{strings.year.today}</Text>
        </Pressable>
      ) : (
        <View />
      )}
      {onAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.day.addEntry}
          feedback="scale"
          style={styles.add}
          onPress={onAdd}
        >
          <Plus size={24} color={theme.colors.controlPrimaryFg} strokeWidth={2} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

// --shadow-fab (design/tokens/elevation.css) is two layers, which RN cannot
// express; these approximate its weight in one. The generator emits no shadow
// tokens, so the values are carried here. shadowColor is left unset on
// purpose: RN already defaults it to black, and createStyles admits only
// design tokens for colour properties.
const float = {
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 6,
} as const;

const styles = createStyles((t) => ({
  layer: {
    position: 'absolute',
    left: t.spacing.fabInset,
    right: t.spacing.fabInset,
    bottom: t.spacing.fabInset,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // fabSize, not hitMin: the two controls share a height so their tops and
  // bottoms line up. The circle's 56 is ratified, so the pill meets it.
  todayPill: {
    height: t.spacing.fabSize,
    paddingHorizontal: t.spacing.space6,
    borderRadius: t.radius.pill,
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
    ...float,
  },
  todayLabel: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
  },
  add: {
    width: t.spacing.fabSize,
    height: t.spacing.fabSize,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.controlPrimaryBg,
    ...float,
  },
}));
