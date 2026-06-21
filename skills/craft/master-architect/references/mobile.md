# Mobile Development Reference

## FRAMEWORK SELECTION

```
React Native + Expo:  ✓ JS/TS team, fast iteration, large ecosystem, good for B2B/SaaS
                      ✓ <user>'s current choice (<project> Shield)
                      ✗ Performance-intensive apps, deep native APIs

Flutter:              ✓ Best cross-platform UI fidelity, fast rendering (Skia/Impeller)
                      ✓ Single codebase for iOS/Android/Web/Desktop
                      ✗ Dart learning curve, smaller ecosystem than RN

Swift (iOS native):   ✓ Best iOS performance, all native APIs, latest Apple features
                      ✗ iOS-only, no code sharing with Android

Kotlin (Android):     ✓ Best Android performance, all native APIs, Jetpack Compose
                      ✗ Android-only

Decision rule:        Solo founder + existing JS/TS codebase → React Native + Expo
                      UI-intensive product (games, complex animations) → Flutter
                      Enterprise iOS-first → SwiftUI
```

---

## REACT NATIVE + EXPO (Primary Stack)

### Project Setup (Production Grade)

```bash
# New project with Expo SDK 51+
npx create-expo-app@latest MyApp --template
cd MyApp

# Essential packages
npx expo install expo-router          # File-based routing (like Next.js)
npx expo install expo-secure-store    # Secure token storage (not AsyncStorage)
npx expo install expo-notifications   # Push notifications
npx expo install expo-updates         # OTA updates

# EAS Setup
npm install -g eas-cli
eas build:configure                   # Creates eas.json
eas credentials                       # Sets up signing certs
```

### eas.json (Production Config)

```json
{
  "cli": { "version": ">= 9.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" },
      "ios": { "simulator": false }
    }
  },
  "submit": {
    "production": {
      "android": { "serviceAccountKeyPath": "./service-account.json", "track": "production" },
      "ios": { "appleId": "...", "ascAppId": "..." }
    }
  }
}
```

### Navigation (Expo Router — App Directory Pattern)

```
app/
  _layout.tsx          ← Root layout (providers, global styles)
  (auth)/
    _layout.tsx         ← Auth stack
    login.tsx
    signup.tsx
  (tabs)/
    _layout.tsx         ← Tab navigator
    index.tsx           ← Home tab
    dashboard.tsx
    settings.tsx
  modal.tsx             ← Modal screen
```

### Secure Storage (Never Use AsyncStorage for Sensitive Data)

```typescript
import * as SecureStore from "expo-secure-store";

// Store token — encrypted at rest using device keychain/keystore
await SecureStore.setItemAsync("auth_token", token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});

// Retrieve
const token = await SecureStore.getItemAsync("auth_token");

// NEVER: AsyncStorage for tokens — it's plaintext on disk
```

### State Management (2024 Best Practice)

```typescript
// Server state: TanStack Query (React Query)
import { useQuery, useMutation } from "@tanstack/react-query";

function TransactionList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["transactions", userId],
    queryFn: () => api.getTransactions(userId),
    staleTime: 30_000, // 30s before refetch
    retry: 3,
  });
}

// Global client state: Zustand (not Redux)
const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    { storage: createJSONStorage(() => AsyncStorage) },
  ),
);
```

### Performance — Critical Rules

```typescript
// 1. Memoize everything that crosses a component boundary
const Component = React.memo(({ data }) => ...)
const handlePress = useCallback(() => ..., [deps])
const computed = useMemo(() => expensiveCompute(data), [data])

// 2. FlashList over FlatList for lists >100 items
import { FlashList } from '@shopify/flash-list'
<FlashList data={items} renderItem={renderItem} estimatedItemSize={70} />

// 3. Lazy load heavy screens
const HeavyScreen = React.lazy(() => import('./HeavyScreen'))

// 4. Image optimization — always
import { Image } from 'expo-image'  // Not React Native's Image
<Image source={{ uri }} contentFit="cover" transition={200} />

// 5. Hermes engine — always enabled (default in Expo SDK 48+)
// 6. New Architecture (Fabric + JSI) — enable in app.json for new projects
```

### Push Notifications (Expo + FCM/APNs)

```typescript
// Register device token
const token = await Notifications.getExpoPushTokenAsync({
  projectId: Constants.expoConfig.extra.eas.projectId,
});
await api.saveDeviceToken(userId, token.data);

// Handle notifications while app is open
Notifications.addNotificationReceivedListener((notification) => {
  // Update UI, show badge, etc.
});

// Handle notification tap (background/killed state)
Notifications.addNotificationResponseReceivedListener((response) => {
  const screen = response.notification.request.content.data.screen;
  router.push(screen); // Deep link to relevant screen
});
```

### OTA Updates (Critical for SaaS)

```typescript
// expo-updates — push JS bundle updates without App Store review
// Fixes bugs, updates content, tweaks UI — instantly

import * as Updates from "expo-updates";

async function checkForUpdate() {
  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync(); // Restart app with new bundle
  }
}

// EAS Update channels: development → staging → production
// eas update --branch production --message "Fix crash on login"
```

### App Store Submission Checklist

```
Android (Play Store):
  □ AAB built with eas build --platform android --profile production
  □ Version code incremented (autoIncrement: true in eas.json)
  □ All permissions declared in AndroidManifest.xml with justification
  □ Target SDK = current year's API level (required)
  □ Privacy policy URL in store listing
  □ Content rating questionnaire complete
  □ Screenshots: phone + 7-inch tablet
  □ eas submit --platform android

iOS (App Store):
  □ IPA built with eas build --platform ios --profile production
  □ Bundle version / build number incremented
  □ All NSUsageDescription strings in Info.plist (camera, location, etc.)
  □ Privacy manifest (PrivacyInfo.xcprivacy) — required since 2024
  □ App Tracking Transparency (ATT) prompt if using IDFA
  □ Screenshots: 6.7" + 6.5" + iPad (if iPad supported)
  □ TestFlight tested by 5+ internal testers
  □ eas submit --platform ios
```

---

## SWIFT / SWIFTUI (iOS Native)

### Modern SwiftUI Patterns

```swift
// MVVM with @Observable (iOS 17+ — modern approach)
@Observable class TransactionViewModel {
    var transactions: [Transaction] = []
    var isLoading = false
    var error: Error?

    func fetchTransactions(userId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            transactions = try await api.getTransactions(userId: userId)
        } catch {
            self.error = error
        }
    }
}

struct TransactionListView: View {
    @State private var viewModel = TransactionViewModel()

    var body: some View {
        List(viewModel.transactions) { tx in
            TransactionRow(transaction: tx)
        }
        .task { await viewModel.fetchTransactions(userId: currentUserId) }
        .overlay { if viewModel.isLoading { ProgressView() } }
    }
}
```

### Networking (Modern Swift Concurrency)

```swift
struct APIClient {
    private let session = URLSession.shared

    func get<T: Decodable>(_ path: String, as type: T.Type) async throws -> T {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(AuthManager.shared.token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw APIError.httpError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }
        return try JSONDecoder.iso8601Full.decode(T.self, from: data)
    }
}
```

### Security (iOS)

```swift
// Keychain for sensitive data (NOT UserDefaults)
import Security

func saveToKeychain(key: String, value: String) throws {
    let data = Data(value.utf8)
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: key,
        kSecValueData as String: data,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ]
    SecItemDelete(query as CFDictionary)
    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else { throw KeychainError.saveFailed(status) }
}

// Biometric auth
let context = LAContext()
context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
    localizedReason: "Authenticate to view transactions") { success, error in ... }
```

---

## KOTLIN / JETPACK COMPOSE (Android Native)

### Modern Architecture (MVVM + StateFlow)

```kotlin
// ViewModel with Kotlin Coroutines
@HiltViewModel
class TransactionViewModel @Inject constructor(
    private val repository: TransactionRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<TransactionUiState>(TransactionUiState.Loading)
    val uiState: StateFlow<TransactionUiState> = _uiState.asStateFlow()

    init { loadTransactions() }

    private fun loadTransactions() {
        viewModelScope.launch {
            repository.getTransactions()
                .catch { e -> _uiState.value = TransactionUiState.Error(e.message ?: "Error") }
                .collect { transactions -> _uiState.value = TransactionUiState.Success(transactions) }
        }
    }
}

// Compose UI
@Composable
fun TransactionScreen(viewModel: TransactionViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when (val state = uiState) {
        is Loading -> CircularProgressIndicator()
        is Success -> LazyColumn {
            items(state.transactions, key = { it.id }) { TransactionItem(it) }
        }
        is Error -> ErrorView(state.message, onRetry = viewModel::loadTransactions)
    }
}
```

### Secure Storage (Android Keystore)

```kotlin
// EncryptedSharedPreferences — backed by Android Keystore
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val prefs = EncryptedSharedPreferences.create(
    context,
    "secure_prefs",
    masterKey,
    AES256_SIV,   // key encryption
    AES256_GCM    // value encryption
)
prefs.edit().putString("auth_token", token).apply()
```

---

## FLUTTER (Cross-Platform)

### Architecture (BLoC Pattern — Production Standard)

```dart
// BLoC: Business Logic Component separates UI from state
class TransactionBloc extends Bloc<TransactionEvent, TransactionState> {
  final TransactionRepository _repo;

  TransactionBloc(this._repo) : super(TransactionInitial()) {
    on<LoadTransactions>(_onLoad);
  }

  Future<void> _onLoad(LoadTransactions event, Emitter<TransactionState> emit) async {
    emit(TransactionLoading());
    try {
      final transactions = await _repo.getAll(userId: event.userId);
      emit(TransactionLoaded(transactions));
    } catch (e) {
      emit(TransactionError(e.toString()));
    }
  }
}

// UI
BlocBuilder<TransactionBloc, TransactionState>(
  builder: (context, state) => switch(state) {
    TransactionLoading() => const CircularProgressIndicator(),
    TransactionLoaded(transactions: var txs) => TransactionList(txs),
    TransactionError(message: var msg) => ErrorView(msg),
    _ => const SizedBox.shrink(),
  },
)
```

### Flutter Performance

```dart
// const constructors wherever possible — prevents rebuilds
const Padding(padding: EdgeInsets.all(16), child: MyWidget())

// ListView.builder for any list — never ListView with children: [...]
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) => ItemTile(items[index]),
)

// RepaintBoundary for complex widgets that shouldn't repaint with parent
RepaintBoundary(child: ComplexChart())

// Isolates for CPU-intensive work (parsing, crypto, image processing)
final result = await compute(parseJsonInBackground, rawJson)
```

---

## MOBILE SECURITY BASELINE

```
Storage:          Keychain (iOS) / Keystore (Android) / SecureStore (Expo)
                  NEVER: UserDefaults, SharedPreferences, AsyncStorage for tokens

Transport:        TLS 1.3. Certificate pinning for high-security apps.
                  iOS: ATS enforced. Android: network_security_config.xml

Auth tokens:      Short-lived JWT (1h) + refresh in secure storage
                  Biometric unlock for refresh token access

Root/Jailbreak:   Detect with SafetyNet/Play Integrity (Android) + jailbreak checks (iOS)
                  Warn user. Block for financial apps.

Code obfuscation: R8/ProGuard (Android) — always in production
                  iOS: binary is compiled, harder to reverse, but still obfuscate strings

Screenshot:       FLAG_SECURE (Android) / preventScreenCapture (iOS) for sensitive screens

API keys:         Never in mobile app bundle — even "private" ones get extracted
                  All secrets → your backend → mobile calls your backend
```
