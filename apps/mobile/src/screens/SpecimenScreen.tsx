import { Plus } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

// Visual verification surface for the design tokens (issue #3): every
// semantic color, the 10-category palette with tint/ink companions, each type
// role on zh-TW text, and the dot / year-box geometry. Reached in dev with
// EXPO_PUBLIC_SCREEN=specimen; token names render from the theme object
// itself, so this screen can never drift from the generated theme.
export function SpecimenScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{strings.specimen.title}</Text>

      <Text style={styles.sectionHeader}>{strings.specimen.typeRoles}</Text>
      {Object.entries(theme.typography).map(([role, style]) => (
        <View key={role} style={styles.row}>
          <Text style={styles.tokenName}>{role}</Text>
          <Text style={[style, styles.sampleText]} numberOfLines={1}>
            {strings.specimen.typeSample}
          </Text>
        </View>
      ))}

      <Text style={styles.sectionHeader}>{strings.specimen.categoryPalette}</Text>
      {Object.entries(theme.categories).map(([name, colors]) => (
        <View key={name} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: colors.base }]} />
          <View style={[styles.tintChip, { backgroundColor: colors.tint }]}>
            <Text style={[styles.chipLabel, { color: colors.ink }]}>{name}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.sectionHeader}>{strings.specimen.dotGeometry}</Text>
      <View style={styles.row}>
        <View style={styles.dotRow}>
          {Object.values(theme.categories)
            .slice(0, theme.dot.maxPerDay)
            .map((colors, index) => (
              <View key={index} style={[styles.dot, { backgroundColor: colors.base }]} />
            ))}
        </View>
        <Plus
          size={theme.dot.size + theme.spacing.space1}
          color={theme.colors.textTertiary}
          strokeWidth={2.5}
        />
        <View style={styles.yearBox}>
          <Text style={styles.yearNumeral}>{strings.specimen.yearBoxNumeral}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>{strings.specimen.semanticColors}</Text>
      {Object.entries(theme.colors).map(([name, color]) => (
        <View key={name} style={styles.row}>
          <View style={[styles.swatch, { backgroundColor: color }]} />
          <Text style={styles.tokenName}>{name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  content: {
    padding: t.spacing.screenGutter,
    gap: t.spacing.space3,
  },
  title: {
    ...t.typography.navTitle,
    color: t.colors.textPrimary,
  },
  sectionHeader: {
    ...t.typography.sectionHeader,
    color: t.colors.textSecondary,
    marginTop: t.spacing.space7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space5,
  },
  tokenName: {
    ...t.typography.meta,
    color: t.colors.textSecondary,
  },
  sampleText: {
    color: t.colors.textPrimary,
    flexShrink: 1,
  },
  swatch: {
    width: t.spacing.space8,
    height: t.spacing.space6,
    borderRadius: t.radius.r1,
    borderWidth: t.border.hairline,
    borderColor: t.colors.lineSeparator,
  },
  dot: {
    width: t.dot.size,
    height: t.dot.size,
    borderRadius: t.radius.pill,
  },
  dotRow: {
    flexDirection: 'row',
    gap: t.dot.gap,
  },
  tintChip: {
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.space4,
    paddingVertical: t.spacing.space1,
  },
  chipLabel: {
    ...t.typography.meta,
  },
  yearBox: {
    width: t.yearBox.size,
    height: t.yearBox.size,
    borderRadius: t.yearBox.radius,
    backgroundColor: t.categories.clay.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearNumeral: {
    ...t.typography.yearNumeral,
    color: t.colors.textOnDark,
  },
}));
