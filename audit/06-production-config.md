# Phase 6 — Production Config Check

---

## PROD-01 — `minifyEnabled false` and `shrinkResources false` in Release Build (**HIGH**)

**File:** `android/app/build.gradle:53-54`

```groovy
release {
    signingConfig signingConfigs.release
    minifyEnabled false
    shrinkResources false
    proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
}
```

**Impact:**
- **`minifyEnabled false`**: JavaScript code is not minified/obfuscated. The full readable source (compiled via Hermes, but still) is included in the APK. The hardcoded API keys (Gemini, Cloudinary, Razorpay) remain plainly readable via APK decompilation tools.
- **`shrinkResources false`**: Unused resources (images, drawables from dependencies) are included in the APK, inflating the size unnecessarily. Estimated APK bloat: 5–15 MB for a React Native app.
- **ProGuard rules file is referenced but `minifyEnabled false` means it's never run.**

**Fix:**
```groovy
release {
    minifyEnabled true
    shrinkResources true
    proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
}
```
Ensure `proguard-rules.pro` keeps React Native and Firebase classes. Standard RN ProGuard config is available from the RN docs.

---

## PROD-02 — `versionCode 1` — Never Incremented (**HIGH for Play Store**)

**File:** `android/app/build.gradle:17-18`

```groovy
versionCode 1
versionName "1.0"
```

Play Store requires `versionCode` to increase monotonically with each upload. Uploading multiple times with `versionCode 1` will be rejected after the first upload. If a rollback APK was uploaded before, subsequent uploads will fail.

**Fix:** Increment `versionCode` before each Play Store upload. Consider automating with `git rev-list --count HEAD` or a CI variable. Update `versionName` to reflect the semantic version (e.g., `"1.0.1"`).

---

## PROD-03 — Release Signing Config Uses Undefined Variables (**HIGH — Build Risk**)

**File:** `android/app/build.gradle:38-42`

```groovy
release {
    storeFile file(MYAPP_UPLOAD_STORE_FILE)
    storePassword MYAPP_UPLOAD_STORE_PASSWORD
    keyAlias MYAPP_UPLOAD_KEY_ALIAS
    keyPassword MYAPP_UPLOAD_KEY_PASSWORD
}
```

These variables are expected in `android/gradle.properties`. UNKNOWN whether this file exists and contains correct values. If it doesn't, `gradlew assembleRelease` will throw `Could not find property 'MYAPP_UPLOAD_STORE_FILE'`.

**Verify manually:**
1. Check `android/gradle.properties` for these 4 keys
2. Verify the `.jks` or `.keystore` file at the path exists
3. Confirm the keystore is backed up in a secure location (losing the keystore = can never update the app on Play Store)

---

## PROD-04 — No JavaScript Error Boundary Component (**HIGH**)

**File:** `App.tsx` (missing)

The app has no React Error Boundary wrapping the component tree. Any unhandled JS render error (e.g., accessing `.map()` on undefined, rendering an unexpected null value) will crash the entire app with a red screen in dev and a white blank screen in production.

Crashlytics is initialized (`crashlytics().log('CineLink App started')`) but only in non-dev mode. However, Crashlytics' automatic JS crash capture for React Native requires either:
1. A custom `ErrorBoundary` component that calls `crashlytics().recordError(error)`, or
2. The `@react-native-firebase/crashlytics` handler being set for unhandled promise rejections

Neither is currently configured.

**Fix:** Add an error boundary:
```tsx
class AppErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = {hasError: false};
  static getDerivedStateFromError() { return {hasError: true}; }
  componentDidCatch(error: Error) {
    if (!__DEV__) crashlytics().recordError(error);
  }
  render() {
    if (this.state.hasError) {
      return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <Text style={{color:'#fff'}}>Something went wrong. Please restart the app.</Text>
      </View>;
    }
    return this.props.children;
  }
}
```
Wrap `<AppErrorBoundary>` around the `<GestureHandlerRootView>` in App.tsx.

---

## PROD-05 — Crashlytics Only Logs App Start, Does Not Capture JS Errors (**MEDIUM**)

**File:** `App.tsx:261`

```tsx
if (!__DEV__) crashlytics().log('CineLink App started');
```

This logs a breadcrumb but does not set up any error reporting pipeline. Async errors in event handlers (`sendPost`, `applyNow`, `uploadImage`) are only caught by `try/catch` and logged to `console.log` — they never reach Crashlytics.

**Fix:**
1. Add the error boundary (PROD-04).
2. Add a global unhandled rejection handler:
```tsx
// In App.tsx useEffect on mount
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  if (!__DEV__) crashlytics().recordError(error);
  originalHandler(error, isFatal);
});
```

---

## PROD-06 — AndroidManifest Permissions (**LOW — Clean**)

**File:** `android/app/src/main/AndroidManifest.xml`

Only `INTERNET` is declared in the app's manifest. Camera, storage, notification permissions are added by native modules automatically. This is clean.

- `android:allowBackup="false"` ✅ — prevents Android backup of potentially sensitive local data
- `android:launchMode="singleTask"` ✅ — correct for deep link handling

**No issues found.**

---

## PROD-07 — Firebase BOM Version is Not Latest (**LOW**)

**File:** `android/app/build.gradle:84`

```groovy
implementation platform('com.google.firebase:firebase-bom:32.7.0')
```

Current version at time of audit: `33.x.x`. Version 32.7.0 is from early 2024. Not a security risk with Firebase BOM (it's a version manager, not a security-sensitive package), but newer versions include performance improvements and bug fixes.

**Recommendation:** Update to `33.x.x` when doing the next native build cycle.

---

## PROD-08 — Firestore Rules Deployment Status Unknown (**UNKNOWN — Verify Manually**)

No `.firebaserc` or `firebase.json` deployment timestamp is visible in the source. The rules in `firestore.rules` may or may not be the currently deployed version.

**Verify manually:**
1. `firebase deploy --only firestore:rules` from the project root
2. Check Firebase Console → Firestore → Rules → "Published" timestamp matches latest changes

---

## Summary Table

| ID | File | Severity | Issue |
|----|------|----------|-------|
| PROD-01 | android/app/build.gradle:53-54 | HIGH | minifyEnabled false, shrinkResources false |
| PROD-02 | android/app/build.gradle:17-18 | HIGH | versionCode 1, never incremented |
| PROD-03 | android/app/build.gradle:38-42 | HIGH | Release signing vars existence unverified |
| PROD-04 | App.tsx (missing) | HIGH | No JS Error Boundary |
| PROD-05 | App.tsx:261 | MEDIUM | Crashlytics not capturing JS errors |
| PROD-06 | AndroidManifest.xml | LOW | Clean — no issues |
| PROD-07 | android/app/build.gradle:84 | LOW | Firebase BOM version outdated |
| PROD-08 | firestore.rules | UNKNOWN | Rules deployment status unverified |
