import { Pressable, View } from 'react-native';

import type { TokenColor } from '../theme';
import { createStyles, theme } from '../theme';

type Props = {
  value: string;
  onChange: (hex: TokenColor) => void;
};

// The ten preset swatches (canvas ColorPresetPicker): selection is a ring,
// never a hue change. The custom-color swatch (自訂顏色) arrives with the
// color drawer (#11); until then only presets render.
export function ColorPresetPicker({ value, onChange }: Props) {
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
}));
