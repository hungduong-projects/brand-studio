# Deskhand mobile

An Expo app (SDK 57) for Deskhand, the fictional AI support inbox from the Brand Studio showcase. It applies the website's brand contract to one mobile job: approve a drafted reply whose claims cite their sources.

Inbox, then a ticket, then the draft reply with highlighted citations. Tap a citation to open its source in a sheet. Approve and send, or retry after a failed send. Chargebacks go to a person, and the inbox ends empty. Sent and Settings are the other two tabs.

Tickets, orders and prices are made up.

## Run

The app keeps its own dependencies, outside the repository's npm workspaces.

```sh
cd examples/deskhand/mobile
npm ci
npm start        # Expo dev server: press i for iOS, a for Android
```

`npm run sync-brand` copies `apps/showcase/src/deskhand.brand.json` to `src/brand/brand.json`. The start and export scripts run it first.

## Verify

Run `npm ci` and `npx playwright-core install chromium` in the repository root first.

```sh
npm run export:web
npm run verify       # walks the flow at 390x844, writes verify-shots/contact-sheet.png
npm run store-shots  # App Store and Google Play sizes into store-shots/raw/
```

The web export stands in for a phone layout. It does not run native headers, sheets, gestures, Dynamic Type or screen readers. Check those on a simulator or device.

## Platform differences

| | iOS | Android |
|---|---|---|
| Minimum touch target | 44pt | 48dp |
| Screen title size | 34 | 28 |
| Stack title | Centred, back chevron with the previous tab's name | Left-aligned, back arrow only, predictive back on |
| Tab bar | Labels under icons | 80dp bar, pill behind the selected icon |
| Buttons | Contract radius, 12 | Full pill |
| Source sheet | Native grabber, "Done" | Drawn drag handle, "Close" |
| Section labels | Uppercase | Sentence case |
| Text size setting named in Settings | Display & Text Size | Font size |

The web export follows iOS rules. Add `?os=android` to the URL for Android rules, and `?insets` to reserve a phone's status bar and home-indicator areas.

## Assets

Icons are drawn in code from the Deskhand logo on the website. Geist and Geist Mono come from `@expo-google-fonts` under the SIL Open Font License.
