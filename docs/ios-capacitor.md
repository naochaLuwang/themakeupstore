# iOS Capacitor reliability — 19 November 2026

The iOS app still loads `https://themakeupstorewangkhei.com`. It now has its own small local recovery bundle and native startup controller. The storefront, prices, stock, order writes, payment verification and notification sender are unchanged. No migration is introduced by this work. Android native source and packaged configuration are unchanged from the completed Android work.

## Implemented

- **Packaging:** iOS copies `native/ios`, not the Next.js server build. A real local `index.html`, recovery page and stylesheet replace the previously unusable server fragments. Capacitor Core/CLI/iOS use 8.5.1. Only the twelve linked, Swift Package Manager compatible iOS plugins are registered. Android Google One Tap and the unlinked native Razorpay plugin are excluded from iOS; checkout continues to use its existing web integration.
- **Splash:** the static iOS launch storyboard uses the real M logo on white. The first native app view continues with five black logo strokes, a moving pink trace and the store/location wordmark. It has no fixed two-second wait or minimum animation duration. Document parsing plus the next animation frame releases the overlay, with a 120ms fade that releases input immediately. Stale document callbacks cannot dismiss a newer retry. Reduce Motion uses the static mark; animation stops when detached/backgrounded. The launch storyboard itself is static, as required by iOS.
- **Recovery:** connection failures and main-document HTTP 5xx responses use the bundled page; startup that remains unavailable after 25 seconds offers native Retry. A terminated WebKit content process also offers explicit Retry. Recovery remembers only an exact HTTPS store URL. It does not automatically reload checkout, resubmit payments, clear sessions or mutate orders. A slow startup can still finish without requiring a retry.
- **Navigation:** social/external HTTP links leave the store WebView. Exact origin checks prevent lookalike hosts from entering it. The delegate forwards Capacitor's remaining handlers, including plugin/navigation/security handling. iOS swipe navigation is enabled. Cold and warm App links are handled independently of notification registration, with listener cleanup, retained-launch deduplication, exact destinations and generic auth errors. Browser zoom restrictions are removed only while the iOS runtime is mounted; bottom navigation reads the iOS safe area.
- **Google sign-in:** new binaries open Supabase's PKCE authorization URL in `ASWebAuthenticationSession`, then exchange the returned one-use code with the original WebView client. The native method validates the provider, Supabase host, redirect, challenge and callback. System-session and App-event callbacks share one exchange. Only SHA-256 fingerprints of completed codes enter session storage; raw codes and provider payloads are not logged or stored. Cancellation is quiet, failures remain retryable, and older installed binaries retain their previous redirect branch until updated.
- **Apple sign-in:** the existing native nonce/token flow is retained. Apple cancellation code 1001 is handled separately from actual error 1000; failures get a generic message.
- **Notifications:** AppDelegate now forwards APNs registration/failure and remote-notification callbacks. An early APNs token is retained until the bridge appears. Background completion is bounded and protected against duplicate completion. APNs environment and Associated Domains are declared, with the existing Apple sign-in entitlement retained. Firebase auto-init defaults off, is enabled after permission for authenticated registration, and is stopped before token revocation/opt-out. Older binaries and Android do not call the new custom plugin.
- **Receipts:** iOS writes PDFs under `Directory.Cache/receipts` and opens the system share sheet using the returned file URI. It no longer attempts a browser download or constructs an incorrect file URL. Write/share failures are visible; the PDF's financial content is unchanged.
- **App metadata:** added camera/photo-save usage descriptions, required-reason privacy entries for file timestamps, preferences and boot-time APIs, and remote-notification background mode. Status-bar text stays dark on the store's white surfaces in either system appearance. Removed the obsolete armv7 device requirement. The existing bundle ID, development team and release signing identity/profile name are retained. Version is **1.2.1, build 4**; confirm both against App Store Connect before uploading.
- **Universal Links:** added `public/.well-known/apple-app-site-association` and JSON response headers. It names `VJ6CZ336M8.com.themakeupstorewangkhei.twa`, allows store page links and excludes API/build/association subpaths. This file needs website deployment; the earlier live endpoint returned 404.

## Build commands

```sh
npm run ios:sync       # iOS assets/config/plugins only
npm run ios:test       # Foundation URL/PKCE/startup checks
npm run ios:build      # unsigned local simulator app
npm run ios:archive    # device Release archive using existing signing settings
```

The scripts never sync Android, run a Next.js build, upload an archive or change Apple provisioning automatically. The public Swift packages use Xcode's `netrc` authorization provider to avoid a stalled keychain credential lookup. The Firebase Messaging dependency uses Capacitor's supported generated SPM symlink workaround; `ios/App/CapApp-SPM/symlinks` is ignored and recreated by sync.

Set `TMS_IOS_DERIVED_DATA` to choose a build workspace and `TMS_IOS_ARCHIVE` to choose the archive path. Defaults are under the system temporary directory. Install Xcode and restore the matching `GoogleService-Info.plist` on another machine. An archive requires the original signing identity plus a provisioning profile containing all enabled capabilities. Keep several GB of free disk space for Xcode packages, simulator runtimes and archives.

## Deployment prerequisites

1. Deploy the matching website code, including the AASA file, iOS runtime, Google callback coordinator and receipt/push helpers. Follow earlier pending application migrations in their documented order before deploying this whole checkout; this iOS work adds no SQL. Confirm the association endpoint is unauthenticated HTTPS, returns 200 JSON and has no redirect.
2. In Apple Developer, verify Push Notifications, Associated Domains and the existing Sign in with Apple capability for the existing bundle ID. Reissue/download the existing distribution profile with these entitlements. Debug uses APNs development; Release uses production. Confirm the signed profile's application-identifier prefix matches the AASA identifier; a transferred app can have a prefix different from its current team ID. No Apple account setting was changed here.
3. In the matching Firebase iOS app, verify the bundle ID and APNs authentication key/team/key ID (or valid APNs certificates). Confirm the existing Google service plist belongs to that app. No Firebase console setting was changed and no notification was sent.
4. In Supabase Auth, verify Google is configured and `themakeupstore://auth/callback` is allowed as a redirect. Verify the Apple provider accepts the existing iOS bundle ID. The web callback remains needed for browser sign-in. No Auth settings or real accounts were changed/tested.
5. Confirm **1.2.1/build 4** exceeds the relevant App Store Connect version/build. Open `ios/App/App.xcodeproj`, select the App scheme and a generic iOS device, archive, validate and distribute to TestFlight using the retained signing identity. Do not replace the app ID or create a new store listing.

No suitable connected iPhone or locally installed matching provisioning profile was available during this work. A simulator build is not a signed archive, IPA or TestFlight-ready release. No App Store upload, production deployment, login, payment or database write was performed.

## Verification

- All **592 web tests** pass, including iOS system-auth/callback deduplication, failure/retry, older-binary fallback, Apple cancellation, cold/warm links, platform isolation, receipts, push auto-init ordering and association configuration. TypeScript, new-module ESLint and the final production web build pass. Login retains its six pre-existing `no-explicit-any` lint findings; other touched web modules lint clean.
- **31 native Foundation checks** pass for exact URL/PKCE rules, startup generations, retries and stale completions.
- Xcode 26.6 successfully builds the arm64 iOS Simulator app with the actual Capacitor/Firebase/plugins and new Swift sources. The packaged app reports the original bundle ID, iOS 15 minimum, version 1.2.1/build 4, twelve supported plugins, isolated recovery origin, zero splash hold and the bundled privacy manifest. Local public assets total approximately 2.4 KB; simulator app is approximately 11 MB.
- The compiled native splash runs in the iPhone SE simulator on iOS 17.5, with a readable mark and wordmark in light/dark appearance and distinct moving pink-trace frames. A four-second native recording and screenshots are retained under `/private/tmp/tms-ios-splash*`. The isolated debug preview skips website loading and plugin auto-registration; it is a real UIKit splash preview, not an end-to-end storefront test.
- All **114 Android native/source/config files** in the pre-iOS snapshot retain their SHA-256 hashes. Existing Android link/runtime and receipt tests remain passing.
- The production server's local AASA endpoint returns **200**, `Content-Type: application/json` and `Cache-Control: public, max-age=3600`, without a redirect or authentication. Browser checks at **320/390/1024/1440px** verify the bundled recovery screen has no overflow or JavaScript exceptions and Retry is keyboard accessible with the exact local destination. This does not deploy or verify Apple's live association cache.
- Disk exhaustion during package extraction/web compilation was handled by removing only generated build/cache files. The final web build disables Webpack's disk cache temporarily for verification, then restores the source configuration. SDK bundles used by the native build were restored from checksum-verified originals and their signatures verified. Temporary extracted package workspaces were removed after compilation; global SDK caches, source, Android release artifacts and signing files were retained.

## Physical iPhone / TestFlight checklist

Test cold launch on Wi-Fi/mobile data, airplane mode, slow connections and server failure; retry and interrupted payments must not submit twice. Check fast startup, dark mode, Reduce Motion, large text, rotation, keyboard/home-indicator spacing and pinch zoom.

Test Google sign-in, cancellation and retry; Apple first/returning sign-in and cancellation; email/password login and sign-out. Open product/order/auth links while running and terminated, and verify Universal Links from an external app after deploying the AASA file and signing with the updated profile.

Test notification opt-in, foreground/background/terminated delivery, notification taps, opt-out, sign-out/account changes, OS Settings blocking and re-enabling. These require valid APNs/Firebase setup and a real device.

Test the existing Razorpay checkout through payment-app switching, cancel/return, backgrounding, connection loss and confirmation retries. Check receipt sharing to Files and another app, photo picker/camera access, and external WhatsApp/Instagram links. Do not mark these device-only flows verified from the simulator splash preview.

References: [Capacitor iOS configuration](https://capacitorjs.com/docs/config), [Capacitor deep links](https://capacitorjs.com/docs/guides/deep-links), [Firebase Messaging iOS setup](https://capawesome.io/plugins/firebase/cloud-messaging/), [Supabase native deep links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession).


## Release follow-up

The owner supplied App Store Connect API access for the existing app (`6807716530`). The live version was verified as 1.1 and latest old build as 3. Push Notifications and Associated Domains are now enabled on the existing Apple App ID, and a new distribution profile includes those capabilities plus the existing Apple sign-in entitlement. Version 1.2.1/build 4 was archived with the existing Apple Distribution identity, exported, signature checked and validated by Apple without errors. The signed IPA was uploaded and Apple reports it as VALID, App Store eligible, attached to version 1.2.1 and **IN_REVIEW**. Internal TestFlight is active; public release remains manual. Matching AASA JSON is already live. See [the release record](ios-release.md) for artifacts, verification, the future SDK warning and remaining physical-device checks. No old certificate/profile was revoked, and no Android source, application SQL or order/payment data was changed by release preparation.
