
## Testing notes

- Jest maps `lucide-react-native` to its CommonJS build
  (`moduleNameMapper` in package.json): the package's entry is ESM `.mjs`,
  which jest-expo's babel transform (`\.[jt]sx?$`) never touches, and the
  package's `exports` field blocks subpath resolution — hence the
  `<rootDir>` path. Remove the mapping if jest-expo ever transforms `.mjs`.
