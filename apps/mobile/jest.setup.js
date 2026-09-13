// react-native-keyboard-controller is a native module (#42): jest cannot load
// its TurboModule specs, so the library's own mock stands in. It renders
// KeyboardAwareScrollView as a plain ScrollView and KeyboardAvoidingView as a
// View, which is the honest shape — no test in this repo can see the keyboard.
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);
