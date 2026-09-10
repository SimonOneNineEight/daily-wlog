import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Text, View } from 'react-native';

import { useStrings } from '../i18n/AppLanguageProvider';
import { Pressable } from '../theme/press';
import { createStyles, theme } from '../theme';

import { MonthGrid } from './MonthGrid';
import { localDateString, monthKey, shiftMonth } from './monthMath';

type Props = {
  /** The date the sheet opens on and marks selected, YYYY-MM-DD. */
  value: string;
  /** Injectable for tests; defaults to the device's now. */
  today?: Date;
  onPick: (date: string) => void;
  onClose: () => void;
};

// The compact date picker behind the entry form's date row (#24). No canvas
// artboard exists for it, so the quietest surface consistent with the
// system: the month grid the calendar already speaks, in a plain bottom
// sheet with month steppers. Tapping a day picks it and closes.
export function DatePickerSheet({ value, today = new Date(), onPick, onClose }: Props) {
  const strings = useStrings();
  const [valueYear, valueMonth, valueDay] = value.split('-').map(Number);
  const [view, setView] = useState({ year: valueYear, month: valueMonth });
  const [todayYear, todayMonth, todayDay] = localDateString(today).split('-').map(Number);

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.entryForm.cancel}
          feedback="none"
          style={styles.scrim}
          onPress={onClose}
        />
        <View style={styles.sheet} testID="date-picker-sheet">
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.datePicker.prevMonth}
              style={styles.stepButton}
              onPress={() => setView(shiftMonth(view.year, view.month, -1))}
            >
              <ChevronLeft size={20} color={theme.colors.iconDefault} strokeWidth={2} />
            </Pressable>
            <Text style={styles.headerTitle}>{strings.datePicker.title(view.year, view.month)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.datePicker.nextMonth}
              style={styles.stepButton}
              onPress={() => setView(shiftMonth(view.year, view.month, 1))}
            >
              <ChevronRight size={20} color={theme.colors.iconDefault} strokeWidth={2} />
            </Pressable>
          </View>
          <View style={styles.gridHolder}>
            <MonthGrid
              year={view.year}
              month={view.month}
              days={{}}
              today={
                view.year === todayYear && view.month === todayMonth ? todayDay : undefined
              }
              selected={
                view.year === valueYear && view.month === valueMonth ? valueDay : undefined
              }
              onSelectDay={(day) =>
                onPick(`${monthKey(view.year, view.month)}-${String(day).padStart(2, '0')}`)
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = createStyles((t) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.scrim,
  },
  sheet: {
    backgroundColor: t.colors.background,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space4,
    padding: t.spacing.space4,
    backgroundColor: t.colors.materialBar,
    borderBottomWidth: t.border.hairline,
    borderBottomColor: t.colors.lineSeparator,
  },
  stepButton: {
    width: t.spacing.hitMin,
    height: t.spacing.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  gridHolder: {
    paddingHorizontal: t.spacing.screenGutter,
    // Home-indicator clearance, same off-token value as the other sheets.
    paddingBottom: 28,
  },
}));
