# Expo / EAS Expert Reference — SDK 54 Build to Launch

## Table of Contents

1. [Expo SDK 54 Overview](#1-expo-sdk-54-overview)
2. [EAS Build Configuration (eas.json)](#2-eas-build-configuration-easjson)
3. [app.json Complete Reference](#3-appjson-complete-reference)
4. [EAS Build — Profiles & Triggers](#4-eas-build--profiles--triggers)
5. [EAS Submit — App Store & Play Store](#5-eas-submit--app-store--play-store)
6. [EAS Update (OTA)](#6-eas-update-ota)
7. [Config Plugins](#7-config-plugins)
8. [Native Modules & expo-modules](#8-native-modules--expo-modules)
9. [Secrets Management in EAS](#9-secrets-management-in-eas)
10. [Common EAS Build Errors & Fixes](#10-common-eas-build-errors--fixes)
11. [Common EAS Submit Errors & Fixes](#11-common-eas-submit-errors--fixes)
12. [Dependency Compatibility Matrix](#12-dependency-compatibility-matrix)
13. [Development Workflow](#13-development-workflow)
14. [<project> Specific Fixes](#14-<project>-specific-fixes)

---

## 1. Expo SDK 54 Overview

**SDK 54 highlights (released Feb 2026):**

- React Native 0.76
- Hermes engine default (cannot opt out)
- New Architecture (Fabric + JSI) opt-in stable
- `expo-router` v4 (file-based routing)
- `expo-sqlite` v15 with full synchronous and async APIs
- `expo-camera` v15 with new Vision Camera API
- `expo-notifications` v0.29 — improved background handling
- `expo-dev-client` v4 — stable
- Dropped support for Android API < 23

**Breaking changes from SDK 53→54:**

- `expo-av` fully replaced by `expo-video` and `expo-audio`
- `expo-modules-core` requires minimum iOS 16
- `SplashScreen.preventAutoHideAsync()` → must call `SplashScreen.setOptions()` first
- `expo-font` async loading API changed

**Hermes engine:** Enabled by default in SDK 48+.
Benefits: faster startup (~2x), lower memory, better GC.
`console.log` in production now works in LogBox; remove before release.

**New Architecture (Fabric):**
Opt-in in SDK 54 — stable but not all third-party libraries support it.
Enable in app.json: `"newArchEnabled": true` (Android) — test thoroughly before enabling.
For <project>: keep disabled until all native dependencies confirmed compatible.

---

## 2. EAS Build Configuration (eas.json)

**<project> eas.json (complete production-ready config):**

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      },
      "env": {
        "APP_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk"
      },
      "env": {
        "APP_ENV": "staging"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium",
        "image": "latest"
      },
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "<email>",
        "ascAppId": "6762309517",
        "appleTeamId": "LZT4U6348K"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**`appVersionSource: "remote"`** — versionCode and buildNumber are managed by EAS servers, auto-incrementing. Recommended for production.

**`autoIncrement: true`** — auto-increments versionCode/buildNumber on each production build. Use with `appVersionSource: remote`.

**Resource classes:**

- `m-medium`: 4 vCPU, 8GB RAM — default, sufficient for <project>
- `m-large`: 8 vCPU, 16GB RAM — for very large apps or slow builds
- iOS builds require macOS workers (m-medium = Apple Silicon M1)

---

## 3. app.json Complete Reference

**<project> app.json (production-ready):**

```json
{
  "expo": {
    "name": "<project> Shield",
    "slug": "<project>-shield",
    "version": "2.3.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "scheme": "<project>",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0A1C48"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.<project>.shield",
      "buildNumber": "15",
      "googleServicesFile": "./GoogleService-Info.plist",
      "usesAppleSignIn": true,
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "UIBackgroundModes": ["fetch", "processing", "remote-notification"],
        "BGTaskSchedulerPermittedIdentifiers": ["com.<project>.shield.refresh"],
        "NSCameraUsageDescription": "Used to scan QR codes for UPI payments",
        "NSFaceIDUsageDescription": "Used to authenticate your identity securely",
        "NSContactsUsageDescription": "Used to quickly find contacts for payments"
      }
    },
    "android": {
      "package": "com.<project>.shield",
      "versionCode": 14,
      "googleServicesFile": "./google-services.json",
      "permissions": [
        "CAMERA",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT"
      ],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0A1C48"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-camera",
        { "cameraPermission": "Allow <project> to access your camera to scan QR codes." }
      ],
      ["expo-local-authentication"],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3B82F6",
          "sounds": ["./assets/notification.wav"],
          "androidCollapsedTitle": "<project> Alert",
          "iosDisplayInForeground": true
        }
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": "com.googleusercontent.apps.929418470411-REPLACE_WITH_REVERSED_CLIENT_ID"
        }
      ],
      "expo-apple-authentication"
    ],
    "extra": {
      "eas": {
        "projectId": "EXPO_PROJECT_ID"
      }
    }
  }
}
```

**Key fields:**

- `scheme`: URL scheme for deep links (`<project>://`)
- `userInterfaceStyle`: "light" | "dark" | "automatic"
- `supportsTablet`: false for phone-only app
- `ITSAppUsesNonExemptEncryption: false` — avoids US export compliance questionnaire if no custom crypto
- `buildNumber` is a **string** (iOS), `versionCode` is a **number** (Android)

---

## 4. EAS Build — Profiles & Triggers

**Build commands:**

```bash
# Production iOS (App Store submission)
eas build --platform ios --profile production

# Production Android (AAB for Play Store)
eas build --platform android --profile production

# Both platforms simultaneously
eas build --platform all --profile production

# Preview APK (internal testing without Play Store)
eas build --platform android --profile preview

# Development build with expo-dev-client
eas build --platform ios --profile development
eas build --platform android --profile development

# Check build status
eas build:list

# Cancel a build
eas build:cancel BUILD_ID
```

**Build queues:**

- Free tier: serial queue, potentially long wait
- Priority builds: available on paid plans (EAS $19/mo Starter or higher)
- Typical build time: iOS 10-20 min, Android 8-15 min

**Build artifacts:**

- iOS production: `.ipa` file → directly submittable to App Store Connect
- Android production: `.aab` file → directly submittable to Play Console
- Android preview: `.apk` file → install directly on device

**Artifact URLs:** Available in EAS Dashboard and printed in CLI output.
<project> versionCode 14 AAB: `https://expo.dev/artifacts/eas/4wJ3M2VNwNco4YYjrQQNkL.aab`
<project> build 15 IPA: `https://expo.dev/artifacts/eas/3K9FQFpKJRxJyxybuH9a9Z.ipa`

**Build logs:**

```bash
eas build:view BUILD_ID
# or open in browser:
# https://expo.dev/accounts/<project>/projects/<project>-shield/builds/BUILD_ID
```

---

## 5. EAS Submit — App Store & Play Store

**iOS submission:**

```bash
# Submit latest build
eas submit --platform ios --latest

# Submit specific build
eas submit --platform ios --id BUILD_ID

# Submit local IPA
eas submit --platform ios --path ./app.ipa
```

**EAS Submit requires ASC API Key (not Apple ID + password):**

1. App Store Connect → Users and Access → Integrations → App Store Connect API
2. Generate key with App Manager role
3. Download .p8 file (one-time download!)
4. Run: `eas credentials` → iOS → App Store Connect API Key → Add new

**iOS submission flow:**

1. EAS validates IPA against App Store requirements
2. Uploads to App Store Connect using ASC API
3. Build appears in TestFlight section (takes 5-30 min to process)
4. Select build for external TestFlight testing or App Store release

**Android submission:**

```bash
# Submit latest AAB
eas submit --platform android --latest

# Submit to specific track
eas submit --platform android --latest --android-package com.<project>.shield
```

**Android requires Google Play service account:**

1. Play Console → Setup → API access → Link to Google Cloud project
2. Google Cloud Console → Create service account
3. Grant roles: Release Manager + Storage Admin
4. Download service account JSON key
5. Add to `eas.json`: `"serviceAccountKeyPath": "./google-play-service-account.json"`
6. Add to `.gitignore` — never commit this file

**Submission status:**

```
https://expo.dev/accounts/<project>/projects/<project>-shield/submissions/SUBMISSION_ID
```

**<project> iOS submission (failed) — check:**
`https://expo.dev/accounts/<project>/projects/<project>-shield/submissions/595e31cf`

---

## 6. EAS Update (OTA)

**OTA updates — what can be updated:**

- JavaScript bundle
- Assets (images, fonts, JSON)
- Any non-native code

**What CANNOT be updated via OTA:**

- Native module additions/removals
- app.json changes requiring native rebuild
- New permissions
- New SDK features requiring native code

**Commands:**

```bash
# Push OTA update to production channel
eas update --channel production --message "Fix: ACH challenge timer"

# Push to staging
eas update --channel staging --message "Testing new UPI flow"

# List updates
eas update:list

# Rollback to previous update
eas update:rollback --channel production
```

**Channel configuration in app.json:**

```json
{
  "expo": {
    "runtimeVersion": {
      "policy": "sdkVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/YOUR_PROJECT_ID",
      "enabled": true,
      "fallbackToCacheTimeout": 0
    }
  }
}
```

**Runtime version:** Must match between the running app and the OTA update.
`sdkVersion` policy: runtime version = Expo SDK version (safest, updates only delivered to compatible builds)

**OTA in code (expo-updates):**

```typescript
import * as Updates from "expo-updates";

async function checkForUpdate() {
  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync(); // restart app with new bundle
  }
}
```

---

## 7. Config Plugins

**What config plugins do:**
Modify native iOS/Android project files without ejecting to bare workflow.
Runs during `eas build` (prebuild phase).

**Common config plugins for <project>:**

```json
{
  "plugins": [
    "expo-camera",
    "expo-local-authentication",
    ["expo-notifications", { ... }],
    ["@react-native-google-signin/google-signin", { ... }],
    "expo-apple-authentication",
    ["expo-build-properties", {
      "android": {
        "compileSdkVersion": 35,
        "targetSdkVersion": 34,
        "minSdkVersion": 23,
        "kotlinVersion": "1.9.24"
      },
      "ios": {
        "deploymentTarget": "16.0"
      }
    }]
  ]
}
```

**Writing custom config plugins:**

```typescript
// plugins/withPrivacyManifest.ts
import { ConfigPlugin, withInfoPlist } from "expo/config-plugins";

const withPrivacyManifest: ConfigPlugin = (config) => {
  return withInfoPlist(config, (config) => {
    // Modify Info.plist
    return config;
  });
};
export default withPrivacyManifest;
```

**`expo-build-properties`** — most commonly needed plugin to set Android/iOS build settings.
Install: `npx expo install expo-build-properties`

**Prebuild (generate native code without building):**

```bash
npx expo prebuild --clean
# Generates android/ and ios/ folders
# DO NOT commit these if using managed workflow
```

---

## 8. Native Modules & expo-modules

**Modules removed from <project> Shield (incompatible):**

- `react-native-ble-plx` — BLE (incompatible with SDK 54 managed workflow)
- `react-native-mmkv` — fast key-value storage (requires bare workflow)
- `react-native-tts` — text-to-speech (not needed)
- `react-native-permissions` — replaced by built-in expo permission APIs
- `react-native-reanimated` — removed; use `react-native-reanimated` v3+ with config plugin if needed
- `react-native-gesture-handler` — use with reanimated; add as config plugin
- `react-native-worklets` — incompatible

**Expo SDK 54 equivalents:**
| Removed | Use instead |
|---------|-------------|
| react-native-ble-plx | expo-bluetooth (experimental) or remove BLE features |
| react-native-mmkv | expo-secure-store or AsyncStorage |
| react-native-permissions | expo-camera, expo-location built-in permission APIs |
| react-native-reanimated | Install v3 + add to plugins |

**Adding react-native-reanimated properly (if needed):**

```bash
npx expo install react-native-reanimated
```

Then add to babel.config.js:

```javascript
module.exports = { plugins: ["react-native-reanimated/plugin"] };
```

And app.json plugins: `"react-native-reanimated"` (as config plugin).

**Checking module compatibility:**
https://reactnative.directory — search any module
https://expo.dev/go — Expo Go supported packages
https://www.npmjs.com/package/expo-modules-core — SDK compatibility matrix

---

## 9. Secrets Management in EAS

**EAS secrets (stored securely, injected at build time):**

```bash
# Set a secret
eas secret:create --scope project --name API_KEY --value "your-value"

# List secrets
eas secret:list

# Delete a secret
eas secret:delete --id SECRET_ID
```

**Types:**

- **Project secrets:** Available to all builds for this project
- **Account secrets:** Available to all projects under this Expo account

**Using secrets in code:**

```typescript
// Secrets are injected as environment variables at build time
const apiKey = process.env.API_KEY;

// In app.json, expose them:
{
  "expo": {
    "extra": {
      "apiKey": process.env.API_KEY
    }
  }
}

// In code:
import Constants from 'expo-constants';
const apiKey = Constants.expoConfig?.extra?.apiKey;
```

**Secret precedence:** eas.json `env` → EAS project secrets → EAS account secrets

**Never put secrets in app.json directly** — these are bundled into the app binary and visible to anyone who decompiles the APK/IPA.
Use EAS secrets for: API keys, backend URLs, Firebase config overrides.

---

## 10. Common EAS Build Errors & Fixes

**"No Expo project found":**
Run `eas init` in the project root to link with Expo account.
Or check `extra.eas.projectId` in app.json is correct.

**"Unable to find module 'X'":**
Module not installed or incompatible with current SDK.
Fix: `npx expo install X` (uses compatible version)
Never use `npm install X` for Expo modules — always `npx expo install`.

**iOS build: "No matching provisioning profiles found":**
Fix via `eas credentials` → iOS → reset credentials and let EAS generate new ones.
Or in App Store Connect: revoke expired provisioning profiles and regenerate.

**iOS build: "Xcode build failed":**
Check build logs: `eas build:view BUILD_ID`
Common causes:

- Missing config plugin configuration
- Incompatible native module version
- Info.plist key conflict between plugins
- Swift version mismatch

**Android build: "AAPT2 error":**
Usually a resource conflict or missing drawable.
Fix: ensure all icon assets exist at correct sizes.
Adaptive icon: 108×108 dp (432×432 px for xxxhdpi)

**Android build: "Duplicate class":**
Two dependencies include the same class.
Fix in app.json plugins/expo-build-properties:

```json
[
  "expo-build-properties",
  {
    "android": {
      "packagingOptions": {
        "pickFirst": ["**/libc++_shared.so"]
      }
    }
  }
]
```

**"Build queue timeout":**
EAS free tier has build time limits. Upgrade or retry.
Use `--no-wait` flag to submit build without waiting in CLI.

**"google-services.json not found":**
File must be in Expo project root (not android/ subfolder).
app.json: `"android": { "googleServicesFile": "./google-services.json" }`

**"GoogleService-Info.plist not found":**
File must be in Expo project root.
app.json: `"ios": { "googleServicesFile": "./GoogleService-Info.plist" }`

**Build succeeds but app crashes on launch:**

- Check EAS Build logs for any warning about incompatible modules
- Common cause: Hermes engine incompatibility with a native module
- Test with development build first: `eas build --profile development`

---

## 11. Common EAS Submit Errors & Fixes

**iOS: "No Apple ID credentials found":**
Run `eas credentials` → iOS → App Store Connect API Key → add credentials.
Do not use Apple ID + password for 2FA accounts — use ASC API key instead.

**iOS: "The bundle 'com.<project>.shield' is not available":**
App not created in App Store Connect yet.
Fix: Create app in App Store Connect first, then submit.

**iOS: "App Store Connect operation error" (generic):**
Check Apple system status: developer.apple.com/system-status/
If Apple services are degraded, wait and retry.

**iOS: "Invalid Bundle. The bundle does not support the minimum OS version":**
Update `ios.deploymentTarget` in expo-build-properties plugin.

**iOS: "Missing compliance" error:**
Add to app.json: `"ITSAppUsesNonExemptEncryption": false`
Rebuild and resubmit.

**iOS: BGTaskScheduler rejection (Guideline 2.5.4):**
This is an App Review rejection, not a submission error.
`BGTaskSchedulerPermittedIdentifiers` in Info.plist must exactly match registered identifiers in code.
Check: app.json → `BGTaskSchedulerPermittedIdentifiers` matches `BackgroundFetch.registerTaskAsync()` task name.

**iOS: "Sign in with Apple required":**
If Google Sign-In is present, Apple Sign-In must also be present.
Install `expo-apple-authentication` and add flow.

**Android: "No service account key found":**
Place `google-play-service-account.json` in project root (gitignored).
Update eas.json: `"serviceAccountKeyPath": "./google-play-service-account.json"`

**Android: "Version code already used":**
Increment versionCode in app.json and rebuild before submitting.

**Android: "Package name mismatch":**
Package in AAB must match Play Console app registration: `com.<project>.shield`.

**Submission 595e31cf (current iOS failure):**
Check: `https://expo.dev/accounts/<project>/projects/<project>-shield/submissions/595e31cf`
Most likely causes given build history:

1. BGTaskScheduler identifier mismatch
2. Sign in with Apple missing
3. Privacy manifest missing (ITMS-91053)
4. Missing REVERSED_CLIENT_ID URL scheme for Google Sign-In

---

## 12. Dependency Compatibility Matrix

**SDK 54 confirmed compatible packages:**
| Package | Version | Notes |
|---------|---------|-------|
| expo | ~54.0.0 | |
| react-native | 0.76.x | |
| expo-camera | ~15.0.0 | |
| expo-local-authentication | ~15.0.0 | |
| expo-notifications | ~0.29.0 | |
| expo-secure-store | ~14.0.0 | |
| expo-updates | ~0.27.0 | |
| expo-router | ~4.0.0 | |
| expo-build-properties | ~0.13.0 | |
| expo-apple-authentication | ~7.0.0 | |
| @react-native-firebase/app | ~21.x | |
| @react-native-firebase/messaging | ~21.x | |
| @react-native-google-signin/google-signin | ~13.x | |

**Install compatible versions:**

```bash
npx expo install expo-camera expo-notifications expo-local-authentication
```

Always use `npx expo install` — it automatically selects SDK-compatible versions.

**Checking for outdated packages:**

```bash
npx expo-doctor
# or
npx expo install --check
```

---

## 13. Development Workflow

**Daily development cycle:**

```bash
# Start dev server
npx expo start

# Start with specific options
npx expo start --clear  # clear cache
npx expo start --tunnel  # use ngrok tunnel (for physical devices on different network)

# Open in simulator
npx expo start --ios    # iOS simulator
npx expo start --android  # Android emulator

# Run on physical device
# Install Expo Go or dev client → scan QR code
```

**Development client vs Expo Go:**

- **Expo Go:** Sandboxed, limited native modules, good for prototyping
- **expo-dev-client:** Full native module support, required for <project> (Firebase, Google Sign-In, etc.)

**Build and test on device (without EAS):**

```bash
# Build locally (requires Xcode/Android Studio)
npx expo run:ios
npx expo run:android

# EAS development build (no local Xcode needed)
eas build --profile development --platform ios
# Install dev client IPA on device → start Expo server → connect
```

**Clearing caches (when things go wrong):**

```bash
npx expo start --clear
npx expo install --fix  # Fix version mismatches
rm -rf node_modules && npm install
cd ios && pod install && cd ..  # Re-install iOS pods (bare workflow)
```

---

## 14. <project> Specific Fixes

**iOS submission 595e31cf failure — systematic fix checklist:**

1. **Check exact error in submission details** at expo.dev link
2. **BGTaskScheduler fix (most likely):**
   - Verify `BGTaskSchedulerPermittedIdentifiers` in app.json InfoPlist
   - Ensure exactly one identifier: `"com.<project>.shield.refresh"`
   - Verify same string is used in background task registration code
3. **Privacy manifest check:**
   - Ensure `PrivacyInfo.xcprivacy` is added via config plugin
   - If not present, add `expo-privacy-manifest` plugin or custom config plugin
4. **Sign in with Apple:**
   - `expo-apple-authentication` must be installed AND functional in app
   - `usesAppleSignIn: true` in app.json is not enough — actual sign-in flow must exist
5. **Rebuild after fix:**
   ```bash
   # Increment buildNumber in app.json (15 → 16)
   eas build --platform ios --profile production
   eas submit --platform ios --latest
   ```

**Google Sign-In fix for versionCode 14 (Android):**

- Both SHA-1 fingerprints are in Firebase (confirmed)
- versionCode 14 build uses production SHA-1
- Once Play Store approves and tester installs: test Google Sign-In
- If Error 10 (DEVELOPER_ERROR) still occurs: download fresh google-services.json from Firebase

**ACH Shield Unit.co webhook in app:**
App receives FCM push with challenge data:

```typescript
const challengeData = {
  challengeId: remoteMessage.data.challengeId,
  options: JSON.parse(remoteMessage.data.options), // ["3", "7", "9"]
  expiresAt: remoteMessage.data.expiresAt,
  amount: remoteMessage.data.amount,
};
// Navigate to ACH challenge screen with this data
```

**UPI daily limit tracker:**

- Backend: `GET /api/upi/daily-limit` returns `{ used: number, limit: 10000, currency: 'INR' }`
- Stored in DB per user per UTC day
- Reset at midnight UTC (not IST — careful with timezone)
- For IST midnight reset: use Cloud Scheduler with IST timezone (Asia/Kolkata)

**Unit.co SANDBOX → PRODUCTION switch (before public launch):**

1. Unit.co dashboard: switch org to production mode
2. Get production UNIT_API_KEY JWT
3. Update in GCP Secret Manager: `gcloud secrets versions add UNIT_API_KEY --data-file=...`
4. Redeploy all 3 regions
5. Test with a real bank account before any user-facing launch
