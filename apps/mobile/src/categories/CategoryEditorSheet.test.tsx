import { fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { CategoryEditorSheet } from './CategoryEditorSheet';

function renderEditor() {
  return render(
    <CategoryEditorSheet
      accessToken="tok"
      parentChoices={[]}
      childrenOfTarget={[]}
      onOpen={jest.fn()}
      onClose={jest.fn()}
      onCategoriesChanged={jest.fn()}
    />,
  );
}

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
