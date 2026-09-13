import { fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { theme } from '../theme';

import { CategoryEditorSheet } from './CategoryEditorSheet';

const sport = { id: 'c-sport', name: '運動', color: '#73B062', icon: 'dumbbell', position: 1 };

function renderEditor(parentChoices: (typeof sport)[] = []) {
  return render(
    <CategoryEditorSheet
      accessToken="tok"
      parentChoices={parentChoices}
      childrenOfTarget={[]}
      onOpen={jest.fn()}
      onClose={jest.fn()}
      onCategoriesChanged={jest.fn()}
    />,
  );
}

describe('parent list accordion', () => {
  it('swaps the summary row for the option list while open', () => {
    renderEditor([sport]);

    // Closed: the summary row with its hint.
    expect(screen.getByText('獨立類別')).toBeTruthy();
    fireEvent.press(screen.getByText('無'));

    // Open: the options replace the summary — nothing shows twice.
    expect(screen.queryByText('獨立類別')).toBeNull();
    fireEvent.press(screen.getByText('運動'));

    // Picked and collapsed: the summary carries the choice, hint flips.
    expect(screen.getByText('運動')).toBeTruthy();
    expect(screen.getByText('子類別')).toBeTruthy();
    expect(screen.queryByText('無')).toBeNull();
  });
});

describe('keyboard dismissal (#31)', () => {
  it('dismisses on name-field submit', () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    renderEditor();

    fireEvent(screen.getByPlaceholderText('名稱'), 'submitEditing');
    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
  });

  it('dismisses on a tap outside the field', () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    renderEditor();

    fireEvent.press(screen.getByTestId('editor-body'));
    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
  });
});

describe('the chosen icon (#46)', () => {
  it('fills the selected cell with the chosen Category color', () => {
    renderEditor();

    fireEvent.press(screen.getByLabelText('blue'));
    fireEvent.press(screen.getByLabelText('bike'));

    expect(screen.getByLabelText('bike')).toHaveStyle({ backgroundColor: '#4A93C4' });
    expect(screen.getByLabelText('dumbbell')).toHaveStyle({
      backgroundColor: theme.colors.surfaceFill,
    });
  });

  it('restyles the selected cell when the color changes, with no re-selection', () => {
    renderEditor();

    fireEvent.press(screen.getByLabelText('bike'));
    fireEvent.press(screen.getByLabelText('violet'));

    expect(screen.getByLabelText('bike')).toHaveStyle({ backgroundColor: '#A26FBD' });
  });

  it("fills the inherited icon in the parent's color while the block is disabled", () => {
    renderEditor([sport]);

    fireEvent.press(screen.getByText('無'));
    fireEvent.press(screen.getByText('運動'));

    // A Subcategory inherits 運動's dumbbell and its green, and the dimmed
    // appearance block still has to say which glyph that is.
    expect(screen.getByText('子類別沿用上層分類的圖示與顏色。')).toBeTruthy();
    expect(screen.getByLabelText('dumbbell')).toHaveStyle({ backgroundColor: '#73B062' });
  });
});
