import { render } from '@testing-library/react-native';

import { SpecimenScreen } from './SpecimenScreen';

// The specimen is presentational (exempt from behavior tests per the spec's
// testing decisions); this smoke render only guards against the screen
// crashing on mount, which would defeat its visual-verification purpose.
it('renders the specimen sections', () => {
  const { getByText } = render(<SpecimenScreen />);
  expect(getByText('設計樣本')).toBeTruthy();
  expect(getByText('clay')).toBeTruthy();
  expect(getByText('textPrimary')).toBeTruthy();
});
