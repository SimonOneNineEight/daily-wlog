# Keyboard avoidance is one library, installed once

Every form in the app ignored the keyboard. Eight `TextInput`s across four components — the entry form, the category editor, the color drawer, the email sign-in page — two of the eight inside `Modal` bottom sheets, and no `KeyboardAvoidingView`, no `automaticallyAdjustKeyboardInsets`, nothing. (#42 says five surfaces and three modal inputs, counting the entry form's picker and detail steps separately; the file count is four and two.) PM feedback round 2 reported it as a color-drawer bug, the hex field and most of the picker sitting under the keyboard, but the drawer is only where it was noticed. Ratified 2026-09-12: **`react-native-keyboard-controller`** — `KeyboardProvider` at the app root, `KeyboardAwareScrollView` for the two forms, its `KeyboardAvoidingView` for the two sheets.

Core React Native alone was rejected:

1. `automaticallyAdjustKeyboardInsets` is iOS-only, so Android would still need something else and the two platforms would drift.
2. `KeyboardAvoidingView` inside a `Modal` is unreliable, and half the components here are modal bottom sheets. That is the case we most need to work, not the one we can afford to hand-wave.
3. Without a shared provider, each surface tunes its own offsets. That is four sets of magic numbers and four things to re-tune when a header height changes.

The cost is real and worth naming. This is a native dependency: it needs a rebuild, so a JS-only OTA cannot ship it. It does not cost us Expo Go, which reanimated 4 already ruled out, but it does mean anyone on a stale binary sees every keyboard case fail for a reason that has nothing to do with the code. It also puts a second keyboard system beside the platform's, which is why the provider is mounted once at the root rather than per screen.

The trade also cuts the other way on testing. Jest loads the library's own mock, which renders `KeyboardAwareScrollView` as a plain `ScrollView` and `KeyboardAvoidingView` as a `View`, so **no test in this repo can see keyboard behaviour**. The suite proves the surfaces still render and that the fields are sized for CJK; it proves nothing about whether anything rises. That verification is a device build, under #49.

Revisit when: React Native's core keyboard handling becomes cross-platform and modal-safe, or the app drops to a single non-modal form.
