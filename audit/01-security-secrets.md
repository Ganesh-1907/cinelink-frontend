# Phase 1 — Security & Secrets Audit

## CRITICAL Findings

---

### SEC-01 — Gemini API Key Hardcoded in Source (**CRITICAL**)

| Field | Detail |
|-------|--------|
| Files | `screens/AIAssistantScreen.tsx:8`, `screens/QuickPostScreen.tsx:10` |
| Secret type | Google Gemini API key (`AIzaSy…`) |
| In git history | YES — confirmed via `git log -p` |
| Risk | Key is permanently in git history. Anyone with repo access (or if repo ever goes public) can use your Gemini quota freely. Key cannot be "un-leaked" by deleting the line — must be rotated. |

**Fix:** Rotate the key immediately at console.cloud.google.com. Move to a backend proxy (Cloud Function) that calls Gemini server-side. The client never holds the key. If a backend is not viable, use Firebase Remote Config to inject at runtime (still not ideal but removes it from source).

---

### SEC-02 — Razorpay Test Key Hardcoded (**HIGH**)

| Field | Detail |
|-------|--------|
| File | `screens/PaymentScreen.tsx:12` |
| Secret type | Razorpay test key (`rzp_test_SuJZOYDYUYgzIY`) |
| Risk | Test key is low-risk today, but the same pattern will be used for the live key. The comment on line 11 says "Change to `rzp_live_XXXXXXXXXX`" — if someone does a find-and-replace and commits, the live key will be in source. |

**Fix:** Store in a backend endpoint. Razorpay's standard pattern is: client calls your backend → backend creates an order → returns `order_id` → client completes payment. The `rzp_secret` never leaves your server.

---

### SEC-03 — Cloudinary Upload Preset Hardcoded in 7 Files (**HIGH**)

| Field | Detail |
|-------|--------|
| Files | `HomeScreen.tsx:28-29`, `PostAuditionScreen.tsx:11-12`, `ProfileScreen.tsx:21-22`, `UploadFilmScreen.tsx:18-19`, `UploadReelsScreen.tsx:18-19`, `CastingRequestScreen.tsx:10-11`, `ChatScreen.tsx:299` |
| Secret type | Cloudinary cloud name (`dipwobgzb`) + unsigned upload preset (`cinelink_upload`) |
| Risk | An **unsigned upload preset** allows anyone who knows your cloud name to upload arbitrary files to your Cloudinary account at your expense. There is no authentication — this is by design for unsigned presets. If the preset has no restrictions (allowed formats, max file size, folder), attackers can flood your storage. |

**Fix (short term):** In Cloudinary dashboard → Settings → Upload → Edit `cinelink_upload` preset → add restrictions: allowed formats (`jpg,png,mp4`), max file size (10 MB images / 500 MB video), restrict to a subfolder. **Fix (long term):** Move to signed uploads via a Cloud Function that generates a signed upload signature. Cloud name can remain in source (it's not secret); the upload secret should not be.

---

### SEC-04 — No `.env` File or Secrets Management (**HIGH**)

| Field | Detail |
|-------|--------|
| Finding | No `.env`, `.env.local`, or any secrets file found. All configuration is inline in TypeScript source files. |
| Risk | Every secret is committed to git. There is no separation between dev and prod config. Rotating any secret requires a code change and new build. |

**Fix:** Use `react-native-config` or `expo-constants` to load from `.env` files, add `.env` to `.gitignore`, and document required variables in a `.env.example` file.

---

### SEC-05 — Admin Email Hardcoded in Both Client and Firestore Rules (**MEDIUM**)

| Field | Detail |
|-------|--------|
| Files | `screens/BrowseAuditionsScreen.tsx`, `screens/HomeScreen.tsx:27`, `screens/AdminReportsScreen.tsx`, `firestore.rules:6` |
| Pattern | `const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com'` and `request.auth.token.email == 'anilkumardevarakonda03@gmail.com'` |
| Risk | Client-side `isAdmin` checks based on email are for UI-only. The Firestore rule check is acceptable (email comes from Firebase Auth token, not user-supplied). However, if the admin email ever needs to change, it must be updated in both rules AND every source file — which means a new build and rule deploy. |

**Fix:** Use Firebase custom claims (`admin: true`) set via Admin SDK. Rules become `request.auth.token.admin == true`. No email in source. Transferable if ownership changes.

---

## Git History

The Gemini API key (`AIzaSy…`) was confirmed present in at least 2 commits via `git log --all -p`. Even if the key is removed in a new commit, it remains retrievable from history. **The key must be rotated — deletion alone is not sufficient.**

---

## Summary Table

| ID | Secret | Severity | Files Affected | Fix |
|----|--------|----------|----------------|-----|
| SEC-01 | Gemini API key | CRITICAL | 2 | Rotate + move to backend proxy |
| SEC-02 | Razorpay test key | HIGH | 1 | Backend order creation |
| SEC-03 | Cloudinary unsigned preset | HIGH | 7 | Add preset restrictions + signed uploads |
| SEC-04 | No secrets management | HIGH | All | Add `react-native-config` + `.env` |
| SEC-05 | Admin email hardcoded | MEDIUM | 4 + rules | Firebase custom claims |
