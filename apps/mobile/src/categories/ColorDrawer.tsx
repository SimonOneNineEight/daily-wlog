import { useEffect, useState } from 'react';
import { Modal, PanResponder, Pressable, Text, View } from 'react-native';

import { listColorRecents, saveColorRecent } from '../api/client';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';
import type { Hsl } from './colorDerivation';
import { hexToHsl, hslToHex } from './colorDerivation';
import { MiniMonthPreview } from './MiniMonthPreview';

type Props = {
  accessToken: string;
  /** The color the drawer opens on. */
  initialColor: string;
  /** The user's current category colors, for the live preview. */
  existingColors: string[];
  onCancel: () => void;
  /** Fired with the committed hex after the recents save settles. */
  onConfirm: (hex: string) => void;
};

const presetBases: string[] = Object.values(theme.categories).map((preset) => preset.base);

const HUE_SEGMENTS = 24;
const RAMP_SEGMENTS = 12;

/**
 * The custom color drawer (#11, ratified design): fully free hue, saturation
 * and lightness — brighter and darker than the presets is allowed; the live
 * mini-month preview is the guardrail, not a clamp. The 10 presets appear as
 * a reference row, and the user's saved custom colors as a recents row.
 * Committing a non-preset color saves it server-side (LRU, best-effort).
 */
export function ColorDrawer({
  accessToken,
  initialColor,
  existingColors,
  onCancel,
  onConfirm,
}: Props) {
  // HSL floats are the working truth; hexToHsl/hslToHex round-trip exactly
  // (colorDerivation.test.ts), so tapping a preset lands on its exact hex.
  const [hsl, setHsl] = useState<Hsl>(() => hexToHsl(initialColor));
  const [recents, setRecents] = useState<string[]>([]);
  const color = hslToHex(hsl);

  useEffect(() => {
    let active = true;
    listColorRecents(accessToken)
      .then((list) => {
        if (active) setRecents(list.colors);
      })
      .catch(() => undefined); // The row just stays empty offline.
    return () => {
      active = false;
    };
  }, [accessToken]);

  const applyHex = (hex: string) => setHsl(hexToHsl(hex));

  const commit = async () => {
    // Presets are always on their reference row; only custom picks earn a
    // recents slot. The save is best-effort: the chosen color still commits.
    if (!presetBases.includes(color)) {
      await saveColorRecent(accessToken, color).catch(() => undefined);
    }
    onConfirm(color);
  };

  const hueRamp = Array.from({ length: HUE_SEGMENTS }, (_, i) =>
    hslToHex({ h: ((i + 0.5) * 360) / HUE_SEGMENTS, s: hsl.s, l: hsl.l }),
  );
  const saturationRamp = Array.from({ length: RAMP_SEGMENTS }, (_, i) =>
    hslToHex({ h: hsl.h, s: i / (RAMP_SEGMENTS - 1), l: hsl.l }),
  );
  const lightnessRamp = Array.from({ length: RAMP_SEGMENTS }, (_, i) =>
    hslToHex({ h: hsl.h, s: hsl.s, l: i / (RAMP_SEGMENTS - 1) }),
  );

  const swatchRow = (rowColors: string[]) => (
    <View style={styles.swatchRow}>
      {rowColors.map((swatch) => (
        <Pressable
          key={swatch}
          accessibilityRole="button"
          accessibilityLabel={swatch}
          style={[styles.swatchRing, swatch === color && styles.swatchRingSelected]}
          onPress={() => applyHex(swatch)}
        >
          <View style={[styles.swatch, { backgroundColor: swatch }]} />
        </Pressable>
      ))}
    </View>
  );

  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.entryForm.cancel}
          style={styles.scrim}
          onPress={onCancel}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={onCancel}>
              <Text style={styles.headerAction}>{strings.entryForm.cancel}</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{strings.colorDrawer.custom}</Text>
            <Pressable accessibilityRole="button" onPress={() => void commit()}>
              <Text style={styles.headerConfirm}>{strings.categories.done}</Text>
            </Pressable>
          </View>

          <MiniMonthPreview color={color} existingColors={existingColors} />

          <SliderTrack
            label={strings.colorDrawer.hue}
            value={hsl.h}
            max={360}
            step={15}
            colors={hueRamp}
            onChange={(h) => setHsl({ ...hsl, h: h % 360 })}
          />
          <SliderTrack
            label={strings.colorDrawer.saturation}
            value={hsl.s * 100}
            max={100}
            step={5}
            colors={saturationRamp}
            onChange={(s) => setHsl({ ...hsl, s: s / 100 })}
          />
          <SliderTrack
            label={strings.colorDrawer.lightness}
            value={hsl.l * 100}
            max={100}
            step={5}
            colors={lightnessRamp}
            onChange={(l) => setHsl({ ...hsl, l: l / 100 })}
          />

          <Text style={styles.sectionHeader}>{strings.colorDrawer.presets}</Text>
          {swatchRow(presetBases)}

          {recents.length > 0 ? (
            <>
              <Text style={styles.sectionHeader}>{strings.colorDrawer.recents}</Text>
              {swatchRow(recents)}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type SliderProps = {
  label: string;
  /** Current value, 0..max (floats fine; a11y reports it rounded). */
  value: number;
  max: number;
  /** Increment/decrement step for accessibility actions. */
  step: number;
  /** Segment colors approximating the ramp, left to right. */
  colors: string[];
  onChange: (value: number) => void;
};

// A pure-RN slider: the ramp is segment Views (no gradient dependency), the
// thumb follows PanResponder drags, and increment/decrement accessibility
// actions make it usable with VoiceOver (and drivable from tests).
function SliderTrack({ label, value, max, step, colors, onChange }: SliderProps) {
  const [width, setWidth] = useState(0);

  const setFromX = (x: number) => {
    if (width <= 0) return;
    const fraction = Math.min(1, Math.max(0, x / width));
    onChange(Math.round(fraction * max));
  };
  // Recreated per render on purpose: the handlers only read the event's
  // locationX, never gesture state, so a mid-drag re-render is harmless.
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => setFromX(event.nativeEvent.locationX),
    onPanResponderMove: (event) => setFromX(event.nativeEvent.locationX),
  });

  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max, now: Math.round(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            onChange(Math.min(max, value + step));
          } else if (event.nativeEvent.actionName === 'decrement') {
            onChange(Math.max(0, value - step));
          }
        }}
        style={styles.track}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        {...responder.panHandlers}
      >
        <View style={styles.segments} pointerEvents="none">
          {colors.map((segment, index) => (
            <View key={index} style={[styles.segment, { backgroundColor: segment }]} />
          ))}
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: `${(Math.min(value, max) / max) * 100}%` }]}
        />
      </View>
    </View>
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
    paddingHorizontal: t.spacing.screenGutter,
    paddingTop: t.spacing.space5,
    paddingBottom: t.spacing.space10,
    gap: t.spacing.space6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
  },
  headerAction: {
    ...t.typography.entryTitle,
    color: t.colors.controlGhostFg,
  },
  headerConfirm: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
  },
  sliderRow: {
    gap: t.spacing.space2,
  },
  sliderLabel: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
  },
  track: {
    height: 28,
    borderRadius: t.radius.r3,
    justifyContent: 'center',
  },
  segments: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderRadius: t.radius.r3,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: t.colors.surface,
    shadowColor: t.colors.textPrimary,
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionHeader: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.space3,
  },
  swatchRing: {
    width: 36,
    height: 36,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRingSelected: {
    borderColor: t.colors.textPrimary,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: t.colors.surface,
  },
}));
