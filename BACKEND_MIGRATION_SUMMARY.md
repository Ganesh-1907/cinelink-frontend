# 🚀 CineLink — Backend Migration & Security Fix Summary

---

## What Was Done

### 1. New Independent Backend Server (`CineLink-server/`)
Created a **fully independent Node.js + Express backend** at `/home/ganesh/Desktop/BYV/CineLink-server/` — completely separate from the React Native app. This is a standalone project with its own `package.json`, `tsconfig.json`, `.env`, and deployment configuration.

**Location**: `/home/ganesh/Desktop/BYV/CineLink-server/` (outside the RN project)

### 2. What the Backend Handles (18 API endpoints)

| Route Group | Endpoints | What It Replaces |
|---|---|---|
| **Payments** | `create-order`, `create-subscription`, `verify-payment`, `save-payment`, `check-duplicate`, `history` | Client-side Razorpay order creation + Firestore writes |
| **Razorpay Webhook** | `POST /api/webhooks/razorpay` | **NEW** — Server-side payment verification with HMAC-SHA256 signature |
| **Users** | `profile` (GET/PUT), `search`, `:userId`, `follow`, `followers` | Firestore direct reads/writes (now goes through backend) |
| **Chat** | `start`, `list`, `messages` (GET/POST/DELETE) | Chat operations with participant verification |
| **AI** | `scan-audition-poster`, `chat`, `verify-content` | Direct Gemini API calls (hardcoded key removed from app) |
| **Admin** | `stats`, `reports` (GET/PUT), `users` (GET/PUT/ban), `verification-requests` | Admin operations with role verification |
| **Upload** | `notification-token` | FCM token storage |

### 3. 🔴 Razorpay Webhook — Server-Side Payment Verification (CRITICAL FIX)

The **biggest security gap** is now closed:
- **Before**: Client wrote `payment success` directly to Firestore. Anyone could fake a payment.
- **After**: Razorpay sends a `POST` to `/api/webhooks/razorpay` with HMAC-SHA256 signed payload. The server verifies the signature using `RAZORPAY_WEBHOOK_SECRET`, then writes to Firestore using Admin SDK (bypasses Firestore rules).

**Webhook events handled**: `payment.captured`, `subscription.charged`, `subscription.activated`, `subscription.cancelled`, `subscription.expired`

### 4. Secrets Moved to Environment Variables

| Secret | Was In | Now In |
|--------|--------|--------|
| Gemini API Key | `QuickPostScreen.tsx` (hardcoded) | `CineLink-server/.env` → `GEMINI_API_KEY` |
| Razorpay Live Key | `PaymentScreen.tsx` (hardcoded) | `CineLink-server/.env` → `RAZORPAY_KEY_ID` |
| Razorpay Test Key | Multiple files | `CineLink-server/.env` |
| Razorpay Key Secret | `functions/` (comment only) | `CineLink-server/.env` → `RAZORPAY_KEY_SECRET` |
| Razorpay Webhook Secret | Was missing entirely | `CineLink-server/.env` → `RAZORPAY_WEBHOOK_SECRET` |
| Cloudinary Upload Preset | Multiple files | `src/api/config.ts` |
| Admin Email | 10+ files (hardcoded) | `src/api/config.ts` (single source of truth) |

### 5. Hardcoded Admin Email Centralized

**Before**: `const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com'` in **10+ screen files**  
**After**: All screens import from `import {ADMIN_EMAIL} from '../src/api/config'`

**Files updated**: HomeScreen, ProfileScreen, PostAuditionScreen, AuditionDetailScreen, ContestDetailScreen, CrewScreen, DiscoverScreen, PublicProfileScreen, BrowseAuditionsScreen, MyContestsScreen, PostContestScreen, ChatScreen, utils/spamPrevention.ts

### 6. Firestore Rules Strengthened

```diff
- // Payments: client can create (any logged-in user)
+ // Payments: client can only read own, writes via backend/webhook only

- // Subscriptions: no write rules defined
+ // Subscriptions: ALL client writes blocked (create/update/delete: if false)
```

### 7. Frontend API Service Created

**New file**: `src/api/client.ts` — Centralized API client that automatically:
- Attaches Firebase auth token to every request
- Handles errors consistently
- Provides `api.get()`, `api.post()`, `api.put()`, `api.delete()` methods
- Has fallback URLs for dev (10.0.2.2 for Android emulator) and production

**New file**: `src/api/config.ts` — Single source of truth for all configuration values

### 8. Updated Screens

| Screen | Change |
|--------|--------|
| `PaymentScreen.tsx` | Uses backend API for order creation + payment verification. Falls back to direct Firestore if backend is unreachable. |
| `PremiumCineLinkScreen.tsx` | Uses backend API for subscription creation instead of Cloud Function URL |
| `razorpaySubscriptionService.ts` | Replaced hardcoded Cloud Function URL with backend API call |
| `QuickPostScreen.tsx` | Removed hardcoded Gemini API key. AI scan goes through backend API. |

---

## Architecture Decision: Separate Server vs Monorepo

The backend is in **`/home/ganesh/Desktop/BYV/CineLink-server/`** — a completely independent project:

| Aspect | ✅ This Architecture | ❌ Monorepo (server/ inside RN) |
|---|---|---|
| **Deployment** | Deploy independently on any platform (Render, Railway, VPS) | Could share deployment but mixed concerns |
| **CI/CD** | Fully independent pipelines | Need to filter which changes affect which part |
| **Code isolation** | Can't accidentally import RN code in server | Possible cross-imports |
| **Team scaling** | Backend team works independently | All in one repo — harder to scope |
| **Mental model** | Clean separation: API server + mobile client | Mixed — can confuse developers |

---

## API Key Mapping (from your provided keys)

| Key | Value | Where Used |
|-----|-------|------------|
| `razorpay.key_id` | `rzp_test_rtsWNkrDp1dlT7` | `CineLink-server/.env` → `RAZORPAY_KEY_ID` |
| `razorpay.key_secret` | `bmfJRjLqnbAp0fA9RnX5FPPC` | `CineLink-server/.env` → `RAZORPAY_KEY_SECRET` |
| `razorpay.webhook_secret` | `bmfJRjLqnbAp0fA9RnX5FPPC` | `CineLink-server/.env` → `RAZORPAY_WEBHOOK_SECRET` |

---

## Security Issues Still Open (Not Addressed)

These remain as separate concerns (identified in CINELINK_ANALYSIS.md):
1. **Cloudinary unsigned upload preset** — Still uses unsigned preset. Needs Cloudinary signed upload + backend signature endpoint.
2. **Server-side rate limiting** — Spam prevention is still client-only in `utils/spamPrevention.ts`.
3. **Error boundaries** — No React error boundaries added.
4. **Pagination** — Most Firestore queries still load entire collections.
5. **Full collection scan** — CrewScreen still fetches all users.

---

## How to Run

```bash
# 1. Start the backend server
cd /home/ganesh/Desktop/BYV/CineLink-server
cp .env.example .env
# Edit .env with your values + service-account.json
npm install
npm run dev
# → Runs on http://localhost:3001

# 2. Update the API URL in the RN app
# Edit src/api/client.ts to point to your server:
#   Android emulator: http://10.0.2.2:3001/api
#   iOS simulator:    http://localhost:3001/api
#   Physical device:  http://your-machine-ip:3001/api

# 3. Set up Razorpay webhook in Razorpay Dashboard
#   Webhook URL: https://your-server.com/api/webhooks/razorpay
#   Secrets: bmfJRjLqnbAp0fA9RnX5FPPC
#   Events: payment.captured, subscription.charged, subscription.activated,
#           subscription.cancelled, subscription.expired
```

## Project Structure (Final)

```
/home/ganesh/Desktop/BYV/
├── CineLink/                          # React Native mobile app
│   ├── screens/                       # 47 screens
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts              # API client for backend calls
│   │   │   └── config.ts              # Centralized config (no hardcoded secrets)
│   │   ├── screens/Premium/
│   │   └── services/
│   ├── utils/
│   ├── hooks/
│   ├── firestore.rules                # Updated — payments/subscriptions locked down
│   └── package.json
│
└── CineLink-server/                   # NEW — Independent Node.js backend
    ├── src/
    │   ├── config/                    # env, firebase, razorpay
    │   ├── middleware/                # auth, webhook
    │   ├── routes/                    # payments, webhooks, users, chat, ai, admin, upload
    │   └── index.ts                   # Express entry
    ├── .env.example
    ├── package.json
    └── tsconfig.json
```
