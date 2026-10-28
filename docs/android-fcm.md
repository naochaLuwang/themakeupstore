# Android Firebase push notifications

The Android Capacitor app uses `@capacitor-firebase/messaging` to obtain a native Firebase Cloud Messaging token. After sign-in, the web app saves it in Supabase `push_subscriptions`. Order updates, stock alerts, and admin broadcasts use Firebase's HTTP v1 API through `lib/fcm-send.ts`.

On Android, Firebase displays background notifications. While the app is open, the Firebase listener displays the incoming message through Capacitor Local Notifications. Both use the `push-notifications` channel and `ic_stat_icon`. Notification taps open a path on the store website.

## Configuration

- Firebase project: `the-makeup-store-7dad3`.
- Android application ID: `com.themakeupstorewangkhei.twa`.
- Native Firebase configuration: `android/app/google-services.json`, with that application ID and Firebase project.
- Server environment: `FIREBASE_SERVICE_ACCOUNT_KEY`, containing the complete Firebase service account JSON. Keep it server-only. It must be configured in the web host as well as local development.
- Android has the Google Services Gradle plugin, Firebase messaging service, `POST_NOTIFICATIONS` permission, channel metadata, icon, and native channel creation in `MainActivity`.
- Device registration requires a signed-in account. Android 13+ also requires notification permission. The profile settings toggle persists an explicit opt-out on this device.

The existing database schema allows one device row per account. Registering another phone replaces that account's previous row. Token ownership across accounts relies on the `claim_fcm_token` trigger from `supabase/migrations/20261018_push_subscriptions_registration_fix.sql`. Anonymous callers should see no device rows.

The Android directory is ignored by git. Preserve its native configuration when moving or rebuilding this project.

## Deploy and test

The Capacitor wrapper loads `https://themakeupstorewangkhei.com` from `server.url`. Deploy the web code and confirm the Firebase service account environment variable exists on the host. JavaScript/server fixes take effect through that deployment; changing native files or plugins requires a new APK/AAB.

1. Open the Android app, sign in, and allow notifications. If previously disabled, use Profile → Settings → Enable Notifications.
2. As an admin, open Admin → Broadcast and register this device. Confirm it appears in the device list.
3. Use **Send Test to My Devices**. Confirm a notification appears while the app is open, then tap it and verify navigation.
4. Repeat with the app in the background and after normally closing it. Android Settings → Force stop prevents FCM delivery until the app is opened again.
5. Disable notifications, reopen the app, and confirm they remain disabled. Re-enable and test again.
6. Sign out and confirm the old device token is revoked; sign in again to register a new token.

Diagnostic sends target the current admin's devices. The admin-device test resolves admin profiles and tokens directly; it does not send to the old public `admin` topic, which older clients joined regardless of account role. Old topic subscriptions are removed on registration.

An accepted Firebase API request confirms acceptance by Firebase, not delivery to a physical device. Use Firebase `validate_only: true` to verify credentials and payloads without delivering anything.

## Audit verification, 28 October 2026

- Original payload reproduced an HTTP 400: unknown `priority` inside `android.notification`.
- Corrected payload uses `notification_priority: PRIORITY_HIGH`; Firebase validation-only request passed with local credentials.
- Android Firebase project and service-account project match.
- Live database contained 84 registered rows, including two admin-owned rows; anonymous device queries returned zero rows.
- Broadcast queries now fetch profiles separately because the live schema has no direct `push_subscriptions` → `profiles` relationship.
- Android debug and production web builds passed; 24 regression tests and TypeScript checks passed. Core push files are lint-clean; remaining lint issues in surrounding admin files predate this work.
- No Android phone/emulator was connected, so delivery, permissions, and tap behavior still require the device test above.
