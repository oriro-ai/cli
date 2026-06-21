# Android Expert Reference — Build to Launch

## Table of Contents

1. [Android Project Fundamentals](#1-android-project-fundamentals)
2. [Signing & Keystores](#2-signing--keystores)
3. [Play App Signing](#3-play-app-signing)
4. [SHA-1 Fingerprints & OAuth](#4-sha-1-fingerprints--oauth)
5. [Play Console Deep Dive](#5-play-console-deep-dive)
6. [Play Store Review & Policies](#6-play-store-review--policies)
7. [App Bundle (AAB) vs APK](#7-app-bundle-aab-vs-apk)
8. [FCM v1 API](#8-fcm-v1-api)
9. [Google Sign-In Android](#9-google-sign-in-android)
10. [Target SDK Requirements](#10-target-sdk-requirements)
11. [Background Processing](#11-background-processing)
12. [ProGuard / R8](#12-proguard--r8)
13. [Firebase Android Integration](#13-firebase-android-integration)
14. [Play Integrity API](#14-play-integrity-api)
15. [Common Android Submission Failures](#15-common-android-submission-failures)

---

## 1. Android Project Fundamentals

**versionCode rules:**

- Always an integer: 1, 2, 3...
- Must STRICTLY increase with every upload to Play Console
- Once uploaded, that versionCode can never be reused for that app
- EAS manages this via `android.versionCode` in app.json

**versionName rules:**

- Human-readable string: "2.3.0", "2.3.1"
- No strict requirement to increment (but should match marketing version)
- Shown to users in Play Store

**<project> Android current state:**

- versionCode 14 / v2.3.0 — under Play Store review
- versionCode 10 — currently active on devices
- Next build: versionCode 15 / v2.4.0

**Package name:** `com.<project>.shield` — permanent, never changes after first upload.
Changing package name = entirely new app listing with zero install base.

**Minimum SDK targets (2026):**

- `minSdkVersion`: 21 (Android 5.0) — covers 99%+ of active devices
- `targetSdkVersion`: 34 (Android 14) — **required by Google Play as of August 2024**
- `compileSdkVersion`: 35 (Android 15) — use latest

**Kotlin 2.0 highlights:**

- K2 compiler: 2x faster compilation
- `data class` copy with named arguments required
- Smart casts improved across function boundaries
- Compose: stable with Kotlin 2.0

---

## 2. Signing & Keystores

**Upload key vs App signing key:**
With Play App Signing (mandatory for AAB):

- **Upload key:** Used to sign AAB before uploading. Lives on your machine / EAS.
- **App signing key:** Managed by Google. Applied to the final APK delivered to devices.
- If you lose your upload key, you can register a new one in Play Console.
- The SHA-1 that matters for Google Sign-In is the **App signing key** SHA-1 (Google manages this).

**EAS manages signing automatically:**

- EAS generates and stores your upload keystore
- View keystore details: `eas credentials`
- SHA-1 of upload key (dev): `D6:04:59:BE:DC:0C:BC:0E:85:00:23:CA:A4:2B:F7:BE:1C:5D:C1:E4`
- SHA-1 of production key (Play App Signing): `41:35:AF:FE:B8:FE:BE:F9:DD:77:B4:61:05:BC:DA:7A:49:FC:F6:2B`

**Generating a keystore manually (if needed):**

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore <project>-upload-key.jks \
  -alias <project> \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Getting SHA-1 from keystore:**

```bash
keytool -list -v \
  -keystore <project>-upload-key.jks \
  -alias <project>
```

**CRITICAL:** Back up your keystore file + password + alias + alias password.
Without these you cannot update your app (you lose upload key recovery option).
EAS stores keystores in their secure vault — managed builds are backed up.

---

## 3. Play App Signing

**Mandatory since August 2021** for new apps using AAB format.

**Flow:**

```
You sign AAB with upload key
→ Upload to Play Console
→ Google verifies your signature
→ Google re-signs with app signing key
→ Distributed to users signed with Google's key
```

**Finding your App Signing Certificate SHA-1 (for OAuth):**

1. Play Console → Release → Setup → App signing
2. "App signing key certificate" section → SHA-1 certificate fingerprint
3. This is the value that goes into Google Cloud Console / Firebase for production OAuth

**<project> App Signing Key SHA-1:**
`41:35:AF:FE:B8:FE:BE:F9:DD:77:B4:61:05:BC:DA:7A:49:FC:F6:2B`

**Upload key reset (if lost):**

1. Play Console → App → Setup → App signing
2. Request upload key reset
3. Generate new keystore, sign a new AAB
4. Submit with new AAB — Google verifies identity via Play Developer account

---

## 4. SHA-1 Fingerprints & OAuth

**Two SHA-1 fingerprints for <project> Android:**

1. **Dev SHA-1** (for debug builds and EAS development profile):
   `D6:04:59:BE:DC:0C:BC:0E:85:00:23:CA:A4:2B:F7:BE:1C:5D:C1:E4`
   → Add to Firebase Android app → google-services.json regenerated

2. **Production SHA-1** (Play App Signing key — for Play Store builds):
   `41:35:AF:FE:B8:FE:BE:F9:DD:77:B4:61:05:BC:DA:7A:49:FC:F6:2B`
   → Add to Firebase Android app → google-services.json regenerated

**Both SHA-1s must be registered in Firebase** for Google Sign-In to work across dev and production builds.

**Firebase Console → Project Settings → Your apps → Android app:**

- Add both SHA-1 fingerprints
- Download updated google-services.json
- Commit to repo root

**OAuth flow with SHA-1:**
Android Google Sign-In verifies the APK signing certificate at runtime.
If the SHA-1 of the signing cert doesn't match what's registered in Firebase/OAuth Console,
sign-in fails with `DEVELOPER_ERROR` (error code 10).

**Error code 10 in Google Sign-In = SHA-1 mismatch.** Always the first thing to check.

**Firebase OAuth client ID for Android:**
`929418470411-ipdh7o4dp8fijjm7vbcmk43u03nnf1s7.apps.googleusercontent.com`

---

## 5. Play Console Deep Dive

**Account:** <email>
**App:** <project> Shield · Package: com.<project>.shield
**App ID:** 6099591004492585106

**Track types:**
| Track | Description | Review required |
|-------|-------------|-----------------|
| Internal testing | Up to 100 testers (by email) | No review, available in minutes |
| Closed testing (Alpha) | Up to ~thousand testers | Brief review (~hours) |
| Open testing (Beta) | Unlimited testers, opt-in | Brief review |
| Production | All users | Full review (~days) |

**Staged rollout:**

- Roll out to 1%, 5%, 10%, 20%, 50%, 100% of users
- Monitor crash rate and ANR rate before expanding
- Can halt rollout if issues detected
- <project>: start at 20% for new releases until stable

**Play Console review timeline:**

- Internal testing: minutes (no review)
- Closed/Open testing: a few hours to 1 day
- Production first release: 1-3 business days
- Production updates for established apps: hours to 1 day
- Post-rejection resubmission: same timeline

**Policy dashboard:** Play Console → Policy status → Review violations
**Pre-launch reports:** Automated Firebase Test Lab tests run on your AAB
**Android vitals:** Crash rate, ANR rate, battery, permissions

**AAB upload steps:**

1. Play Console → App → Release → Closed testing (or Internal testing)
2. Create new release
3. Upload AAB file
4. Fill "What's new in this release"
5. Review release → Save → Start rollout

**Version code error on upload:**

> "Version code X has already been used. Try another version code."
> Fix: increment versionCode in app.json and rebuild.

---

## 6. Play Store Review & Policies

**Critical policies for <project> (financial app):**

- **Financial services policy:** Apps offering banking/financial services must comply with local laws, display required disclosures, and not mislead users about financial products.
- **Personal data:** Declare all data collection in the Data Safety section.
- **Sensitive permissions:** CAMERA, CONTACTS, LOCATION, READ_CALL_LOG require prominent disclosure at runtime before requesting.

**Data Safety section (required since 2022):**

- Must declare all data types collected, whether shared with third parties, whether data can be deleted by user
- <project> data types: Name, Email, Phone number, Financial info (account numbers), Device identifiers
- Fill in Play Console → App content → Data safety

**Target audience:** If any content could appeal to children, must comply with Families Policy.
<project> target: adults only → confirm in Play Console → App content → Target audience.

**POST_NOTIFICATIONS permission (Android 13+):**
Must request at runtime — cannot assume it's granted.

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
  ActivityCompat.requestPermissions(
    this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
}
```

In Expo: `expo-notifications` handles this automatically.

**Permission best practices:**

- Request permissions at the moment they're needed (contextual)
- Never request all permissions at app launch
- Provide rationale before requesting (especially for sensitive permissions)
- Handle denial gracefully

**Common rejection reasons:**

- Missing privacy policy (must be accessible in-app AND in store listing)
- Missing data safety declaration
- Misleading app description
- Screenshot doesn't match actual app UI
- App requests permissions not needed for stated functionality
- Financial claims not substantiated (e.g., "guaranteed fraud protection")
- App crashes during Play review testing

---

## 7. App Bundle (AAB) vs APK

**Always use AAB for Play Store.** APKs are no longer accepted for new apps.

**AAB benefits:**

- Google optimizes delivery per device (only relevant code/resources)
- Smaller install size for users (20-50% reduction)
- Required for Play App Signing

**AAB structure:**

- `base/` — main app module
- `feature/` — optional dynamic feature modules
- Resources split by density, ABI, language

**EAS produces AAB** for the `production` profile automatically.
EAS produces APK for `preview` profile (for direct installation without Play Store).

**Local build (not EAS):**

```bash
cd android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

---

## 8. FCM v1 API

**Legacy HTTP API deprecated July 2024 — use v1 API only.**

**FCM v1 endpoint:**
`POST https://fcm.googleapis.com/v1/projects/{project_id}/messages:send`

**Auth:** OAuth 2.0 Bearer token using service account key (FIREBASE_SERVICE_ACCOUNT_KEY in GCP Secret Manager)

**Message structure (v1):**

```json
{
  "message": {
    "token": "device_fcm_token",
    "notification": {
      "title": "ACH Transfer Challenge",
      "body": "Tap the matching number"
    },
    "data": {
      "type": "ach_challenge",
      "challengeId": "uuid",
      "options": "[\"3\",\"7\",\"9\"]"
    },
    "android": {
      "priority": "high",
      "notification": {
        "channel_id": "ach_challenges",
        "sound": "default"
      }
    },
    "apns": {
      "headers": { "apns-priority": "10" },
      "payload": {
        "aps": {
          "sound": "default",
          "badge": 1,
          "content-available": 1
        }
      }
    }
  }
}
```

**Android notification channels (required Android 8.0+):**
Create channels at app startup:

```kotlin
val channel = NotificationChannel(
  "ach_challenges",
  "ACH Challenges",
  NotificationManager.IMPORTANCE_HIGH
).apply {
  description = "ACH transfer challenge notifications"
}
val notificationManager = getSystemService(NotificationManager::class.java)
notificationManager.createNotificationChannel(channel)
```

In Expo: configure in `app.json`:

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "androidCollapsedTitle": "<project>",
          "channels": [
            {
              "name": "ach_challenges",
              "importance": "max",
              "vibrationPattern": [0, 250, 250, 250]
            }
          ]
        }
      ]
    ]
  }
}
```

**Sending FCM from Next.js backend:**

```typescript
import { GoogleAuth } from "google-auth-library";

async function sendFCMNotification(token: string, data: object) {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    credentials: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!),
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/<gcp-project>-a98aa/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { token, ...data } }),
    },
  );
  return response.json();
}
```

---

## 9. Google Sign-In Android

**Error codes:**
| Code | Meaning | Fix |
|------|---------|-----|
| 10 (DEVELOPER_ERROR) | SHA-1 mismatch | Add both dev + prod SHA-1 to Firebase; download new google-services.json |
| 12500 | Sign-in failed | Check SHA-1 and OAuth client configuration |
| 12501 | Sign-in cancelled | User dismissed |
| 12502 | Sign-in currently in progress | Deduplicate calls |
| 7 | NETWORK_ERROR | No internet connection |

**SHA-1 is the #1 cause of DEVELOPER_ERROR (code 10).**

Diagnosis: `adb logcat | grep "Google Sign-In"` — look for "SHA-1 not registered"

**Expo/React Native Google Sign-In setup:**

```json
// app.json
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

```typescript
import { GoogleSignin } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  webClientId: "WEB_CLIENT_ID.apps.googleusercontent.com", // from Firebase Console
  offlineAccess: true,
});
```

**webClientId = Web client OAuth client ID**, NOT Android client ID.
Find in Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration.

---

## 10. Target SDK Requirements

**Google Play enforcement schedule:**
| Date | Requirement |
|------|-------------|
| August 2024 | New apps: targetSdkVersion ≥ 34 |
| November 2024 | Existing apps updates: targetSdkVersion ≥ 34 |
| 2025+ | ≥ 35 for new apps (Android 15) |

**Android 14 (API 34) behavior changes affecting <project>:**

- Foreground service types required (specify `android:foregroundServiceType`)
- `ACTION_SCHEDULE_EXACT_ALARM` permission requires user opt-in
- Photos/Media permissions split (partial access option)
- Health Connect for health data

**Android 15 (API 35) behavior changes:**

- Edge-to-edge display enforcement
- Health Connect permissions more granular
- Predictive back gesture default on

**In Expo (SDK 54), targetSdkVersion is set automatically.**
Verify in `android/build.gradle` (ejected) or let EAS manage it.

---

## 11. Background Processing

**WorkManager (recommended for most background work):**

```kotlin
// Kotlin
val workRequest = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
  .setConstraints(Constraints.Builder()
    .setRequiredNetworkType(NetworkType.CONNECTED)
    .build())
  .build()
WorkManager.getInstance(context).enqueueUniquePeriodicWork(
  "sync_guardian", ExistingPeriodicWorkPolicy.KEEP, workRequest)
```

In Expo/React Native: `expo-background-fetch` wraps this.

**Doze mode and App Standby:**

- Android 6+ throttles background processes when device is idle
- FCM high-priority messages bypass Doze
- WorkManager automatically handles Doze scheduling
- Battery optimization exemption: can request user to exempt your app (not automatic)

**Exact alarms (Android 12+):**

- `SCHEDULE_EXACT_ALARM` permission required for exact alarms
- Must show rationale and send user to settings if denied
- For most use cases, use `setAndAllowWhileIdle` or WorkManager instead

---

## 12. ProGuard / R8

**R8 (default in modern Android) replaces ProGuard:**

- Minification (removes unused code)
- Obfuscation (renames classes/methods)
- Optimization (inlines code, removes dead code)

**Enable in build.gradle (enabled by default in release builds):**

```groovy
buildTypes {
  release {
    minifyEnabled true
    shrinkResources true
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
  }
}
```

**Critical keep rules for <project>:**

```proguard
# Keep Firebase classes
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Keep React Native
-keep class com.facebook.react.** { *; }

# Keep Expo modules
-keep class expo.modules.** { *; }

# Keep data classes used with JSON parsing
-keep class com.<project>.** { *; }
-keepclassmembers class ** {
  @com.google.gson.annotations.SerializedName <fields>;
}
```

**EAS handles ProGuard configuration** for managed workflow.
For bare workflow: maintain `android/app/proguard-rules.pro`.

**Debugging ProGuard issues:**

- Use `mapping.txt` (generated with each release build) to de-obfuscate stack traces
- Upload `mapping.txt` to Play Console for automatic de-obfuscation in Android Vitals
- Firebase Crashlytics can also use mapping.txt for clear crash reports

---

## 13. Firebase Android Integration

**<project> Firebase:**

- Project: <gcp-project>-a98aa
- Android App ID: `1:929418470411:android:d88ddc48cf7656271d130e`
- google-services.json: in repo root

**google-services.json structure:**

```json
{
  "project_info": {
    "project_number": "929418470411",
    "project_id": "<gcp-project>-a98aa"
  },
  "client": [{
    "client_info": {
      "mobilesdk_app_id": "1:929418470411:android:d88ddc48cf7656271d130e",
      "android_client_info": {
        "package_name": "com.<project>.shield"
      }
    },
    "oauth_client": [{
      "client_id": "929418470411-ipdh7o4dp8fijjm7vbcmk43u03nnf1s7.apps.googleusercontent.com",
      "client_type": 1,
      "android_info": {
        "package_name": "com.<project>.shield",
        "certificate_hash": "SHA-1 goes here"
      }
    }],
    "services": {
      "appinvite_service": { ... }
    }
  }]
}
```

**After adding SHA-1 to Firebase → regenerate and re-download google-services.json.**
The file must be in the root of the Expo project (not android/ — EAS copies it).

---

## 14. Play Integrity API

**Replaces SafetyNet (deprecated November 2024).**
Use to verify: device integrity, app integrity, user license.

**Verdict types:**

- `MEETS_DEVICE_INTEGRITY` — device passes Android compatibility checks
- `MEETS_BASIC_INTEGRITY` — passes basic Android security checks
- `MEETS_STRONG_INTEGRITY` — certified hardware, bootloader locked

**For <project> (fintech):** Check `MEETS_BASIC_INTEGRITY` minimum before allowing ACH transactions.

**Implementation:**

```kotlin
val integrityManager = IntegrityManagerFactory.create(context)
val nonce = generateSecureNonce() // backend-generated
val integrityTokenResponse = integrityManager
  .requestIntegrityToken(IntegrityTokenRequest.builder()
    .setNonce(nonce)
    .setCloudProjectNumber(929418470411L)
    .build()).await()
// Send token to backend for verification
```

**Backend verification:**
POST to Google Play Integrity API → returns verdict.
Server-to-server verification using service account.

---

## 15. Common Android Submission Failures

**"You uploaded an APK or Android App Bundle that is not zip aligned":**
EAS handles this. If building locally: `zipalign -v -p 4 app.apk app-aligned.apk`

**"Your app targets an old version of Android":**
Increase `targetSdkVersion` to ≥ 34 in build.gradle or let EAS SDK 54 handle it.

**"This release is not compliant with the EU User Choice Billing policy":**
If operating in EU: must offer alternative billing options for subscriptions. <project>: not relevant for free app.

**"You need to publish to a restricted track first":**
For new accounts or apps: publish to internal testing first, then promote to production.

**"Sensitive permissions not declared":**
Add to Data Safety section in Play Console. Cannot just be in AndroidManifest.

**"Multiple DEX files define the same class":**
Dependency conflict in `build.gradle`. Use `exclude group:` to resolve.

**"App crashes on launch during pre-launch testing":**
Firebase Test Lab runs your app automatically. Common causes:

- Missing network permissions
- Missing google-services.json
- Unhandled exception on main thread at startup
- Native library not found

**versionCode not incrementing:**
Symptom: "Version code already uploaded"
Fix: `android.versionCode: <current + 1>` in app.json → EAS rebuild

**Google Sign-In fails in production but works in debug:**
Production SHA-1 (`41:35:AF...`) not added to Firebase.
Fix: Firebase Console → Android app → Add fingerprint → Download new google-services.json → commit → rebuild.

**"This app has not been reviewed yet":**
Normal for first closed testing release. Wait for review completion before promoting to production.
