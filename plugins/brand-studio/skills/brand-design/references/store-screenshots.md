# Store screenshots

Use this when an app needs App Store, Google Play or web-app install screenshots. The screenshots are the product page's first impression, so treat them as a short story told in the brand's voice, captured from the real app.

## Plan the story

1. List the three to five jobs a new user cares about most, in order. Apple shows the first one to three screenshots in search results, so the first screen carries the main promise.
2. For each job, pick the app screen that shows it done: a filled inbox, a finished reply, a completed booking. Never a splash, login or empty screen. Apple rejects screenshots that show only title art or a login page.
3. Write one caption per screen, 60 characters or fewer, stating the benefit in the brand's voice. Run it through [copy.md](copy.md).
4. Include a dark-mode screen when the app supports it.
5. Seed the app with realistic, fictional or approved data. No real customer data.

Captions must not use rankings, prices or calls to action ("#1", "Best", "Free", "10% off", "Download now"). Google Play rejects them and asks for text over no more than 20% of the image. Apple bans prices and claims that belong elsewhere in the listing. Localise captions per store language.

## Sizes

Checked 2026-09-25 against [Apple's screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), [Google Play's preview assets](https://support.google.com/googleplay/android-developer/answer/9866151) and [web.dev's richer install UI](https://web.dev/articles/web-apps/richer-install-ui). Re-check before a release; the stores change these.

| Store | Size in pixels | Count | Notes |
|---|---|---|---|
| App Store, iPhone 6.9" | 1320x2868 | 1 to 10 | Apple scales it for smaller iPhones |
| App Store, iPad 13" | 2064x2752 | 1 to 10 | Required when the app runs on iPad |
| Mac App Store | 2880x1800 | 1 to 10 | 16:10 |
| Google Play, phone | 1080x1920 | 2 to 8 | 4 or more at 1080px to be eligible for promotion |
| Google Play, tablet | 1920x1080 | 4 to 8 | 16:9 or 9:16 |
| Web app install, narrow and wide | 1080x1920 and 1920x1080 | up to 8 | Long side at most 2.3 times the short side; one aspect ratio per form factor |

Both stores reject images with an alpha channel. Save JPEG, or PNG with no transparency. Google Play also wants a 512x512 icon and a 1024x500 feature graphic; make these from the contract's logo and signature device, not from a screenshot.

Do not add device frames. Google Play forbids them, and Apple's bezels are licensed only to Developer Program members, who may use them as is: no tilting, reflections or 3D renders.

## Capture

For a web app, a web export of a cross-platform app, or a product demo page, write the plan as JSON and run:

```sh
node <this-skill>/scripts/store-shots.mjs <app url> --brand brand/brand.json --plan brand/store-shots.json --stores apple,play,pwa --out store-shots
```

```json
[
  { "path": "/inbox", "caption": "Every customer question in one calm inbox" },
  { "path": "/ticket/2291", "caption": "Replies drafted from your own help docs", "click": ["text=Draft reply"] },
  { "path": "/inbox", "caption": "Easy on the eyes after dark", "scheme": "dark" }
]
```

The script captures each screen at the exact store size with reduced motion, so entrance animations have finished, and saves a raw and a captioned copy. The caption band uses the contract's surface, ink, font and radius and is drawn on the app's own page, so the brand's web fonts load. It checks screen counts, caption wording and sideways scroll, writes `shots.json`, and writes `manifest-screenshots.json` for the web app manifest's `screenshots` field.

For a native build, a web page is only a layout proxy: it cannot show native tab bars, sheets, system text size or safe areas. Capture from the iOS Simulator (`xcrun simctl io booted screenshot`, with `xcrun simctl status_bar booted override --time 9:41`) or an Android emulator (`adb exec-out screencap -p`, with system UI demo mode for a clean status bar), or use fastlane snapshot and screengrab. The simulator needs full Xcode; check with `xcrun simctl list devices`.

## Verify

- Open every image. The app content is complete, legible and not cropped through a control.
- The first screen states the main promise; each later screen adds one benefit.
- Captions pass the copy audit and the store wording rules above.
- Sizes and counts match the table; no image has transparency.
- The data shown is fictional or approved, and the app behaves as shown. Screenshots must not show features the app lacks.
- Record in `brand/verification.md` which stores, sizes and screens were produced and anything left unverified, such as native capture.
