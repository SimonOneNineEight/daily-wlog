import { createStyles } from './createStyles';
import { theme } from './theme.gen';

// The compile-time half of these assertions lives in the @ts-expect-error
// annotations: if the token branding ever loosens so that a plain string
// satisfies a color property, the annotations become unused and typecheck
// fails. Runtime just confirms the styles pass through.
describe('createStyles', () => {
  it('accepts theme tokens for color properties', () => {
    const styles = createStyles((t) => ({
      card: {
        backgroundColor: t.colors.surface,
        borderColor: t.colors.lineSeparator,
        borderRadius: t.radius.card,
        padding: t.spacing.cardPadding,
      },
      title: {
        ...t.typography.entryTitle,
        color: t.colors.textPrimary,
      },
      dot: {
        backgroundColor: t.categories.clay.base,
        width: t.dot.size,
        height: t.dot.size,
      },
    }));
    expect(styles.card.backgroundColor).toBe(theme.colors.surface);
    expect(styles.title.fontSize).toBe(17);
    expect(styles.dot.width).toBe(7);
  });

  it('rejects hardcoded colors at compile time', () => {
    createStyles(() => ({
      // @ts-expect-error a hex literal is not a design token
      box: { backgroundColor: '#FFFFFF' },
    }));
    createStyles(() => ({
      // @ts-expect-error a named color is not a design token
      label: { color: 'red' },
    }));
    createStyles(() => ({
      // @ts-expect-error rgba strings are not design tokens either
      overlay: { borderColor: 'rgba(0,0,0,0.3)' },
    }));
    expect(true).toBe(true);
  });
});
