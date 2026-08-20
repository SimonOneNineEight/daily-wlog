import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';
import { ColorDrawer } from './ColorDrawer';

type Props = {
  value: string;
  onChange: (hex: string) => void;
  /** For the drawer: loading and saving the user's custom-color recents. */
  accessToken: string;
  /** For the drawer's live preview: the user's current category colors. */
  existingColors: string[];
};

// The ten preset swatches plus the 自訂顏色 swatch (canvas ColorPresetPicker):
// selection is a ring, never a hue change. The custom swatch opens the color
// drawer (#11) and shows the current custom color once one is chosen.
export function ColorPresetPicker({ value, onChange, accessToken, existingColors }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const presets = Object.values(theme.categories);
  const isPreset = presets.some((preset) => preset.base === value);
  return (
    <View style={styles.grid}>
      {Object.entries(theme.categories).map(([name, preset]) => {
        const selected = value === preset.base;
        return (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={name}
            style={[styles.ring, selected && styles.ringSelected]}
            onPress={() => onChange(preset.base)}
          >
            <View style={[styles.swatch, { backgroundColor: preset.base }]} />
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.colorDrawer.custom}
        style={[styles.ring, !isPreset && styles.ringSelected]}
        onPress={() => setDrawerOpen(true)}
      >
        {isPreset ? (
          // No color chosen here yet: a four-color wheel as the affordance.
          <View style={styles.wheel}>
            <View style={[styles.wheelQuadrant, { backgroundColor: theme.categories.clay.base }]} />
            <View style={[styles.wheelQuadrant, { backgroundColor: theme.categories.ochre.base }]} />
            <View style={[styles.wheelQuadrant, { backgroundColor: theme.categories.blue.base }]} />
            <View style={[styles.wheelQuadrant, { backgroundColor: theme.categories.green.base }]} />
          </View>
        ) : (
          <View style={[styles.swatch, { backgroundColor: value }]} />
        )}
      </Pressable>
      {drawerOpen ? (
        <ColorDrawer
          accessToken={accessToken}
          initialColor={value}
          existingColors={existingColors}
          onCancel={() => setDrawerOpen(false)}
          onConfirm={(hex) => {
            setDrawerOpen(false);
            onChange(hex);
          }}
        />
      ) : null}
    </View>
  );
}

// 34px swatches per the canvas; selection is the canvas's 2px surface gap
// inside a 2px textPrimary ring.
const styles = createStyles((t) => ({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.space5,
  },
  ring: {
    width: 42,
    height: 42,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSelected: {
    borderColor: t.colors.textPrimary,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: t.colors.surface,
  },
  wheel: {
    width: 34,
    height: 34,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: t.colors.surface,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  wheelQuadrant: {
    width: '50%',
    height: '50%',
  },
}));
