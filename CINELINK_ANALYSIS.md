# 🎬 CineLink — Complete Codebase Analysis

---

## 1. What is CineLink?

**CineLink** is a **React Native** mobile app built for **Indian cinema professionals** — a social/professional networking platform connecting **actors, directors, crew members, and film enthusiasts** across Bollywood, Tollywood, Kollywood, and regional Indian cinema. It provides casting/audition management, film contest hosting, crew hiring, real-time chat, short-form video reels, project collaboration, and an AI assistant — all wrapped in a dark-themed, premium-feeling UI.

- **App Name:** CineLink
- **Firebase Project ID:** `cinelink-9d943`
- **Firebase Region:** `asia-south1`
- **Hosting URL:** `https://cinelink-9d943.web.app`
- **Admin Email:** `anilkumardevarakonda03@gmail.com`
- **Contact:** `cinelink011@gmail.com`

---

## 2. Full Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React Native 0.74.5 | Cross-platform mobile app (Android + iOS) |
| **Language** | TypeScript 5.0.4 | Type-safe code |
| **Navigation** | React Navigation 6.x (NativeStack + BottomTabs) | Screen routing & tab navigation |
| **Animations** | react-native-reanimated 3.10.1, react-native-gesture-handler 2.21.0 | Smooth UI transitions |
| **State Management** | React hooks (useState, useEffect) + Firestore listeners | Local per-screen state only (NO global state) |
| **Backend / Database** | Firebase Firestore (real-time NoSQL) | All persistent data |
| **Cloud Functions** | Firebase Cloud Functions (Node.js 18) | Server-side subscription creation |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | In-app & push notifications |
| **Crash Reporting** | Firebase Crashlytics | Error tracking |
| **Authentication** | Firebase Auth — Email/Password, Google Sign-In, Phone (OTP) | User login/registration |
| **Payments** | Razorpay (react-native-razorpay 3.0.0) | Contest entry fees & premium subscriptions |
| **AI** | Google Gemini 2.0 Flash Lite (direct REST API) | AI Assistant chat |
| **Media Storage** | Cloudinary (unsigned upload preset) | Image upload/storage/optimization |
| **Video** | react-native-video 6.19.2 | In-app video player (reels) |
| **Image Picking** | react-native-image-picker 8.2.1 | Camera & gallery uploads |
| **Image Viewer** | react-native-image-viewing 0.2.2 | Full-screen photo galleries |
| **Clipboard** | @react-native-clipboard/clipboard 1.16.3 | Copy-paste |
| **SVG** | react-native-svg 14.1.0 | Icons & vector graphics |
| **Splash Screen** | react-native-bootsplash 7.3.1 | Branded splash screen |
| **Testing** | Jest (react-native preset) | Unit testing |
| **Linting** | ESLint + Prettier | Code quality |
| **Local Storage** | @react-native-async-storage/async-storage | Onboarding flag, feedback timer |

---

## 3. All Features (Complete List)

### 👤 Authentication & Onboarding
- Email/password signup & login
- Google Sign-In (OAuth)
- Phone number login (OTP verification)
- Onboarding flow — 4-slide carousel (first launch only)
- Suggested follows after signup
- Ban check on every auth state change
- Online presence tracking (heartbeat every 10 min)

### 👥 User Profiles
- Full profile editing (name, bio, photos, portfolio gallery)
- Role selection (Actor / Director / Admin)
- Portfolio media grid (Cloudinary-hosted images)
- Intro video link
- Availability status (Available Now / Booked / Open)
- Looking-for tags, role tags, age range
- Instagram & YouTube links
- Followers / following system
- Public profile view
- Profile completion card
- Verification request system

### 🎬 Auditions & Casting
- Browse auditions with search
- Post auditions (directors only)
- Audition detail view with engagement bar (like, comment, share, views)
- Apply to auditions (actors)
- Director dashboard — manage applications, approve/reject
- My Applications screen
- Saved auditions (bookmark)
- Casting request submission & approval flow
- Spam prevention (rate limiting: 3 auditions/day, 10-min cooldown)

### 🎥 Short Films
- Upload short films (with Cloudinary poster)
- Film detail screen
- My Films management
- Browse films in feed
- Like & comment on films

### 🏆 Contests
- Browse contests with search & filtering
- Post/create contests (admin only)
- Contest detail with deadline display
- Enter contests (paid entry via Razorpay)
- My Contests management
- Contest entries with like/vote system
- Days-left countdown / deadline parser

### 🤝 Crew Marketplace
- Crew tab — search users by name, role, location
- Follow/unfollow crew members
- Crew Marketplace — post crew hiring needs (craft-specific)
- Browse crew posts by craft (Actor, Director, Writer, Editor, Cinematographer, etc.)

### 📂 Projects
- Browse projects with filters (Short Film, Feature Film, Web Series, etc.)
- Create project (directors)
- Project detail with roles needed (open/filled indicators)
- Join requests to projects
- Member management

### 💬 Chat & Messaging
- Real-time chat list (sorted by last message)
- One-to-one chat with Firestore subcollection (messages)
- Typing indicators
- Read receipts
- Push notifications for new messages (foreground + background)

### 🎞️ Cine Reels (Short-Form Video)
- Vertical video feed (TikTok-style) with pause/play
- Like, comment, view count
- Upload reels with Cloudinary video
- Creator attribution

### 🧠 AI Assistant
- Chat interface with Gemini 2.0 Flash Lite
- Industry-specific context (Indian cinema)
- Suggested prompts (audition tips, directing advice, etc.)

### ⭐ Premium Subscription (Razorpay)
- 4 tiers: Spotlight (₹299/mo), Marquee (₹699/3mo), Premiere (₹1,299/6mo), Premiere Elite (₹2,499/yr)
- Premium badges (crown icon, gold styling)
- Verified-real checkmark
- Monthly application count tracking
- Cloud Function creates Razorpay subscription server-side
- Premium status expiry tracking

### 📡 Notifications
- FCM push notifications (foreground Alert + background tap)
- Notification routing to correct screen based on type
- 15+ notification types: contest, message, audition, follow, connection, casting, etc.
- In-app notification list with navigation
- Feedback modal (popup after 1 hour of first open)

### 🛡️ Admin Features
- Admin reports dashboard (user reports, user management, verification approvals)
- Ban/unban users directly
- Admin-only posting to feed
- View all users, filter/approve verification requests
- Manage report statuses (pending/reviewed/action_taken/dismissed)

### ⚙️ Settings & Legal
- Notification toggles
- Profile visibility toggle
- Delete account (with Firestore data cleanup)
- Privacy policy & Terms screens
- Report user/content modal
- Feedback submission
- Industry Guide (role-specific career advice)

### 🖼️ UI/UX
- Dark theme (#0A0A0A background, gold/rose-gold #C9956C primary)
- Custom animated tab bar (LiquidNav)
- Skeleton loading cards
- Pull-to-refresh
- Emoji reactions & icons
- Boot splash screen with branded animation
- Gesture handler throughout

---

## 4. Backend Integration Analysis — Features vs Data Source

This section identifies whether each feature's data is **truly backed by Firestore/backend** or if there's any **frontend-only mock/hardcoded data**.

### ✅ Fully Backend-Integrated (Firestore + Real Data)

| Feature | Frontend | Backend Collection | Correctly Integrated? |
|---------|----------|-------------------|----------------------|
| User Profiles | ProfileScreen, PublicProfileScreen | `users/{uid}` | ✅ Yes — real-time onSnapshot |
| Auth/Login | AuthScreen, PhoneLoginScreen | Firebase Auth + `users/{uid}` | ✅ Yes |
| Followers/Following | FollowersScreen | `users/{uid}/followers/`, `users/{uid}/following/` | ✅ Yes |
| Auditions | BrowseAuditionsScreen, AuditionDetailScreen | `auditions/{id}` | ✅ Yes |
| Audition Applications | MyApplicationsScreen, DirectorDashboardScreen | `applications/{id}` | ✅ Yes |
| Films | FilmDetailScreen, MyFilmsScreen | `films/{id}` | ✅ Yes |
| Contests | BrowseContestsScreen, ContestDetailScreen | `contests/{id}` | ✅ Yes |
| Contest Entries | MyContestsScreen | `contestEntries/{id}` | ✅ Yes |
| Projects | BrowseProjectsScreen, ProjectDetailScreen | `projects/{id}`, `members`, `requests` | ✅ Yes |
| Chat | ChatListScreen, ChatScreen | `chats/{id}/messages/{id}` | ✅ Yes |
| Reels | ReelsScreen | `cinereels/{id}` | ✅ Yes |
| Crew Posts | CrewMarketplaceScreen | `crewPosts/{id}` | ✅ Yes |
| Notifications | NotificationsScreen | `notifications/{id}` | ✅ Yes |
| Reports | AdminReportsScreen | `reports/{id}` | ✅ Yes |
| Banned Users | App.tsx (ban check) | `bannedUsers/{id}` | ✅ Yes |
| Saved Auditions | SavedAuditionsScreen | `savedAuditions/{id}` | ✅ Yes |
| Casting Requests | CastingRequestScreen | `castingRequests/{id}` | ✅ Yes |
| Verification Requests | AdminReportsScreen | `verificationRequests/{id}` | ✅ Yes |
| Feedback | FeedbackModal | `feedback/{id}` | ✅ Yes |
| Feed Posts | HomeScreen | `feedPosts/{id}` | ✅ Yes |
| Payments | PaymentScreen + Premium | `payments/{id}`, `subscriptions/{id}` | ✅ Yes (partially — see issues) |
| Discovery | DiscoverScreen | `users` with pagination | ✅ Yes |
| Profile Comments | PublicProfileScreen | `users/{uid}/comments/{id}` | ✅ Yes |
| Connections | CrewScreen | `connections/{id}`, `connectionRequests/{id}` | ✅ Yes |

### ⚠️ Partially Integrated / Questionable

| Feature | Issue |
|---------|-------|
| **Premium Subscription** | Cloud Function creates Razorpay subscription server-side, but **no Razorpay webhook handler** exists to verify payment success server-side. The client writes to Firestore directly after payment — anyone could fake a success response. |
| **Push Notifications** | FCM tokens are stored in `users/{uid}/fcmToken`, but there is **no Cloud Function to actually send push notifications**. Messages are written to the `notifications` collection but actual push delivery to devices is not implemented on the server side. Only foreground alerts use local handling. |
| **Profile Views (Discover)** | DiscoverScreen increments `profileViews` on each user doc. This is a Firestore write — but there's no rate-limiting or deduplication. A user could spam-refresh to inflate view counts. |
| **Online Presence** | A setInterval in App.tsx writes `isOnline: true` + `lastSeen: serverTimestamp` every 10 minutes. This works but has no cleanup on app close — users may appear "online" for up to 10 minutes after closing the app. |

### ❌ Frontend-Only / Hardcoded (No Backend Connection)

| Feature | Files | Problem |
|---------|-------|---------|
| **Industry Guide** | `IndustryGuideScreen.tsx` | ~90 career tips across 5 roles are **hardcoded in TypeScript**. No Firestore collection backs this. |
| **Onboarding Carousel** | `OnboardingScreen.tsx` | 4 slides with text/images are **hardcoded**. Should come from Firestore/Remote Config. |
| **Privacy Policy** | `PrivacyPolicyScreen.tsx` | Static HTML — acceptable for legal text. |
| **Terms of Service** | `TermsScreen.tsx` | Static HTML — acceptable for legal text. |
| **Movie Details (TMDB)** | `MovieDetails.tsx` | UI exists but **no TMDB API call found** — movies are passed via `route.params`, meaning this feature may be incomplete or rely on external data not fetched by the app. |
| **Spam Prevention Rules** | `utils/spamPrevention.ts` | Rate limits (3 auditions/day, 2 films/day, etc.) and blocked words are hardcoded. Cannot be updated without app release. |
| **Premium Tier Pricing** | `PremiumCineLinkScreen.tsx` | Prices (₹299, ₹699, ₹1299, ₹2499) and feature lists are hardcoded. Cannot change pricing without app update. |
| **Plan IDs (Cloud Function)** | `functions/src/createSubscription.ts` | Razorpay plan IDs hardcoded as **test mode** IDs. Will fail in production. |
| **Category Tags / Filters** | HomeScreen, BrowseAuditionsScreen, etc. | Filter arrays like `['All', 'Actor', 'Director']` are hardcoded in multiple screens. |
| **Casting Request Steps** | CastingRequestScreen.tsx | Multi-step form steps are hardcoded. |
| **Report Reasons** | ReportModal.tsx | Report reason options are hardcoded. |

---

## 5. Vulnerabilities & Security Issues

### 🔴 CRITICAL (Immediate Risk)

| # | Issue | Location | Details |
|---|-------|----------|---------|
| **C1** | **Hardcoded Gemini API Key** | `QuickPostScreen.tsx:40` | `GEMINI_API_KEY = 'AIzaSyAIAb0bUWvHZHR1YE6_pVKI45JQJ5owA4g'` — Anyone decompiling the APK can use this key, potentially costing you thousands in Google AI API charges. |
| **C2** | **Cloudinary Unsigned Upload Preset** | Multiple screens | `UPLOAD_PRESET = 'cinelink_upload'` is unsigned. Anyone who knows your cloud name (`dipwobgzb`) can upload arbitrary files to your Cloudinary account — used for malware hosting, storage cost drain. |
| **C3** | **No Razorpay Webhook Verification** | Payment flow | After payment success, the **client directly writes to Firestore** (`payments`, `contestEntries`, `subscriptions`). There is no server-side webhook to verify the Razorpay payment signature. A malicious user could modify the client code to fake payment success and get free contest entries / premium subscriptions. Firestore rules check some fields but don't independently verify payment with Razorpay. |
| **C4** | **Hardcoded Live Razorpay Key in Client** | `PaymentScreen.tsx` | `RAZORPAY_KEY = 'rzp_live_T7rczRVuHeMGXj'` — Live key exposed in source code. While Razorpay keys are somewhat safe (orders are created server-side), combined with the lack of webhook verification, this is dangerous. |

### 🟠 HIGH (Significant Risk)

| # | Issue | Location | Details |
|---|-------|----------|---------|
| **H1** | **No Input Validation / Sanitization** | All Firestore writes | User-input text (bios, comments, chat messages, audition descriptions) is written directly to Firestore with **no server-side sanitization**. No XSS prevention for web views. No SQL injection (NoSQL — but NoSQL injection is possible). |
| **H2** | **Admin Email Hardcoded in 10+ Files** | HomeScreen, CrewScreen, ProfileScreen, etc. | `ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com'` scattered across the codebase. To change admin, you need a full app release. Also, an attacker who reads the source knows exactly who the admin is — social engineering target. |
| **H3** | **Client-Side Admin Detection** | Multiple screens | Admin is detected by checking `user?.email === ADMIN_EMAIL` on the client. This is used to show/hide admin UI elements. However, Firestore rules properly check admin status via `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true` — so the **Firestore rules are secure**, but the UI reveals admin functionality to anyone who reads the source. |
| **H4** | **No Server-Side Rate Limiting** | All Firebase operations | Spam prevention (`utils/spamPrevention.ts`) is entirely client-side. A malicious user can bypass it by using a modified client or direct Firestore API calls. There are no Firestore rules or Cloud Functions enforcing rate limits server-side. |
| **H5** | **Full Collection Scan — Crew Search** | `CrewScreen.tsx` | Fetches entire `users` collection (`firestore().collection('users').get()`) with no `where()` filter, then filters client-side. At scale (10K+ users), this will: (a) be extremely slow, (b) consume massive Firestore read quota, (c) expose all user data in one request. |
| **H6** | **No .env / Secrets Management** | Entire project | API keys, OAuth client IDs, Cloudinary credentials, and Razorpay keys are all **hardcoded in source files** and committed to git. No `.env` files or runtime secrets management. |
| **H7** | **Missing Composite Indexes** | Firestore queries | Several queries with `orderBy` combined with `where` on different fields may fail or require indexes that haven't been created. `firestore.indexes.json` only has 3 indexes. |
| **H8** | **Firestore Rules: subscriptions Collection** | `firestore.rules` | The `subscriptions` collection blocks writes in rules, but there's **no webhook validating Razorpay payment success** before a subscription is written. The Cloud Function creates the Razorpay subscription, but there's no server-side handler to activate it on payment confirmation. |

### 🟡 MEDIUM (Moderate Risk)

| # | Issue | Location | Details |
|---|-------|----------|---------|
| **M1** | **No Error Boundaries** | Entire app | If any React component throws an error during render, the entire app will crash with a white screen (React Native's default behavior). No `ErrorBoundary` component exists anywhere. |
| **M2** | **No Pagination on Most Lists** | HomeScreen, BrowseAuditionsScreen, etc. | Most screens load all documents in a collection at once. No cursor-based or offset pagination. Will break at scale. Only `DiscoverScreen` has proper pagination. |
| **M3** | **User Data Exposure on Crew Search** | `CrewScreen.tsx` | The full user collection scan returns ALL user fields (including potentially sensitive data like email, FCM token, etc.) to every logged-in user. |
| **M4** | **No HTTPS-Only Enforcement** | No configuration found | No App Transport Security (ATS) exceptions or HTTPS enforcement configured. Mixed content possible. |
| **M5** | **Firestore Rules: No Write Size Limits** | `firestore.rules` | No `request.resource.size` limits on any collection. A user could write massive documents (10MB+) to Firestore, causing cost spikes. |
| **M6** | **No Request Validation in Firestore Rules** | `firestore.rules` | Rules check auth and ownership but don't validate field types or required fields on write. Invalid/malformed data can be written. |
| **M7** | **Rate Limiting for Auth Operations** | Firebase Auth | No rate limiting on Firebase Auth operations. An attacker could brute-force login attempts or send mass password reset emails. |
| **M8** | **Google OAuth Client ID Exposed** | `AuthScreen.tsx` | `webClientId: '446255844348-sv3ii7l6q5ckt2b0501dbu2mv02p1onq.apps.googleusercontent.com'` — This is expected for client-side OAuth, but should be verified against the allowed redirect URIs in Google Cloud Console. |

### 🟢 LOW (Minor Issues / Best Practices)

| # | Issue | Location | Details |
|---|-------|----------|---------|
| **L1** | **Console.log Statements in Production** | Multiple files | Several `console.log` statements left in production code. Information leakage. |
| **L2** | **Hardcoded Test Plan IDs** | `createSubscription.ts` | Razorpay plan IDs are test mode (`plan_T79TclEwk342h5` etc.). Will not work in production. |
| **L3** | **No TypeScript Strict Mode** | `tsconfig.json` | Strict mode appears to be disabled. |
| **L4** | **Minification Disabled for Android** | `android/app/build.gradle` | `minifyEnabled` and `shrinkResources` may not be enabled — larger APK size, easier to reverse engineer. |
| **L5** | **MovieDetails Screen May Be Incomplete** | `MovieDetails.tsx` | Screen exists but no TMDB API calls found in the codebase. May be a dead/unused screen. |
| **L6** | **No Offline/Cache Layer** | Entire app | No `@react-native-firebase/firestore` offline persistence configured, or AsyncStorage caching. App shows blank/loading states without internet. |
| **L7** | **Chat Messages Query Without Pagination** | `ChatScreen.tsx` | Loads ALL messages in a chat at once. For active chats with thousands of messages, this will cause performance issues and high read costs. |

---

## 6. Summary of Architecture Weaknesses

1. **No backend API layer** — The app is 100% client-side Firestore. No REST API, no input validation server-side, no audit trails. Security depends entirely on Firestore rules.
2. **No global state management** — Every screen fetches its own data. No caching, no sharing state between screens, re-fetches on every navigation.
3. **Secrets in source code** — API keys, OAuth IDs, and payment keys are hardcoded and committed to git. Anyone with the source (or decompiled APK) has them.
4. **Client-only spam prevention** — All rate limiting is in `utils/spamPrevention.ts` which runs on the client. Trivially bypassable.
5. **No server-side payment verification** — Razorpay webhook is not implemented. Client writes payment success to Firestore directly.
6. **No error boundaries** — A single crash can white-screen the entire app.
7. **No pagination at scale** — Most screens load entire collections. Will break with real-world data volumes.
8. **Full user collection scan** — The crew search fetches every user document without filters.

---

## 7. Overall Security Score

Based on the audit findings and this analysis: **4/10**

- 🟢 **Good**: Firestore security rules are comprehensive, auth is properly implemented, role-based access is enforced server-side
- 🟡 **Needs Work**: Secrets management, server-side verification, input validation, error handling
- 🔴 **Critical Issues**: Exposed Gemini API key, unsigned Cloudinary upload, no payment webhook, client-side-only rate limiting
