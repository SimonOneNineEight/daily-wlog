# Keyboard avoidance is one library, installed once

Every form in the app ignored the keyboard. Eight `TextInput`s across five surfaces, three of them inside `Modal` bottom sheets, and no `KeyboardAvoidingView`, no `automaticallyAdjustKeyboardInsets`, nothing. PM feedback round 2 reported it as a colour-drawer bug (the hex field and most of the picker sit under the keyboard), but the drawer is only where it was noticed. Ratified 2026-09-12: **`react-native-keyboard-controller`** — `KeyboardProvider` at the app root, `KeyboardAwareScrollView` for the two forms, its `KeyboardAvoidingView` for the two sheets.

Core React Native alone was rejected:

1. `automaticallyAdjustKeyboardInsets` is iOS-only, so Android would still need something else and the two platforms would drift.
2. `KeyboardAvoidingView` inside a `Modal` is unreliable, and two of the four surfaces are modal bottom sheets. That is the case we most need to work, not the one we can afford to hand-wave.
3. Without a shared provider, each surface tunes its own offsets. Five surfaces means five sets of magic numbers and five things to re-tune when a header height changes.

The cost is real and worth naming. This is a native dependency: it needs a rebuild, so a JS-only OTA cannot ship it, and Expo Go cannot run it. It also puts a second keyboard system beside the platform's, which is why the provider is mounted once at the root rather than per screen.

The trade also cuts the other way on testing. Jest loads the library's own mock, which renders `KeyboardAwareScrollView` as a plain `ScrollView` and `KeyboardAvoidingView` as a `View`, so **no test in this repo can see keyboard behaviour**. The suite proves the surfaces still render and that the fields are sized for CJK; it proves nothing about whether anything rises. That verification is a device build, under #49.

Revisit when: React Native's core keyboard handling becomes cross-platform and modal-safe, or the app drops to a single non-modal form.
