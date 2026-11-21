# iOS App Store update — 19 November 2026

## Release identity

- Existing app: THE MAKEUP STORE, App Store ID `6807716530`.
- Bundle: `com.themakeupstorewangkhei.twa`; team/app prefix `VJ6CZ336M8`.
- Live version verified through Apple's Indian storefront: **1.1**. App Store Connect's latest uploaded build before this release was **3**.
- Prepared update: **1.2.1 (4)**, App Store version ID `188ec75b-a709-4ec9-aecb-6fbe3746eeea`.
- Release type: **manual**. Apple now reports the update as **In Review**. It will not publish automatically after approval; manual release remains required.

## Signing and account preparation

The original Apple Distribution certificate and private key are retained. Push Notifications and Associated Domains were enabled on the existing App ID; Apple sign-in and other existing capabilities were retained. No certificate or previous profile was revoked.

A new App Store distribution profile, `THE MAKEUP STORE iOS Release 2026-11-19`, was created and installed. It expires on 4 September 2027 and contains the correct app prefix, production APNs, Associated Domains, Apple sign-in and `get-task-allow=false`. The Release target and `ios/ExportOptions.plist` select this profile and Apple Distribution signing.

`ITSAppUsesNonExemptEncryption=false` preserves the declaration on both previously accepted builds; this update uses existing OS/standard transport encryption and adds no proprietary encryption. Private `.p8`/`.p12` keys are excluded from Git. API tokens/private key material are never part of the archive, IPA, commands committed here or release notes.

The live website's association file returned 200 JSON with the matching application identifier. The update draft retains its existing en-US description, ten screenshots across two device sets and review contact/login. Its release notes describe the new launch animation, sign-in/navigation, connection recovery, notifications and receipt sharing. Pricing, availability and the current live version remain unchanged.

## Artifacts

- Archive: `ios/App/output/release-1.2.1-4/TheMakeupStore.xcarchive`
- Exported IPA: `ios/App/output/release-1.2.1-4/export/App.ipa`
- Export/signing report: files alongside the IPA in its export directory.
- Archive dSYMs: `TheMakeupStore.xcarchive/dSYMs`.

These binary outputs are ignored by Git. Keep the signed archive and dSYMs for the released build.

## Reproduce locally

Restore the existing signing identity and matching updated profile on the build machine. Then run from the repository root:

```sh
TMS_IOS_DERIVED_DATA=/private/tmp/tms-ios-build \
TMS_IOS_ARCHIVE="$PWD/ios/App/output/release-1.2.1-4/TheMakeupStore.xcarchive" \
npm run ios:archive

xcodebuild -exportArchive \
  -archivePath ios/App/output/release-1.2.1-4/TheMakeupStore.xcarchive \
  -exportPath ios/App/output/release-1.2.1-4/export \
  -exportOptionsPlist ios/ExportOptions.plist
```

Use a fresh version/build number and output directory for subsequent uploads; verify the chosen number against App Store Connect. Export does not change the number automatically. These commands do not sync Android, deploy the website or upload anything.

Apple's uploader can use the owner's App Store Connect API key by local file path. Supply its public key ID/issuer and private path through task-specific environment variables; do not place the private key in the repository:

```sh
xcrun altool --validate-app "$PWD/ios/App/output/release-1.2.1-4/export/App.ipa" \
  --api-key "$TMS_ASC_KEY_ID" --api-issuer "$TMS_ASC_ISSUER_ID" \
  --p8-file-path "$TMS_ASC_KEY_PATH" --output-format json
```

## Verification and distribution status

- All 592 web tests, 31 native checks and TypeScript pass.
- The signed Release archive and IPA export succeed with Xcode 26.6 and the iOS 26.5 SDK; deployment minimum remains iOS 15.
- Strict/deep code-sign verification passes. The signed app has the intended production entitlements, no debugger entitlement, the privacy manifest, isolated recovery assets and no fixed Capacitor splash delay.
- IPA is approximately 2.39 MiB. SHA-256: `ec29ad2ba7f3c5ffbb298490d1553de1bd2f8e3abc19bf288d248be713e6bc31`.
- Apple server validation: **passed with zero errors**. Warning 90725 concerns the future April 2027 iOS 27 SDK requirement; the current iOS 26.5 SDK is accepted for this upload.
- Upload: **succeeded with no errors**, delivery/build UUID `8e7dd5f2-b6dd-4b28-a7c3-8a4f38f49e47`. Apple processing completed with `VALID` and `APP_STORE_ELIGIBLE`; the accepted build has `usesNonExemptEncryption=false`.
- Final App Store Connect state: **IN_REVIEW**, with signed build 4 attached to version 1.2.1. This state was observed through the API; the local preparation did not issue the review-submission command. The internal TestFlight state is **IN_BETA_TESTING** in the existing automatically distributed internal group.
- Public release: **not performed**. Release type remains **MANUAL**, so Apple approval alone will not publish the update.
- The uploader successfully delivered the package, then its JSON processing-wait reporter crashed with `NSInvalidArgumentException`. Direct authenticated Apple API checks confirmed the delivered build is valid and in review. No duplicate upload was attempted. Prefer the uploader's normal output format for future `--upload-package --wait` runs if this tool-version issue recurs.

Before public release, complete the [physical iPhone/TestFlight checks](ios-capacitor.md#physical-iphone--testflight-checklist), especially authentication, APNs notifications and payment-app switching. Simulator/storefront checks do not verify those device-only paths. The Firebase APNs setup must be valid for production notifications.
