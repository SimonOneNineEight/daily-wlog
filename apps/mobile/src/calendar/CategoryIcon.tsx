import * as lucide from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { createStyles, theme } from '../theme';

function pascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/** The lucide component for a kebab-case glyph name; Tag when unknown. */
export function glyphFor(icon: string): LucideIcon {
  return (lucide as unknown as Record<string, LucideIcon>)[pascalCase(icon)] ?? lucide.Tag;
}

type Props = {
  icon: string;
  color: string;
  size?: number;
  /** The hidden treatment (#30): outlined box, glyph in the color itself. */
  hollow?: boolean;
};

/**
 * A category's icon: white glyph on a solid rounded square in the category
 * color — the canvas CategoryIcon's filled treatment (radius-2 box,
 * strokeWidth 1.75, glyph 13/22 of the box at the small size). Hollow is
 * the 類別 sheet's hidden state: the fill drains out, identity stays.
 */
export function CategoryIcon({ icon, color, size = 22, hollow = false }: Props) {
  const Glyph = (lucide as unknown as Record<string, LucideIcon>)[pascalCase(icon)] ?? lucide.Tag;
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size },
        hollow ? [styles.hollow, { borderColor: color }] : { backgroundColor: color },
      ]}
    >
      <Glyph
        size={Math.round((size * 13) / 22)}
        color={hollow ? color : theme.colors.textOnDark}
        strokeWidth={1.75}
      />
    </View>
  );
}

const styles = createStyles((t) => ({
  box: {
    borderRadius: t.radius.r2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // No background: the unset default is transparent, which is the point.
  hollow: {
    borderWidth: 1.5,
  },
}));
