# Android Capacitor reliability — 19 November 2026

Android continues to load `https://themakeupstorewangkhei.com`. This release hardens the existing remote storefront rather than converting the server-rendered Next.js app into a static bundle. Pricing, inventory, order commits, payment verification, notification sending and database rules are unchanged. No new migration is introduced.

## Android packaging

- Core, CLI and Android use Capacitor 8.5.1. The existing app ID and signing key are retained. Android version is 1.2.1, code 8; confirm the code exceeds the latest Play Console release before uploading.
- Android source is no longer excluded from Git. Build/cache folders, copied assets, local SDK paths, private signing configuration and `google-services.json` remain ignored.
- `native/android` contains a minimal local startup/recovery page and stylesheet. No Next.js server artifacts are copied into Android.
- `npm run cap:sync` and `npm run cap:build` sync Android only. `npm run cap:debug` builds the debug APK, `npm run cap:release` builds the signed release AAB, and `npm run cap:test` runs Android unit tests. These commands do not build or delete `.next` output and never sync iOS.
- Direct Capacitor commands must name their platform, for example `npx cap sync android`. A bare sync/copy/update/run/build is rejected to avoid copying Android settings into iOS. iOS retains its earlier configuration and can be addressed explicitly in its later work.
- The build helper uses an existing `JAVA_HOME`; on this Mac it can discover the installed Homebrew JDK 21. Other machines must install JDK 21 and configure the Android SDK normally.

## Startup and external navigation

The Android WebView still loads the HTTPS storefront. Its local recovery origin is `https://localhost`, separate from store cookies. Cleartext stays disabled. A native animated brand splash covers a cold start and offers Retry after 25 seconds. Successful document parsing and the next drawable WebView frame dismiss it. Main-document network failures and server 5xx responses use a bundled recovery page; ordinary website 4xx pages remain visible. SSL errors are cancelled, never bypassed.

### Animated splash follow-up

The old startup had two visual stages: a fixed 500ms Capacitor splash hold and a separate text/spinner view while loading the live website. The Android override now sets `launchShowDuration: 0`; MainActivity installs Android's splash compat API once, without a separate timer. The existing M artwork from `assets/icon.svg` is transformed into native vector paths with a staggered pink trace, a brief wordmark/location reveal and a matching white system launch screen. There is no GIF/video download or added runtime dependency. The short trace repeats only while the startup view is visible, stops on dismissal/background/detach, and honors disabled system animations.

Startup has no minimum animation duration. A ready document can dismiss the splash immediately, with a 120ms crossfade that releases input at its start. Early streamed HTML commits no longer hide it before document parsing completes; a visual-state callback waits for the next drawable frame rather than waiting for all images or the animation to finish. A document-generation guard rejects stale completion callbacks after navigation/retry/destruction. The existing 25-second manual recovery remains; no timeout reloads an active payment.

A read-only public homepage request from this Mac measured approximately 0.54s to first byte and 2.67s to complete HTML reception. This is one unauthenticated desktop-network sample, not a phone launch benchmark. Server response, streamed catalog data, scripts and device/network performance still influence launch time. This native change removes an avoidable hold and improves the visual handoff; it does not make remote website delivery instantaneous or change catalog/data-fetch logic.

This follow-up needs only the new Android binary for its splash behavior. Earlier Android link/Back/receipt/haptic web changes still require their separate matching web deployment. iOS remains unchanged.

Retry explicitly reloads the last valid store URL. It does not submit an order, clear session storage, automatically retry payments, or send data from the local page. The recovery page has no third-party assets, scripts or access to the native bridge. It reminds customers to check orders/checkout before paying again after an interrupted payment. This is connection recovery, not offline shopping or an offline checkout.

The native watchdog is deliberately limited to startup and explicit recovery: it does not time out or reload an active payment. Social sites are removed from Android's in-WebView navigation allowlist; Capacitor opens external destinations using external intent handling. Existing payment intent behavior is retained.

## Links, Back and native UI

- Android listens for warm `appUrlOpen` events and reads `getLaunchUrl` for cold launches, independently of notification registration or browser authentication requests. Retained event/launch duplicates do not create duplicate navigation or exchange an authorization code twice.
- HTTPS destinations require the exact store origin. Credential-bearing URLs, other schemes/domains and non-page API/build endpoints are rejected. Custom auth callbacks require `themakeupstore://auth/callback`; provider errors are shown generically without exposing callback parameters.
- Android Back first sends Escape to an open dialog/menu/listbox. It leaves an active Razorpay overlay in control, otherwise uses history or exits at the root.
- Android-only bottom navigation uses the installed Haptics API, with a best-effort fallback. Bottom padding recognizes Capacitor's safe-area CSS variable. Web/iOS branches are retained.
- Android enables WebView zoom and removes the page's zoom restrictions only while its Android runtime is mounted; the shared web/iOS viewport stays unchanged.
- Google native sign-in no longer logs or displays complete plugin results or tokens. It returns a generic error on failure.

## Receipts

Android receipt PDFs are written into `Directory.Cache/receipts` and shared using the actual returned file URI. The receipt branch no longer also attempts a browser download. FileProvider exposes only that cache subdirectory. Save/share errors are visible to the admin. Browser and iOS export branches retain their previous behavior. Receipt financial content is unchanged.

## Private release setup

The existing local signing identity was moved, without changing its values, into ignored `android/keystore.properties` with owner-only permissions. Use `android/keystore.properties.example` for the property names when configuring another machine; securely restore the existing keystore rather than generating a replacement.

CI may instead provide `TMS_ANDROID_KEYSTORE` (absolute path), `TMS_ANDROID_STORE_PASSWORD`, `TMS_ANDROID_KEY_ALIAS` and `TMS_ANDROID_KEY_PASSWORD`. Environment values take precedence over the private file. Release builds fail clearly if signing values or Firebase configuration are absent. Restore `android/app/google-services.json` from the matching Firebase project before building a release.

Current source no longer contains the inline signing passwords. Existing Git history and any external copies have not been rewritten; historical exposure/rotation needs separate review while preserving Android signing continuity. Never commit the keystore, private properties or CI secrets.

## Local verification

- All 572 web tests pass, including 28 new platform-isolation, link/lifecycle/Back and receipt-sharing checks. TypeScript, touched-file ESLint and the final production web build pass. The existing Google fonts required network access for the web build after cache cleanup.
- Eight Android app unit tests pass (three URL-policy checks, four startup readiness/race checks and the existing example test). Debug APK, signed release AAB and release vital lint tasks build successfully with the existing signing identity. AAB signature integrity is verified; the local release certificate matches a fingerprint in the association source.
- Final packaged configuration and recovery files are checked inside both artifacts: HTTPS remote store, isolated localhost recovery, no social navigation allowlist, zoom enabled, zero fixed Capacitor splash hold, and no copied Next.js output. Debug APK is approximately 10.85 MiB; release AAB is approximately 7.55 MiB. The bundled public assets total about 2.4 KB.
- Local Chromium checks at 320/390/1440px verify the recovery screen, keyboard-accessible Retry, no page overflow and no JavaScript exceptions.
- The animated splash browser preview uses the native vector geometry and trace timings. Checks at 320×640, 390×844 and 844×390 verify moving trace frames, readable branding and no overflow/JavaScript exceptions; reduced-motion mode is static. It is a visual approximation, not a capture from a physical Android device.
- All 431 existing iOS files, including generated configuration/assets, match the pre-change SHA-256 snapshot. Tests also check that iOS/web do not receive Android listeners or viewport changes, and that iOS Capacitor configuration is retained.
- No physical Android device was connected. The device-only checks below remain outstanding. Only generated Next.js webpack/development caches were cleared for disk space; website server/static output was retained.

Artifacts:

- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## Release and phone verification

The local native changes require a new APK/AAB. The link/Back/receipt/haptic web changes require the matching web deployment. Do not apply old pending application migrations out of order or deploy a web revision whose earlier migration prerequisites have not been completed. No production deployment, store upload, push send, login, payment or database write is performed by this work.

Before publishing, test on a physical Android device:

1. Cold start online, in airplane mode, with slow connectivity and during a server failure; retry returns to the same destination without losing the existing checkout context.
2. Open product/order links while running and after termination, and check Android App Links against the Play App Signing certificate (not only a local/upload certificate).
3. Google login, cancellation, logout and notification registration; foreground/background/terminated push and notification taps.
4. Close sheets/menus with Back, then navigate back and exit at root; check gesture and three-button navigation, keyboard and screen cutouts.
5. Existing Razorpay web checkout: UPI app switching and return, cancellation, connection loss, backgrounding and confirmation retry. No native-payment migration is included.
6. Share a receipt to a PDF viewer/messaging app; share product links; verify WhatsApp/Instagram open outside the main store WebView.

The live Android association endpoint returned 200 during the preceding audit, with the matching package name and two fingerprints. That does not independently prove verification on a Play-distributed device. iOS notification/link/native changes remain deferred.
