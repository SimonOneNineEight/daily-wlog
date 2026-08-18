const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const i18next = require('eslint-plugin-i18next');
const reactNative = require('eslint-plugin-react-native');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: { 'react-native': reactNative },
    rules: {
      // The token brand (src/theme/createStyles.ts) already makes hardcoded
      // colors a type error inside createStyles; this rule is the backstop
      // for the escape hatches types can't see: inline style props and plain
      // StyleSheet.create.
      'react-native/no-color-literals': 'error',
      // react-native/no-inline-styles stays off on purpose: data-driven token
      // styles (category dot colors) are idiomatic here, and the color
      // discipline is carried by the brand plus no-color-literals.
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: { i18next },
    rules: {
      // String-catalog discipline: user-facing JSX text lives in
      // src/i18n/strings.ts, never inline.
      'i18next/no-literal-string': 'error',
    },
  },
  {
    // Tests assert on the zh-TW catalog literals themselves, so the catalog
    // rule does not apply to them.
    files: ['**/*.test.{ts,tsx}'],
    rules: { 'i18next/no-literal-string': 'off' },
  },
  {
    ignores: ['src/api/types.gen.ts', 'src/theme/theme.gen.ts', '.expo/**'],
  },
]);
