---
watermark: ORIRO
name: mobile-pwa
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Mobile development and PWA — React Native, Expo, iOS/Android deployment,
  Progressive Web Apps, push notifications, and mobile-specific patterns.
  Activate for questions about building mobile apps, Expo/React Native,
  app store submission, PWA, or any mobile development question.
---

# Mobile Development and PWA

## React Native + Expo

### Why Expo

Write once, run on iOS + Android + Web. Managed workflow handles native build complexity.
Expo Go: Test instantly on device without building. Expo EAS Build: Build in cloud.

### Project structure

```
my-app/
├── app/           # Expo Router file-based navigation
│   ├── _layout.tsx
│   ├── index.tsx  # Home (/)
│   └── (tabs)/
│       ├── _layout.tsx
│       └── profile.tsx
├── components/    # Shared UI
├── hooks/         # Custom hooks
├── lib/           # Utilities, API clients
└── assets/        # Images, fonts
```

### Navigation (Expo Router — recommended)

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ... }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ... }} />
    </Tabs>
  );
}

// Navigate programmatically
import { router } from 'expo-router';
router.push('/profile');
router.replace('/login');
router.back();
```

### Core React Native components

```tsx
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// StyleSheet is more performant than inline styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", color: "#111" },
});
```

### Platform differences to watch

```tsx
import { Platform } from "react-native";

const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
    android: { elevation: 4 },
  }),
});
```

### Push notifications (Expo)

```ts
import * as Notifications from "expo-notifications";

// Request permission
const { status } = await Notifications.requestPermissionsAsync();

// Get push token (send to backend to store)
const token = await Notifications.getExpoPushTokenAsync({
  projectId: Constants.expoConfig.extra.eas.projectId,
});

// Handle notification when app is open
Notifications.addNotificationReceivedListener((notification) => {
  console.log(notification);
});
```

## App Store Deployment

### iOS (App Store)

**Requirements:** Apple Developer account ($99/year), Xcode, provisioning profiles.
**Build:** `eas build --platform ios` or `eas build --platform all`
**Submit:** `eas submit --platform ios` or via App Store Connect manually.
**Review:** 1-5 business days typical. Screenshots for all device sizes required.
**Key metadata:** App name, subtitle, description, keywords (100 char limit, comma-separated), categories.

### Android (Google Play)

**Requirements:** Google Play Console account ($25 one-time), AAB (Android App Bundle) not APK.
**Build:** `eas build --platform android`
**Submit:** `eas submit --platform android` or via Google Play Console.
**Review:** Few hours to days. Less strict than iOS typically.
**Staged rollout:** Release to 1%, 5%, 10%, 20%, 50%, 100% of users progressively.

### eas.json configuration

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

## Progressive Web Apps (PWA)

### What makes a PWA

**Service Worker:** Background JavaScript that enables offline capability, caching, push notifications.
**Web App Manifest:** JSON file making the app installable.
**HTTPS:** Required for service workers and many PWA features.
**Responsive design:** Works on all screen sizes.

### Manifest (manifest.json)

```json
{
  "name": "My App",
  "short_name": "MyApp",
  "description": "Description",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker caching strategies

**Cache First:** Check cache, then network if not found. Good for static assets.
**Network First:** Try network, fall back to cache. Good for API calls.
**Stale While Revalidate:** Return cached immediately, update in background.

**Next.js PWA:** Use `next-pwa` package. Handles service worker generation automatically.

## Mobile-specific design patterns

**Touch targets:** Minimum 44×44 points (iOS) / 48×48 dp (Android). Larger than desktop buttons.
**Safe areas:** iPhone notch/home indicator, Android status bar. Use SafeAreaView.
**Keyboard avoidance:** KeyboardAvoidingView wraps forms so keyboard doesn't cover inputs.
**Haptic feedback:** `expo-haptics` for physical feedback on interactions.
**Offline first:** Design for intermittent connectivity. TanStack Query + MMKV persistence.

Sources: Expo documentation (docs.expo.dev — free), React Native docs (reactnative.dev — free), Apple Human Interface Guidelines (free), Material Design guidelines (free), web.dev PWA docs (free)
