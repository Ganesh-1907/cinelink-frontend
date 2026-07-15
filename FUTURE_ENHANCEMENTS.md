# 🚀 CineLink — Future Enhancement Roadmap

> Based on the full codebase analysis (see CINELINK_ANALYSIS.md)

---

## How to Read This Document

Each section is organized by **priority**. Start with Phase 1 (must-fix security & stability), then Phase 2 (architecture), then Phase 3 (features & scale).

**Time estimates are intentionally not given.** Every app is different — focus on the order, not the duration.

---

## Phase 1 — 🔴 Critical Fixes (Must Do First)

### 1.1 Move All Secrets Out of Source Code

**Problem**: API keys, OAuth IDs, Cloudinary preset, and Razorpay keys are hardcoded in 10+ files and committed to git.

**What to do**:
1. Create a `.env` file and use `react-native-config` to inject at build time
2. Remove all hardcoded secrets from source files
3. Add `.env` to `.gitignore` immediately
4. Rotate the compromised keys (Gemini API key, Cloudinary preset, Razorpay key)

**Files affected**: `QuickPostScreen.tsx`, `AuthScreen.tsx`, `PaymentScreen.tsx`, `razorpaySubscriptionService.ts`, all screens with `CLOUD_NAME`/`UPLOAD_PRESET`

### 1.2 Implement Razorpay Webhook (Server-Side Payment Verification)

**Problem**: After payment, the client writes directly to Firestore. No server-side webhook verifies the Razorpay payment signature.

**What to do**:
1. Add a new Cloud Function: `handleRazorpayWebhook`
2. Verify Razorpay webhook signature using `crypto.createHmac('sha256', secret)`
3. On `payment.captured` event → write to `payments/{paymentId}` + update `contestEntries`
4. On `subscription.charged` event → update `users/{uid}` premium fields
5. Update Firestore rules to **block all client writes** to `payments`, `subscriptions`, `users/*/premiumTier`, `users/*/premiumExpiry`
6. Remove the client-side payment success write logic

### 1.3 Secure Cloudinary Uploads

**Problem**: Upload preset is unsigned. Anyone can upload files to your Cloudinary bucket.

**What to do**:
1. Switch from unsigned to **signed upload preset** in Cloudinary dashboard
2. Create a Cloud Function: `getCloudinarySignature` that returns a signed upload signature
3. Client requests signature before each upload
4. Add Cloudinary URL validation in Firestore rules (or trust the signed upload)

### 1.4 Add Server-Side Rate Limiting

**Problem**: All spam prevention is in `utils/spamPrevention.ts` — entirely client-side and trivially bypassable.

**What to do**:
1. Move rate limiting to **Firestore rules** using `get()` to check document counts
2. Alternative: Create a Cloud Function middleware for write operations
3. Keep the client-side checks as UX (show user-friendly messages) but **enforce server-side**
4. Store rate limit config in a `config/rateLimits` Firestore document so it can be updated without app releases

### 1.5 Add Error Boundaries

**Problem**: No error boundaries anywhere. One React crash = white screen.

**What to do**:
1. Create a reusable `ErrorBoundary` component (class component with `componentDidCatch`)
2. Wrap the root navigator, individual tab screens, and high-risk screens (Chat, Reels, AI Assistant)
3. Show a friendly fallback UI with a "Retry" button instead of white screen
4. Log errors to Crashlytics

---

## Phase 2 — 🟠 Architecture Improvements

### 2.1 Add a Backend API Layer

**Problem**: The app is 100% client-side Firestore. No input validation, no business logic, no audit trails server-side.

**What to do**:
1. Create a dedicated backend (Node.js/Express or continue with Cloud Functions)
2. Move ALL write operations behind Cloud Functions (Firebase Callable Functions)
3. Firestore rules become defense-in-depth (redundant) rather than primary security
4. Benefits: input validation, business logic, audit logs, future flexibility

**Alternative (lighter approach)**: Keep Firestore direct reads but wrap all **writes** in Callable Functions. This handles the critical security gap without rewriting the entire data layer.

### 2.2 Implement Global State Management

**Problem**: Every screen fetches its own data. No caching, re-fetches on every navigation, Firestore read costs are high.

**What to do**:
1. Add **Zustand** (lightweight) or **React Context** (simpler) for global state
2. Cache the current user object, role, premium status — these are read by almost every screen
3. Cache common reference data (categories, tags, config)
4. Reduce Firestore read costs by 40-60%

### 2.3 Add Real Pagination Everywhere

**Problem**: Most screens load entire collections at once.

**What to do**:
1. Use Firestore `limit()` + `startAfter()` cursor pagination on:
   - `HomeScreen` (auditions, films, contests)
   - `BrowseAuditionsScreen`
   - `BrowseContestsScreen`
   - `BrowseProjectsScreen`
   - `NotificationsScreen`
   - `ChatScreen` (messages — paginate upward from latest)
2. Add infinite scroll with `FlatList.onEndReached`
3. Page size: 10-20 items per page

### 2.4 Fix the Crew Search (Full Collection Scan)

**Problem**: `CrewScreen` fetches ALL users then filters client-side. Won't work at scale.

**What to do**:
1. Add a **Firestore composite index** for search fields (name, role, bio)
2. Use `array-contains` or `>=/<=` queries on indexed fields instead of client-side filtering
3. Alternative: Use **Algolia** or **Typesense** for full-text search if text search across fields is needed
4. Add `where('isVisible', '==', true)` to exclude hidden/private profiles

### 2.5 Implement Push Notification Delivery

**Problem**: FCM tokens are stored but no Cloud Function sends push notifications.

**What to do**:
1. Create a Cloud Function: `sendPushNotification` triggered by Firestore writes to `notifications/{notifId}`
2. Read recipient's FCM token from `users/{uid}/fcmToken`
3. Send via `admin.messaging().sendEachForMulticast()`
4. Handle token expiry (remove invalid tokens on 404 response)
5. Support notification types: message, audition status, contest updates, follow, etc.

### 2.6 Add Offline Support

**Problem**: App shows blank/loading states without internet.

**What to do**:
1. Enable Firestore offline persistence: `firebase.firestore().settings({ persistence: true })`
2. Cache user profile, feed data, and chat messages locally
3. Show cached data immediately, update from server when online
4. Add a "You're offline" banner component

---

## Phase 3 — 🟡 Feature & UX Hardening

### 3.1 Move Hardcoded Content to Firestore

**Problem**: Industry guides, onboarding slides, spam rules, premium pricing, filter tags are all hardcoded.

**What to do**: Create a Firestore `config` collection with documents:

| Document | Fields | Used By |
|----------|--------|---------|
| `config/industryGuide` | Role-wise tips (5 roles x ~20 tips) | IndustryGuideScreen |
| `config/onboarding` | Slide titles, descriptions, images | OnboardingScreen |
| `config/premiumPlans` | Tier names, prices, features, Razorpay plan IDs | PremiumCineLinkScreen |
| `config/rateLimits` | Max auditions/day, films/day, cooldowns | Rate limiting system |
| `config/categories` | Audition categories, role tags, filter options | Multiple screens |
| `config/reportReasons` | Report reason options | ReportModal |

### 3.2 Add Real User Search (Algolia / Typesense)

**Problem**: Current user search is a full collection scan with client-side filtering.

**What to do**:
1. Integrate **Algolia** (SaaS) or **Typesense** (self-hosted/open-source) for full-text search
2. Sync `users` collection to Algolia via Cloud Function (`onWrite` trigger)
3. Search by name, role, location, bio with typo-tolerance
4. Apply to: Crew search, audition search, user discovery

### 3.3 Improve the Payment / Premium System

**What to do**:
1. Implement the Razorpay webhook (see 1.2)
2. Move premium plan pricing to Firestore (see 3.1)
3. Add subscription management (cancel, upgrade/downgrade, reactivate)
4. Add subscription history / receipts screen
5. Add free trial period logic
6. Set proper plan IDs for production in Cloud Function env vars (not hardcoded)

### 3.4 Add Analytics & Monitoring

**What to do**:
1. Add **Firebase Analytics** events for key actions:
   - Sign up, login, post audition, apply, enter contest, send message, purchase premium
2. Track screen views for usage patterns
3. Set up **Crashlytics** custom keys/user ID for crash attribution
4. Create a **Cloud Monitoring** dashboard for Cloud Function performance
5. Set up budget alerts for Firestore/Cloudinary/Gemini API costs

### 3.5 Add Admin Dashboard (Web)

**Problem**: Admin functions are limited to the mobile app.

**What to do**:
1. Create a web admin dashboard (React or vanilla HTML/JS via Firebase Hosting)
2. Features:
   - User management (search, ban, role changes)
   - Report management (view, action, dismiss)
   - Content moderation (auditions, films, contests, comments)
   - Verification request approvals
   - Analytics overview (users, content, payments)
   - Config editor (industry guide, rate limits, premium plans)

### 3.6 Performance Optimizations

**What to do**:
1. Enable **Hermes** (React Native JS engine) for faster startup and lower memory
2. Enable **ProGuard/R8** minification for Android release builds
3. Lazy-load screens with `React.lazy()` or `React.Suspense`
4. Memoize expensive components with `React.memo` and `useMemo`
5. Optimize Cloudinary images with transformation parameters (`w_400,q_auto,f_auto`)
6. Add image caching with `fast-image` or Cloudinary URL-based caching
7. Reduce listener count — consolidate multiple `onSnapshot` calls into fewer queries

### 3.7 TypeScript & Code Quality

**What to do**:
1. Enable `strict: true` in `tsconfig.json` and fix all type errors
2. Add proper TypeScript interfaces for all Firestore document types (many are `any` currently)
3. Set up ESLint + Prettier pre-commit hooks (Husky + lint-staged)
4. Add unit tests for utility functions (`spamPrevention.ts`, `contestUtils.ts`)
5. Add integration tests for critical user flows (auth, audition, payment)
6. Remove all `console.log` statements from production code

---

## Phase 4 — 🔵 Scalability & Production Readiness

### 4.1 Firestore Cost Optimization

**Problem**: Real-time listeners on every screen + full collection scans = high Firestore read costs at scale.

**What to do**:
1. Implement pagination everywhere (see 2.3)
2. Reduce listener count — use `get()` (one-time reads) for rarely-changing data, `onSnapshot` only for real-time needs (chat, notifications)
3. Use Firestore `select()` to fetch only needed fields
4. Add a Cloud Function to aggregate view counts/likes periodically (instead of real-time writes)
5. Set up Firestore usage alerts at 50%/75%/90% of budget

### 4.2 Security Hardening

**What to do**:
1. Add Firestore rules tests (use `@firebase/rules-unit-testing`)
2. Add `request.resource.size` limits to all collections (prevent 10MB document abuse)
3. Add field-level validation in Firestore rules (required fields, field types, string length limits)
4. Implement **Firebase App Check** to block requests from unauthorized apps
5. Add **reCAPTCHA** for auth operations (phone login, signup)
6. Set up Firebase Auth quota alerts
7. Review and restrict Firestore indexes (remove unused ones, add missing ones)

### 4.3 MovieDetails / TMDB Integration

**Problem**: `MovieDetails.tsx` screen exists but appears to have no TMDB API calls.

**What to do**:
1. Decide if this feature is needed or remove the dead screen
2. If keeping: add TMDB API integration with a Cloud Function proxy (to hide API key)
3. Add search, trending, and movie detail endpoints

### 4.4 CI/CD Pipeline

**What to do**:
1. Set up **GitHub Actions** (or similar) for:
   - Lint check on PR
   - TypeScript type-check
   - Unit + integration tests
   - Build APK/IPA on merge to main
   - Deploy Cloud Functions on merge to main
2. Add **Fastlane** for automated app store deployment (internal testing → production)
3. Add **EAS Build** (Expo Application Services) or CodePush for over-the-air updates

### 4.5 User Feedback Loop

**What to do**:
1. Replace the basic feedback modal with a structured system:
   - Star rating + optional comment
   - Screen-specific feedback tagging
   - Bug report with device info and screenshot
2. Store feedback in Firestore with device metadata
3. Set up email alerts for critical bug reports
4. Add an in-app changelog / what's new screen

---

## Phase 5 — 🎯 New Features (If Needed)

### 5.1 Video Calls / Virtual Auditions

- Integrate **LiveKit**, **Agora**, or **Daily.co** for video calls
- Directors can conduct live virtual auditions
- Record and store audition videos

### 5.2 Portfolio Showreels

- Allow users to compile a showreel from their uploaded reels/films
- Shareable showreel links (web preview)
- View count analytics for showreels

### 5.3 AI-Powered Features

- **AI Resume Builder** — Generate professional acting/directing resumes
- **Script Analysis** — Upload a script, get feedback from Gemini
- **Audition Match** — AI matches actors to auditions based on profile
- **Content Moderation** — Auto-flag inappropriate content using Gemini

### 5.4 Social Features

- **Industry News Feed** — Curated news from Indian cinema
- **Events Calendar** — Film festivals, workshops, networking events
- **Groups/Communities** — Language/city/role-based groups
- **Collaboration Requests** — Post project needs with specific skill tags

### 5.5 Monetization Expansion

- **Featured Listings** — Paid promotion for auditions and projects
- **In-App Advertising** — Targeted ads for film schools, equipment rentals
- **Commission on Contest Entry Fees** — Platform takes a percentage
- **Verified Badge Paid Tier** — Separate from premium, one-time verification fee

---

## Summary: Suggested Priority Order

```
Week 1-2:   Phase 1 (Critical Fixes)
              → 1.1 Secrets management
              → 1.2 Razorpay webhook
              → 1.3 Secure Cloudinary
              → 1.5 Error boundaries

Week 3-4:   Phase 1 continued + Phase 2 start
              → 1.4 Server-side rate limiting
              → 2.4 Fix crew search
              → 2.5 Push notifications

Month 2:    Phase 2 (Architecture)
              → 2.1 Backend API layer (writes via Cloud Functions)
              → 2.2 Global state management
              → 2.3 Pagination everywhere
              → 2.6 Offline support

Month 3:    Phase 3 (Feature Hardening)
              → 3.1 Move hardcoded content to Firestore
              → 3.2 Real user search (Algolia)
              → 3.3 Improve payments
              → 3.6 Performance optimizations
              → 3.7 Code quality

Month 4+:   Phase 4 + Phase 5
              → 4.1 Cost optimization
              → 4.2 Security hardening
              → 4.3 Dead code cleanup
              → 4.4 CI/CD
              → Phase 5 features as needed
```

**Note**: This is a suggested order. If the app isn't live yet, prioritize Phase 1 before launching to real users.
