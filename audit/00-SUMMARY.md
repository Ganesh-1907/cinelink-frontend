# CineLink Production Readiness Audit — Summary

**Audit Date:** 2026-06-18  
**Auditor:** Claude Code  
**Scope:** Security, Firestore rules, crash safety, navigation, performance, production config

---

## Full Issue Table (Critical → Low)

| # | Issue | Severity | File | One-Line Fix |
|---|-------|----------|------|--------------|
| 1 | Gemini API key hardcoded in source + git history | **CRITICAL** | AIAssistantScreen.tsx:8, QuickPostScreen.tsx:10 | Rotate key NOW; move calls to backend Cloud Function |
| 2 | No JS Error Boundary in App | **CRITICAL** | App.tsx (missing) | Add `class AppErrorBoundary extends React.Component` wrapping GestureHandlerRootView |
| 3 | `route.params` destructured without guard (crash on bad nav) | **HIGH** | PublicProfileScreen.tsx:21, ChatScreen.tsx:25 | Use `route?.params?.userId` with early return |
| 4 | `uploadToCloudinary` returns `undefined` on failure | **HIGH** | ProfileScreen.tsx:188, ChatScreen.tsx:300, HomeScreen.tsx:747, CastingRequestScreen.tsx:65 | Check `if (!data.secure_url) throw` before using URL |
| 5 | Razorpay test key hardcoded | **HIGH** | PaymentScreen.tsx:12 | Move to backend; client only gets `order_id` from server |
| 6 | Cloudinary unsigned preset (anyone can upload to your account) | **HIGH** | 7 files | Add format/size restrictions in Cloudinary dashboard |
| 7 | No secrets management — all config in source | **HIGH** | All files | Add `react-native-config` + `.env` + `.gitignore` |
| 8 | No pagination on any Firestore query | **HIGH** | HomeScreen, BrowseAuditionsScreen, ChatListScreen, NotificationsScreen | Add `.limit(20)` + `startAfter()` pagination |
| 9 | Cloudinary images loaded at full resolution | **HIGH** | All image screens | Append `w_600,f_auto,q_auto` to Cloudinary URLs |
| 10 | `minifyEnabled false`, `shrinkResources false` in release | **HIGH** | android/app/build.gradle:53-54 | Set both to `true`; verify ProGuard rules |
| 11 | `versionCode 1` — never incremented | **HIGH** | android/app/build.gradle:17 | Increment before every Play Store submission |
| 12 | Release signing variables — existence unverified | **HIGH** | android/app/build.gradle:38-42 | Verify `gradle.properties` and keystore backup |
| 13 | `pushNotifications` collection fully open to all auth users | **HIGH** | firestore.rules:238-240 | `allow read, write: if false` (legacy collection) |
| 14 | ReelsScreen navigates to unregistered `'UploadReels'` screen | **HIGH** | ReelsScreen.tsx:150, 238 | Register screen in App.tsx or delete unused file |
| 15 | `audition.directorId` used without null guard | **MEDIUM** | AuditionDetailScreen.tsx:153 | Add `if (!audition?.directorId) return` |
| 16 | setState after unmount in async upload functions | **MEDIUM** | ProfileScreen, AuditionDetailScreen, HomeScreen | Add `isMounted` ref pattern |
| 17 | `Animated.Value` in `useState` body (not lazy) | **MEDIUM** | PublicProfileScreen.tsx:45-46 | Use `useRef(new Animated.Value(0)).current` |
| 18 | `notifications` create rule allows any user to fake notification type | **MEDIUM** | firestore.rules:145-146 | Add `type in [allowed-types]` validation |
| 19 | `savedAuditions` create does not validate `userId` ownership | **MEDIUM** | firestore.rules:200 | Add `request.resource.data.userId == request.auth.uid` |
| 20 | `connectionRequests` create does not validate `fromUserId` | **MEDIUM** | firestore.rules:248 | Add `request.resource.data.fromUserId == request.auth.uid` |
| 21 | `payments` create: any user can fake payment records | **MEDIUM** | firestore.rules:155 | Move payment writes to Cloud Function webhook |
| 22 | NotificationsScreen navigates to ChatScreen without chatId guard | **MEDIUM** | NotificationsScreen.tsx:165 | Guard `if (!item.chatId \|\| !item.senderId) return` |
| 23 | FlatList `renderMessage` not stable — all cells re-render | **MEDIUM** | ChatScreen.tsx:357 | Wrap in `useCallback` or extract to `React.memo` component |
| 24 | No `React.memo` on `ProfileCard`, `AuditionCard`, `PostBubble` | **MEDIUM** | HomeScreen.tsx:235, 280, 365 | Move outside component; wrap with `React.memo` |
| 25 | PostBubble creates live Firestore listener per post | **MEDIUM** | HomeScreen.tsx:375-387 | Lazy-load comments only when `showComments === true` |
| 26 | Crashlytics does not capture JS errors | **MEDIUM** | App.tsx:261 | Add `ErrorUtils.setGlobalHandler` + boundary `recordError` |
| 27 | Admin email hardcoded in client + Firestore rules | **MEDIUM** | 4 files + rules | Use Firebase custom claims (`admin: true`) |
| 28 | ChatListScreen uses implicit tab navigation from stack | **LOW** | ChatListScreen.tsx:254 | Use `navigation.navigate('Main', {screen: 'Home'})` |
| 29 | Hardware back does not clear typingUser in ChatScreen | **LOW** | ChatScreen.tsx | Add `beforeRemove` listener to clear typing state |
| 30 | ContestDetailScreen calls `navigation.goBack()` in mount effect | **LOW** | ContestDetailScreen.tsx:40 | Defer with `setTimeout` or use `navigation.replace` |
| 31 | No Firestore document size validation (messages, comments) | **LOW** | firestore.rules | Add `text.size() < 2000` checks to write rules |
| 32 | `isApprovedDirector()` rule does a Firestore read per operation | **LOW** | firestore.rules:11-13 | Move to custom claim |
| 33 | Inline arrow functions in list renders | **LOW** | HomeScreen.tsx | Wrap with `useCallback` |
| 34 | 9 concurrent skeleton animation loops on load | **LOW** | HomeScreen.tsx:63-79 | Share single shimmer value from SkeletonCard parent |
| 35 | Firebase BOM 32.7.0 — outdated | **LOW** | android/app/build.gradle:84 | Upgrade to 33.x.x on next native build |
| 36 | Firestore rules deployment status unknown | **UNKNOWN** | firestore.rules | Run `firebase deploy --only firestore:rules`; verify in console |

---

## Fix This Before Play Store Upload — Top 10 Checklist

| Priority | Action | Why |
|----------|--------|-----|
| **1** | Rotate the Gemini API key (`AIzaSyDGlDTjjUg…`) at Google Cloud Console | It's in git history permanently; the current key is compromised |
| **2** | Set `minifyEnabled true` and `shrinkResources true` in `build.gradle` | Play Store submission without minification is a security/size risk |
| **3** | Increment `versionCode` (must be > any previously uploaded value) | Play Store rejects duplicate versionCode |
| **4** | Verify release keystore exists and is backed up securely | Losing the keystore = permanently unable to update on Play Store |
| **5** | Add an `AppErrorBoundary` around the app | Any render crash shows blank screen with no recovery path |
| **6** | Add Cloudinary upload restrictions (max size, allowed formats) | Unsigned preset + exposed cloud name = anyone can fill your storage |
| **7** | Add `.limit(20)` to HomeScreen auditions, films, contests queries | Without limits, 1,000 auditions × daily active users destroys Firestore quota |
| **8** | Fix `route.params` null guards in `PublicProfileScreen` and `ChatScreen` | Deep-link notification opens these screens without params → instant crash |
| **9** | Fix `uploadToCloudinary` to throw on missing `secure_url` | Silent failures write `undefined` URLs to Firestore; images fail to load for all users |
| **10** | Deploy `firestore.rules` and verify the deployed version is current | Rules in source ≠ rules in production until deployed |

---

## Launch Readiness Score

> **4 / 10**

The core product flows (auth, auditions, chat, contests) work correctly and the Firestore security rules are largely well-designed. However, a hardcoded API key that is already in git history is a **must-fix before any public launch** — it poses immediate financial risk. Three additional HIGH issues (no error boundary, no pagination, minify disabled) make the app fragile and expensive to operate at even modest scale. Resolving the Top 10 checklist items above would bring the score to approximately 7.5/10.

---

*All findings are based on static code analysis. Items marked UNKNOWN require manual verification in the Firebase/Play Console.*
