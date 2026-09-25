# Mobile apps

Use this when a brand that already has a contract needs an iOS and Android app. The app keeps the brand's decisions and drops the website's composition: no hero, no scroll story, no marketing sections in an app shell. Start from one job a user opens the app to finish, and build that flow end to end.

The worked example is `examples/deskhand/mobile/`, an Expo app for the fictional Deskhand support inbox. It reads the same `deskhand.brand.json` as the website.

## Choose the job and the flow

1. Name the one job, such as "approve a drafted reply" or "book a table". Write the screens it needs in order, including the success state.
2. Add the states the job meets in real use: empty, loading or sending, error with a way out, and anything the brand's limits create (Deskhand: refunds over the limit wait for a person; chargebacks get no draft).
3. Pick navigation by platform convention: a tab bar with labels for three to five top-level areas, a stack for drill-down, a sheet for a short side task that returns to where the user was.
4. Keep one data scenario across screens, as the website does (Deskhand: ticket #2291, the $84 refund, sources numbered 1 to 3).

## Map the contract to a theme

Keep the contract as the single source. Copy it into the app with a small sync script rather than importing across the repo, so the app builds on its own, and fail verification when the copy drifts.

| Contract | React Native |
|---|---|
| `tokens.light` / `tokens.dark` | One theme object per scheme; pick with `useColorScheme()`; set `userInterfaceStyle: "automatic"` in `app.json` |
| `surface`, `elevated`, `ink`, `muted`, `line` | Screen background, grouped rows and sheets, text, secondary text, hairlines. Derive pressed and soft-line colours by mixing tokens, not new hex values |
| `accent`, `onAccent` | Only where the contract allows it. Deskhand: citations, their source lines and the primary button, never tab tints or badges |
| `font` | Load the family's static weights with `expo-font` (`@expo-google-fonts/*`). Native fonts need one family name per weight; `fontWeight` alone does not pick a file |
| Type roles | A size table per platform: iOS Dynamic Type styles (34 large title, 17 body, 13 footnote), Material 3 roles (28 headline, 16 body, 14 label). Same families, same hierarchy |
| `radius` | Cards, grouped lists and iOS buttons. Android buttons use Material's full pill |
| `motion.reducedMotion` | `AccessibilityInfo.isReduceMotionEnabled()` plus the `reduceMotionChanged` listener; stack animation `none`; signature motion shows its end state |
| Signature devices | Rebuild them for touch. Deskhand's highlighter marks each cited claim; tapping it opens the source in a sheet where the cited line is highlighted |

Status colours such as errors are app roles, defined by meaning and checked for contrast in both schemes. Do not reuse the accent for them.

## Follow each platform

| | iOS | Android |
|---|---|---|
| Touch target | 44pt minimum | 48dp minimum |
| Screen title | Large title, left-aligned, in the scroll view | Headline in the top area; stack titles left-aligned |
| Back | Chevron with the previous screen's name; edge swipe | Arrow only; system back and predictive back (`predictiveBackGestureEnabled: true`) |
| Tab bar | Labels under icons, no selection pill | Navigation bar 80dp with a pill behind the selected icon |
| Sheets | `presentation: 'formSheet'`, `sheetAllowedDetents`, native grabber, "Done" at the trailing edge | Bottom sheet with a drawn drag handle, closed by back or "Close" |
| Grouped settings | Uppercase section labels, inset rounded groups | Sentence-case section labels |
| Text size | Dynamic Type through `allowFontScaling` (on by default) | Font size and display size through the same prop |

Let text wrap: use `minHeight`, never fixed heights on rows or buttons, and avoid `numberOfLines` on content. Keep tab bar labels fixed (`tabBarAllowFontScaling: false`), as system tab bars do. Use `maxFontSizeMultiplier` only on small badges. Put content inside safe areas with `react-native-safe-area-context`; a bottom action bar pads by the bottom inset.

Accessibility: give every row one sentence as its `accessibilityLabel` ("Ticket 2291, Lamp arrived cracked, from Priya N., Refund $84, over your $50 limit"), mark headings with `accessibilityRole="header"`, use `role="switch"` with `aria-checked` for toggles, `accessibilityRole="alert"` for errors and `AccessibilityInfo.announceForAccessibility` for results. Inline links inside a sentence may be smaller than the target size only when the same destination is also a full-size control.

Record each platform difference in the app's README or `brand/verification.md`.

## Verify

Run what you can prove on this machine, then say what you could not.

1. Typecheck the app (`npx tsc --noEmit`) and export the web build (`npx expo export --platform web`; set `EXPO_UNSTABLE_WEB_MODAL=1` so form sheets render as sheets).
2. Walk the whole flow with Playwright at 390x844 with `isMobile` and `hasTouch`: every step of the job, error and retry, empty state, back from a pushed screen and from a sheet.
3. On every screen check: targets at least 44px (48px with Android rules), an accessible name on every control, reading order of the main screen, no sideways scroll, text contrast against what is painted behind it, and no clipped text.
4. Repeat in dark mode with reduced motion, and check nothing is mid-animation.
5. Use a text-size proxy: double every computed font size and line height and check that critical text and the primary action stay on screen.
6. Open every screenshot. Look for crowding, clipped labels, accent used outside its roles and anything that reads as a website in a frame.

The Deskhand example's `verify.mjs` does all of this and writes a contact sheet. Its web build takes `?os=android` to preview Android rules and `?insets` to reserve a phone's status bar and home-indicator areas.

### What the web proxy cannot prove

A browser runs React Native Web, not UIKit or Android views. It cannot show native headers, the sheet's grabber and detents, the edge-swipe and predictive back gestures, real Dynamic Type or Android font scaling, real safe-area insets, VoiceOver or TalkBack focus order and announcements, or haptics. Report these as unverified until checked on a simulator or device.

### Native checks and screenshots

- iOS needs full Xcode (`xcrun simctl list devices`). Run `npx expo run:ios`, then capture with `xcrun simctl io booted screenshot shot.png` after `xcrun simctl status_bar booted override --time 9:41`. Test text size with `xcrun simctl ui booted content_size accessibility-extra-large`, appearance with `xcrun simctl ui booted appearance dark`, and VoiceOver on a device or with Accessibility Inspector.
- Android needs the SDK and an emulator. Run `npx expo run:android`, capture with `adb exec-out screencap -p > shot.png` after enabling System UI demo mode, set text size with `adb shell settings put system font_scale 2.0`, and test TalkBack on the emulator.
- Without local tools, `eas build --profile development` builds in the cloud; install on a device to test.
- For store listings, follow [store-screenshots.md](store-screenshots.md). Native captures replace the web proxy's images when available.
