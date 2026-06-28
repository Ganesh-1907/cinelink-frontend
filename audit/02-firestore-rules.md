# Phase 2 — Firestore Rules Audit

Rules file: `firestore.rules` (270 lines)

---

## Overall Assessment

Rules are well-structured with helper functions and cover all collections. No `allow read, write: if true` found. However several specific issues exist.

---

## Issues Found

### RULES-01 — `pushNotifications` Collection Fully Open to All Auth Users (**HIGH**)

```
// firestore.rules:238-240
match /pushNotifications/{notifId} {
  allow read, write: if isLoggedIn();
}
```

**Risk:** Any authenticated user can read, write, update, or delete any document in `/pushNotifications`. This is a legacy collection (comment says so) but it is still live in the rules. Any logged-in user can spam this collection, read others' notifications, or delete them.

**Fix:** If this collection is no longer used, add `allow read, write: if false;` to lock it down. If still used, scope to `resource.data.userId == request.auth.uid`.

---

### RULES-02 — `notifications` Create Rule Allows Any User to Notify Any Other User (**MEDIUM**)

```
// firestore.rules:145-146
allow create: if isLoggedIn() && isNotBanned();
```

**Risk:** Any non-banned user can write a notification to any other user (with any `userId`, `type`, `title`, `message`). This is intentional for features like "follow" and "connect request" notifications, but it also means a user could send fake system notifications (e.g., `type: 'admin_message'`) to any user. There is no validation that `request.resource.data.type` is a known/safe type.

**Fix:** Add allowed-type validation:
```
allow create: if isLoggedIn() && isNotBanned()
  && request.resource.data.type in ['follow', 'connect_request', 'like', 'comment', 'contest_win', 'application_update'];
```

---

### RULES-03 — `savedAuditions` Create Does Not Validate Ownership (**MEDIUM**)

```
// firestore.rules:200
allow create: if isLoggedIn();
```

**Risk:** Any logged-in user can create a `savedAudition` document with any `userId` field. A user could create saved-audition records attributed to other users (no practical attack, but a data integrity gap).

**Fix:**
```
allow create: if isLoggedIn() && request.resource.data.userId == request.auth.uid;
```

---

### RULES-04 — `connectionRequests` Create Does Not Validate `fromUserId` (**MEDIUM**)

```
// firestore.rules:248
allow create: if isLoggedIn();
```

**Risk:** A user could create a connection request with `fromUserId` set to someone else's UID, making it appear as if another user sent a connection request. The receiving user would see a spurious request attributed to the wrong sender.

**Fix:**
```
allow create: if isLoggedIn() && request.resource.data.fromUserId == request.auth.uid;
```

---

### RULES-05 — `payments` Create Has No Validation (**MEDIUM**)

```
// firestore.rules:155
allow create: if isLoggedIn();
```

**Risk:** Any authenticated user can create a payment record with arbitrary fields — including faking a `status: 'success'` for a payment they didn't make. If any server-side code reads `payments/{id}.status` to unlock features, a user could bypass payment.

**Fix:** Payment records should only be created server-side (Cloud Function triggered by Razorpay webhook). Client-side payment writes should be removed. Until then:
```
allow create: if isLoggedIn() && request.resource.data.userId == request.auth.uid
  && request.resource.data.status == 'pending';
```

---

### RULES-06 — No Document Size / Rate Limiting (**LOW**)

**Risk:** Firestore rules have no field-size validation. A user could write a chat message with a 1 MB `text` field, or a comment with enormous content. Over time this inflates storage costs.

**Fix:** Add size checks to write rules:
```
// In messages create rule:
&& request.resource.data.text.size() < 2000
// In feedPosts comments create rule:
&& request.resource.data.text.size() < 500
```

---

### RULES-07 — `isAdmin()` Uses Email Claim, Not Custom Claim (**LOW**)

```
// firestore.rules:6
function isAdmin() { return request.auth.token.email == 'anilkumardevarakonda03@gmail.com'; }
```

**Risk:** Email is immutable in Firebase Auth tokens (it comes from the signed JWT), so this is technically safe against spoofing. However: (a) if admin needs to change, both rules AND source must be updated + redeployed, (b) no way to have multiple admins without updating rules.

**Fix (recommended):** Set a custom claim `admin: true` via Admin SDK. Rules become `request.auth.token.admin == true`. Email stays out of rules.

---

### RULES-08 — `isApprovedDirector()` Costs a Firestore Read Per Operation (**LOW/PERFORMANCE**)

```
// firestore.rules:11-13
function isApprovedDirector() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isApprovedDirector == true;
}
```

**Risk:** Every audition create/contest create triggers a document read for the director check. At high scale this increases Firestore read costs. Also, `get()` in rules counts toward Firestore's 1 read-per-rule-evaluation limit.

**Fix:** Move `isApprovedDirector` to a Firebase custom claim. Set it via Admin SDK when admin approves a director. Eliminates the `get()` call.

---

## Collections Checklist

| Collection | Read Scope | Write Scope | Issue |
|------------|------------|-------------|-------|
| users | All authenticated | Owner + admin | OK |
| users/followers | All authenticated | Follower owns record | OK |
| chats | Participants only | Participants | OK — well scoped |
| chats/messages | Participants only | Participants + senderId check | OK |
| feedPosts | All authenticated | Admin only | OK |
| feedPosts/comments | All authenticated | Any non-banned | OK |
| auditions | All authenticated | Admin + approved director | OK |
| applications | Applicant + director + admin | Non-banned | OK |
| films | All authenticated | Owner + admin | OK |
| contests | All authenticated | Admin + approved director | OK |
| contestEntries | All authenticated | Non-banned | OK |
| notifications | Own records | Any non-banned | RULES-02 |
| payments | Owner + admin | Any authenticated | RULES-05 |
| reports | Admin only | Any authenticated | OK |
| bannedUsers | All authenticated | Admin only | OK |
| projects | All authenticated | Owner + admin | OK |
| savedAuditions | Owner only | Any authenticated | RULES-03 |
| castingRequests | Owner + admin | Any authenticated | OK |
| cinereels | All authenticated | Owner + admin | OK |
| crewPosts | All authenticated | Owner + admin | OK |
| verificationRequests | Admin only | Any authenticated | OK |
| **pushNotifications** | **All authenticated** | **All authenticated** | **RULES-01** |
| connectionRequests | Sender + receiver | Any authenticated | RULES-04 |
| connections | Participants | Participants | OK |
| feedback | Admin only | Any authenticated | OK |

---

## Summary

No `if true` rules found. Core collections (chats, auditions, applications) are well-scoped. Main risks are the open `pushNotifications` collection, missing ownership validation on create for `savedAuditions`/`connectionRequests`, and the payment record creation vulnerability.
