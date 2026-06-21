# iOS Expert Reference — Build to Launch

## Table of Contents

1. [Xcode & Swift Fundamentals](#1-xcode--swift-fundamentals)
2. [Certificates & Provisioning](#2-certificates--provisioning)
3. [APNs (Push Notifications)](#3-apns-push-notifications)
4. [Background Modes & BGTaskScheduler](#4-background-modes--bgtaskscheduler)
5. [App Store Connect](#5-app-store-connect)
6. [TestFlight](#6-testflight)
7. [App Review & Submission](#7-app-review--submission)
8. [ITMS Error Code Reference](#8-itms-error-code-reference)
9. [Privacy Manifests (Required 2024+)](#9-privacy-manifests-required-2024)
10. [In-App Purchase (StoreKit 2)](#10-in-app-purchase-storekit-2)
11. [Firebase iOS Integration](#11-firebase-ios-integration)
12. [Google Sign-In iOS](#12-google-sign-in-ios)
13. [Deep Links & Universal Links](#13-deep-links--universal-links)
14. [Performance & Crash Reporting](#14-performance--crash-reporting)
15. [Common Submission Failures & Fixes](#15-common-submission-failures--fixes)

---

## 1. Xcode & Swift Fundamentals

**Xcode versions (2025-2026):**

- Xcode 16.x: Required for iOS 18 SDK, Swift 6
- Xcode 15.x: Last version supporting iOS 12 as deployment target
- App Store requires builds from the latest Xcode major version (enforced ~spring each year)
- As of spring 2026: submissions must use Xcode 16+

**Swift 6 concurrency model:**

- `Sendable` conformance required for types crossing actor boundaries
- `@MainActor` isolates UI code
- Structured concurrency: `async/await`, `Task`, `TaskGroup`, `AsyncStream`
- `actor` keyword for data isolation
- Migration: enable Swift 6 warnings in Build Settings > Swift Language Version

**Minimum deployment targets (2026):**

- App Store: iOS 16 minimum recommended (iOS 15 still accepted but shrinking)
- <project> target: iOS 16+ to get push notification runtime permission APIs

**Key Build Settings:**

- `PRODUCT_BUNDLE_IDENTIFIER`: com.<project>.shield
- `MARKETING_VERSION`: 2.3.0
- `CURRENT_PROJECT_VERSION`: 15 (build number)
- `DEVELOPMENT_TEAM`: LZT4U6348K
- `CODE_SIGN_STYLE`: Automatic or Manual
- `IPHONEOS_DEPLOYMENT_TARGET`: 16.0

---

## 2. Certificates & Provisioning

**Certificate types:**
| Type | Purpose | Expiry |
|------|---------|--------|
| Apple Development | Local device testing | 1 year |
| Apple Distribution | App Store + Ad Hoc | 1 year |
| Apple Push Services | APNs (legacy) | 1 year |
| APNs Auth Key (.p8) | APNs (token-based) | **Never expires** |

**Always use .p8 APNs auth key** — one key works for all apps in your account, never expires, no rotation needed.

**Provisioning profiles:**
| Type | Use case |
|------|---------|
| iOS App Development | Debug builds on registered devices |
| Ad Hoc | Distribution to specific UDIDs |
| App Store | App Store / TestFlight distribution |
| Enterprise | In-house distribution |

**Provisioning profile contains:** App ID + certificates + device UDIDs (not for App Store type) + entitlements

**App ID capabilities that affect provisioning:**

- Push Notifications → must be enabled in App ID
- Associated Domains → for Universal Links
- Sign in with Apple → requires entitlement
- In-App Purchase → requires App ID config
- Background Modes → enabled in capabilities

**Manual signing (EAS typically handles this):**

```
Keychain Access → Certificate Assistant → Request Certificate from CA
Upload CSR to developer.apple.com → Download .cer → Install in Keychain
Create App ID → Create Provisioning Profile → Download + install
```

**Automatic signing:** Xcode manages everything. Fine for development. EAS Build manages production signing for CI/CD.

**Certificates expiry:** Check at developer.apple.com/account/resources/certificates/list
Renewing a certificate does NOT invalidate existing signed builds.

---

## 3. APNs (Push Notifications)

**Token-based authentication (.p8) — ALWAYS use this:**

- Key ID: `48BS2XTSL2` (<project>)
- Team ID: `LZT4U6348K`
- Key file: `AuthKey_48BS2XTSL2.p8` — **back this up, can only download once**
- Bundle ID for topic: `com.<project>.shield`
- Works for both Sandbox (development) and Production — same key

**APNs environments:**

- **Sandbox:** Development builds, TestFlight with development profile
- **Production:** App Store builds, TestFlight with distribution profile
- Firebase abstracts this — upload the .p8 key once and Firebase handles routing

**Upload .p8 to Firebase:**

1. Firebase Console → Project Settings → Cloud Messaging → iOS app
2. Upload APNs Authentication Key
3. Enter Key ID: 48BS2XTSL2 and Team ID: LZT4U6348K

**FCM token registration (React Native/Expo):**

```typescript
import messaging from "@react-native-firebase/messaging";

// Request permission (iOS 13+, required)
const authStatus = await messaging().requestPermission();
const enabled =
  authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
  authStatus === messaging.AuthorizationStatus.PROVISIONAL;

// Get FCM token
const fcmToken = await messaging().getToken();
// Send fcmToken to your backend → store in user record

// Handle background messages
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  // Process notification
});
```

**Push notification payload for challenge (<project> ACH):**

```json
{
  "notification": {
    "title": "ACH Transfer Challenge",
    "body": "Tap the matching number to approve"
  },
  "data": {
    "type": "ach_challenge",
    "challengeId": "uuid",
    "options": ["3", "7", "9"],
    "expiresAt": "ISO timestamp"
  },
  "apns": {
    "payload": {
      "aps": {
        "alert": { "title": "...", "body": "..." },
        "sound": "default",
        "badge": 1,
        "category": "ACH_CHALLENGE",
        "content-available": 1
      }
    }
  }
}
```

**iOS 16+ push notification permission:**

```swift
UNUserNotificationCenter.current().requestAuthorization(
  options: [.alert, .sound, .badge]) { granted, error in }
```

---

## 4. Background Modes & BGTaskScheduler

**Info.plist background modes (Expo: ios.infoPlist.UIBackgroundModes in app.json):**

```json
"UIBackgroundModes": ["fetch", "processing", "remote-notification"]
```

- `fetch`: legacy background fetch (iOS 13+ deprecated in favor of BGAppRefreshTask)
- `processing`: BGProcessingTask for longer background work
- `remote-notification`: silent push to trigger background fetch

**BGTaskSchedulerPermittedIdentifiers (CRITICAL — causes App Store rejection if missing):**

```json
"BGTaskSchedulerPermittedIdentifiers": ["com.<project>.shield.refresh"]
```

This must exactly match what your app registers at runtime.

**In Expo app.json:**

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["fetch", "processing", "remote-notification"],
        "BGTaskSchedulerPermittedIdentifiers": ["com.<project>.shield.refresh"]
      }
    }
  }
}
```

**Registering tasks in Swift/React Native:**

```typescript
// expo-background-fetch or expo-task-manager
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";

const TASK_NAME = "com.<project>.shield.refresh";

TaskManager.defineTask(TASK_NAME, async () => {
  // Do background work
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

await BackgroundFetch.registerTaskAsync(TASK_NAME, {
  minimumInterval: 15 * 60, // 15 minutes minimum
  stopOnTerminate: false,
  startOnBoot: true,
});
```

**Rules:**

- iOS gives ~30 seconds for background fetch tasks
- iOS gives up to several minutes for processing tasks (device plugged in + on Wi-Fi)
- Background execution is throttled by iOS based on user app usage patterns
- Never guaranteed to run at exact scheduled time

---

## 5. App Store Connect

**URL:** https://appstoreconnect.apple.com
**Account:** <email>
**App:** <project> Shield · App ID: 6762309517
**Bundle ID:** com.<project>.shield

**App metadata required for submission:**

- App name (max 30 chars): "<project> Shield"
- Subtitle (max 30 chars)
- Keywords (max 100 chars)
- Description (max 4000 chars)
- What's New (max 4000 chars)
- Screenshots: 6.5" (iPhone 14 Pro Max), 5.5" (iPhone 8 Plus), 12.9" iPad Pro
- App icon: 1024×1024 PNG (no alpha channel, no rounded corners)

**App Store Connect API (v3):**

- Used for automation: upload builds, manage TestFlight, read review status
- API keys at: App Store Connect → Users and Access → Keys
- Key types: App Manager, Developer, Marketing
- Used by EAS Submit to automate submissions

**Version states:**

```
Prepare for Submission → Waiting for Review → In Review →
  → Approved → Ready for Sale
  → Rejected → Developer Action Required → (fix) → Resubmit
```

**App Review timeline:**

- Standard: 24-48 hours (most common)
- Expedited: ~24 hours — request at developer.apple.com/contact/app-store/
- Expedited criteria: critical bug fix, time-sensitive launch event, legal requirement

**App information sections:**

- Age Rating: must complete questionnaire
- Privacy Policy URL: required
- Category: Utilities (<project>)
- Content rights declaration required
- Advertising identifier (IDFA) declaration required

---

## 6. TestFlight

**Internal testing:**

- Up to 100 testers
- No App Review required — available within minutes of upload
- Must be App Store Connect users (Developer, Admin, etc.)
- Builds available for 90 days

**External testing:**

- Up to 10,000 testers
- Requires App Review (usually same day for TestFlight-specific review)
- Testers invited by email or public link
- Builds available for 90 days

**TestFlight vs Production APNs:**

- TestFlight builds use **production** APNs environment if signed with distribution cert
- TestFlight builds use **sandbox** APNs environment if signed with development cert
- EAS production builds → distribution cert → production APNs → correct

**Common TestFlight issues:**

- "Processing" stuck: usually takes 5-30 min for large builds; wait before panicking
- Tester not receiving email: check spam; try TestFlight app → Redeem link
- Build not appearing: check if build is in "Testing" state (not just uploaded)
- FCM not working in TestFlight: verify APNs key is uploaded to Firebase, verify production environment

**Build expiry:** 90 days from upload. Plan submissions around this.

---

## 7. App Review & Submission

**Pre-submission checklist:**

- [ ] All screenshots match current UI (not outdated)
- [ ] Privacy policy URL live and accessible
- [ ] Privacy manifest (PrivacyInfo.xcprivacy) included
- [ ] No placeholder content, lorem ipsum, or "coming soon" features
- [ ] All features in screenshots work without login (or provide demo credentials in review notes)
- [ ] App doesn't crash on first launch
- [ ] If login required: provide valid test account credentials in the review notes
- [ ] In-app purchase prices visible (if applicable)
- [ ] No references to competitor platforms (Android, Google Play) in UI
- [ ] No external payment links that bypass App Store (Apple rule)
- [ ] Location, camera, microphone permissions have clear usage descriptions in Info.plist

**Required NSUsageDescription keys (Info.plist):**

```xml
<key>NSCameraUsageDescription</key>
<string>Used to scan QR codes for UPI payments</string>
<key>NSFaceIDUsageDescription</key>
<string>Used to authenticate your identity securely</string>
<key>NSContactsUsageDescription</key>
<string>Used to quickly find contacts for payments</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Used to verify transaction location</string>
```

**Review notes format (App Store Connect → App Review Information):**

```
Demo Account:
Email: <email>
Password: TestPass123

Notes:
- App requires biometric authentication. On simulator, use Touch ID/Face ID simulation.
- ACH challenge flow requires backend; tap any number in challenge screen for demo.
- Region selector should be set to "India" to access UPI features.
```

**Guideline references for <project>:**

- 2.1 App Completeness — all features must work
- 4.8 Sign in with Apple required if other social login is offered (you have Google Sign-In)
- 5.1.1 Data Collection — must declare all data collected
- 5.1.2 Data Use — must use data as described

**Sign in with Apple requirement:**
If your app offers third-party login (Google), Apple requires you also offer Sign in with Apple.
<project> app.json has `usesAppleSignIn: true` — implementation must be present in the app.

---

## 8. ITMS Error Code Reference

| Code       | Meaning                              | Fix                                                    |
| ---------- | ------------------------------------ | ------------------------------------------------------ |
| ITMS-90035 | Invalid signature                    | Rebuild with correct provisioning profile              |
| ITMS-90036 | Invalid code signing                 | Re-sign with distribution certificate                  |
| ITMS-90060 | Imported Swift version mismatch      | Clean build, ensure correct Swift toolchain            |
| ITMS-90062 | Invalid bundle structure             | Check framework embedding settings                     |
| ITMS-90076 | Invalid library path                 | Remove or embed linked libraries correctly             |
| ITMS-90085 | Unsupported architectures            | Ensure lipo creates universal binary or arm64 only     |
| ITMS-90087 | Framework missing simulator slice    | Strip simulator slices from release build              |
| ITMS-90096 | Binary contains invalid API usage    | Remove private/restricted API references               |
| ITMS-90101 | Disallowed entitlements              | Remove entitlements not in provisioning profile        |
| ITMS-90125 | Missing privacy usage strings        | Add NSUsageDescription to Info.plist                   |
| ITMS-90148 | Missing required icon                | Ensure 1024×1024 icon, no alpha                        |
| ITMS-90161 | Duplicate symbols                    | Check third-party SDKs for conflicts                   |
| ITMS-90168 | Invalid architecture                 | Ensure arm64 only for App Store (no x86_64)            |
| ITMS-90206 | Unsupported WatchKit app             | Remove or fix Watch extension                          |
| ITMS-90209 | Deployment target too low            | Raise minimum iOS version in build settings            |
| ITMS-90338 | Non-public selectors                 | Remove Objective-C private API usage                   |
| ITMS-90503 | Invalid bundle executable            | Bundle name mismatch                                   |
| ITMS-90506 | Icon contains alpha                  | Remove alpha channel from app icon PNG                 |
| ITMS-90562 | Missing purpose string               | Add privacy permission strings                         |
| ITMS-90683 | Missing push entitlement             | Enable Push Notifications in App ID                    |
| ITMS-90704 | Missing required device capabilities | Check UIRequiredDeviceCapabilities                     |
| ITMS-91053 | Missing privacy manifest             | Add PrivacyInfo.xcprivacy to app bundle                |
| ITMS-91056 | Required reason API missing          | Declare API usage in privacy manifest                  |
| ITMS-91057 | Privacy manifest SDK mismatch        | Update third-party SDKs that require privacy manifests |

**BGTaskScheduler-specific rejection (Guideline 2.5.4):**

> "Your app uses background task scheduling but declares identifiers not present in the app binary."
> **Fix:** Ensure `BGTaskSchedulerPermittedIdentifiers` in Info.plist exactly matches identifiers registered with `BGTaskScheduler.register(forTaskWithIdentifier:)` in code.

---

## 9. Privacy Manifests (Required 2024+)

**Required since May 1, 2024** for all new app submissions and updates.
Missing `PrivacyInfo.xcprivacy` → ITMS-91053 rejection.

**File location:** Add to app target (not just as a resource, but as a source file):
`YourApp/PrivacyInfo.xcprivacy`

**Content structure:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>C617.1</string></array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>35F9.1</string></array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>CA92.1</string></array>
    </dict>
  </array>
</dict>
</plist>
```

**Required reason API categories (declare if your app or any SDK uses these):**

- `NSPrivacyAccessedAPICategoryFileTimestamp` — file timestamps
- `NSPrivacyAccessedAPICategorySystemBootTime` — `systemUptime`, `mach_absolute_time()`
- `NSPrivacyAccessedAPICategoryDiskSpace` — `volumeAvailableCapacityForImportantUsage`
- `NSPrivacyAccessedAPICategoryActiveKeyboards` — keyboard list
- `NSPrivacyAccessedAPICategoryUserDefaults` — `NSUserDefaults`

**SDK privacy manifests:** Firebase, Adjust, Amplitude, etc. all need their own privacy manifests.
If using CocoaPods: `pod install` aggregates them automatically in Xcode 15+.
In Expo: handled by the native SDK packages — keep dependencies updated.

---

## 10. In-App Purchase (StoreKit 2)

**StoreKit 2 (Swift, iOS 15+) — modern API:**

```swift
import StoreKit

// Fetch products
let products = try await Product.products(for: ["com.<project>.shield.annual"])

// Purchase
let result = try await product.purchase()
switch result {
case .success(let verification):
  let transaction = try checkVerified(verification)
  await transaction.finish()
case .pending: break // waiting for approval
case .userCancelled: break
}

// Restore purchases
for await result in Transaction.currentEntitlements {
  // handle restored purchases
}
```

**Subscription types:**

- Auto-renewable subscriptions → requires a subscription group
- Non-renewing subscriptions → one-time period
- Consumables → one-time purchase, can buy multiple times
- Non-consumables → buy once

**App Store Connect setup:**

1. Features → In-App Purchases → Create
2. Set price tier, availability, and localized display name
3. Submit for App Review (IAP reviewed separately from app)

**Testing:**

- Sandbox environment: use Apple ID sandbox testers (App Store Connect → Sandbox Testers)
- Sandbox subscriptions auto-renew much faster (1 month → 5 minutes)
- StoreKit Testing in Xcode: use `.storekit` configuration file (no Apple ID needed)

---

## 11. Firebase iOS Integration

**<project> Firebase:**

- Project: <gcp-project>-a98aa
- iOS App ID: `1:929418470411:ios:99e76d550aaf4eff1d130e`
- GoogleService-Info.plist location: `/c~/<project>-shield/GoogleService-Info.plist`

**GoogleService-Info.plist required fields:**

```xml
CLIENT_ID        ← Used for Google Sign-In
REVERSED_CLIENT_ID  ← Must be in app.json as URL scheme
BUNDLE_ID        ← Must match com.<project>.shield
GOOGLE_APP_ID    ← Firebase iOS App ID
GCM_SENDER_ID    ← For FCM (= project number 929418470411)
PROJECT_ID       ← <gcp-project>-a98aa
API_KEY          ← Firebase API key
```

**URL scheme requirement (REVERSED_CLIENT_ID):**
In app.json:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["com.googleusercontent.apps.929418470411-XXXXX"]
          }
        ]
      }
    }
  }
}
```

The REVERSED_CLIENT_ID is found in GoogleService-Info.plist.
**Without this, Google Sign-In silently fails on iOS.**

**FCM for iOS flow:**

1. App launches → registers for remote notifications
2. iOS returns APNs device token
3. Firebase swizzles and exchanges APNs token for FCM token
4. App receives FCM token → send to backend
5. Backend POSTs to FCM v1 API → Firebase routes to APNs → delivered

---

## 12. Google Sign-In iOS

**OAuth flow on iOS:**

1. User taps "Sign in with Google"
2. App presents Google auth in ASWebAuthenticationSession (in-app browser)
3. Google redirects to `REVERSED_CLIENT_ID://` URL scheme
4. App captures redirect → exchanges code for tokens
5. Firebase authenticates with Google credential

**Configuration in app.json for Expo:**

```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": "com.googleusercontent.apps.929418470411-XXXXX"
        }
      ]
    ]
  }
}
```

**iOS OAuth Client ID:** Found in Firebase Console → Project Settings → Your apps → iOS app
Different from the Android OAuth Client ID.

**Common iOS Google Sign-In failures:**

- `Error 400: redirect_uri_mismatch` → REVERSED_CLIENT_ID URL scheme not registered
- `Sign in was cancelled` → User dismissed; also can be incorrect URL scheme
- Silent failure after redirect → Missing CFBundleURLTypes in Info.plist
- Works in debug but not production → Wrong OAuth client ID for production certificate

---

## 13. Deep Links & Universal Links

**Universal Links (recommended for iOS 13+):**

- Requires apple-app-site-association (AASA) file at `https://yourdomain.com/.well-known/apple-app-site-association`
- App must have Associated Domains entitlement: `applinks:<project>.com`
- No browser redirect — deep link opens app directly

**AASA file format:**

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["LZT4U6348K.com.<project>.shield"],
        "components": [{ "/": "/ach/*", "comment": "ACH challenge links" }, { "/": "/guardian/*" }]
      }
    ]
  }
}
```

**Custom URL scheme (simpler, but less secure):**
`<project>://path?param=value`
Register in app.json:

```json
{ "expo": { "scheme": "<project>" } }
```

---

## 14. Performance & Crash Reporting

**Firebase Crashlytics (Expo):**

- `@react-native-firebase/crashlytics`
- Automatically captures crashes and non-fatal errors
- Custom logs: `crashlytics().log('ACH challenge presented')`
- User identification: `crashlytics().setUserId(userId)`
- View in Firebase Console → Crashlytics

**MetricKit (iOS 13+, native):**

- Provides hangs, crash logs, disk/battery reports
- Delivered to app once per 24h
- Useful for detecting background task failures

**React Native Performance:**

- Use Hermes engine (default in Expo SDK 48+): faster startup, lower memory
- Avoid `setState` in loops — batch updates
- Use `useMemo`/`useCallback` to prevent re-renders
- FlatList vs ScrollView: always FlatList for long lists (virtualized)
- Image caching: `expo-image` (LazyLoad, caching, progressive loading)
- Bundle size: `npx expo export --dump-assetmap` to audit

---

## 15. Common Submission Failures & Fixes

**"Missing Compliance" (Export compliance):**
Add to app.json:

```json
{ "expo": { "ios": { "infoPlist": { "ITSAppUsesNonExemptEncryption": false } } } }
```

**"Invalid binary" — simulator slice included:**
EAS Build automatically strips simulator slices for production builds.
If building locally: ensure `EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64` in build settings.

**"App uses undeclared API" (ITMS-90096):**
Search codebase for `UIDevice`, `system_profiler` calls, or private UIKit methods.
Firebase SDKs can trigger this — update to latest Firebase iOS SDK.

**BGTaskScheduler rejection (Guideline 2.5.4):**
Identifiers in `BGTaskSchedulerPermittedIdentifiers` must exactly match
what is passed to `BGTaskScheduler.register(forTaskWithIdentifier:)`.
No extra identifiers allowed.

**"Sign in with Apple required" rejection:**
Add Sign in with Apple as an option if Google Sign-In exists.
Expo: `expo-apple-authentication` package.

**Privacy manifest missing (ITMS-91053):**
Add PrivacyInfo.xcprivacy to Xcode target. In Expo: use a config plugin to inject it.

**"App references non-public symbols" (ITMS-90338):**
Usually from a third-party SDK. Update all native dependencies.

**TestFlight build in "Processing" state for >1 hour:**

- Usually a backend Apple issue; wait
- Check developer.apple.com/system-status/ for incidents
- If >3 hours, delete and re-upload

**App Review rejection: "Unable to reach backend":**
Ensure backend is live and accessible globally.
Check Cloud Run allows unauthenticated access on public API routes.
Provide working test credentials in review notes.

**Notarization-related issues (macOS builds only — not relevant for iOS):**
N/A for <project> Shield.
