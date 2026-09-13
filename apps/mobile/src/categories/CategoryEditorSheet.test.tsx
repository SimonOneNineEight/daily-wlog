import { fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { expectSingleLineField } from '../testing/expectSingleLineField';

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

describe('single-line fields (#42)', () => {
  it('sizes the name field for CJK, at the hit target', () => {
    renderEditor();

    expectSingleLineField('名稱');
  });
});
