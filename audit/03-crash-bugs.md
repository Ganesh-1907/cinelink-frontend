# Phase 3 — Crash & Null Safety Bug Hunt

---

## CRASH-01 — `route.params` Destructured Without Guard (**HIGH**)

**Files:**
- `screens/PublicProfileScreen.tsx:21` — `const {userId} = route.params;`
- `screens/ChatScreen.tsx:25` — `const {chat} = route.params;`
- `screens/ContestDetailScreen.tsx:19-20` — `route.params?.contest` (safe — uses optional chaining)

**Scenario:** If either screen is navigated to without the expected param (e.g., a notification deep-link arrives before the app is fully initialized, or a logic bug in the sender screen), `route.params` is `undefined` and the destructure throws `TypeError: Cannot destructure property 'userId' of undefined`.

**Repro:** Open a notification that routes to `PublicProfile` before the app has a logged-in user, or navigate programmatically without passing params.

**Fix:**
```tsx
// PublicProfileScreen.tsx
const userId = route?.params?.userId;
if (!userId) { navigation.goBack(); return null; }

// ChatScreen.tsx
const chat = route?.params?.chat;
if (!chat) { navigation.goBack(); return null; }
```

---

## CRASH-02 — `uploadToCloudinary` Returns `undefined` on Failure (**HIGH**)

**Files:**
- `screens/ProfileScreen.tsx:188-190`
- `screens/ChatScreen.tsx:296-316`
- `screens/CastingRequestScreen.tsx:60-70`
- `screens/HomeScreen.tsx:743-750`

**Scenario:** If Cloudinary returns an error response (network timeout, format rejection, quota exceeded), `data.secure_url` is `undefined`. In ProfileScreen this leads to `photoURL: undefined` being written to Firestore. In ChatScreen, `imageUrl: undefined` is written to the message document, and the subsequent `<Image source={{uri: undefined}}>` throws a native image loading error.

**Repro:** Upload an image while offline, or upload a file type blocked by the preset.

**Fix:** Check `data.secure_url` before proceeding:
```tsx
if (!data.secure_url) throw new Error(`Cloudinary error: ${data.error?.message}`);
return data.secure_url;
```

---

## CRASH-03 — `audition.directorId` Used Without Guard in `loadDirectorProfile` (**MEDIUM**)

**File:** `screens/AuditionDetailScreen.tsx:153`

```tsx
const doc = await firestore().collection('users').doc(audition.directorId).get();
```

**Scenario:** If an audition document in Firestore is missing the `directorId` field (legacy data or partial write), `audition.directorId` is `undefined`. Passing `undefined` to Firestore's `.doc()` throws `Error: Document path must be a non-empty string`.

**Fix:**
```tsx
if (!audition?.directorId) return;
const doc = await firestore().collection('users').doc(audition.directorId).get();
```

---

## CRASH-04 — `setState` After Unmount in Async Operations (**MEDIUM**)

**Files:**
- `screens/ProfileScreen.tsx:197-261` — `saveProfile()` is async; calls `setLoading`, `setUploading`, `setPhotoUrl`, `setPortfolioPhotos`, `setNewPhotos`, `setPhoto`, `setSaved` after awaiting Cloudinary + Firestore.
- `screens/AuditionDetailScreen.tsx:352-398` — `applyNow()` is async; calls `setLoading`, `setApplied`, `setShowNoteInput`, `setNote` after await.
- `screens/HomeScreen.tsx:730-763` — `sendPost()` async.

**Scenario:** User initiates a long upload, then navigates back. The async operations continue, and when they resolve, they call `setState` on an unmounted component. In RN 0.74 this logs a warning but doesn't crash. However, it can cause subtle state corruption if the same screen re-mounts quickly (e.g. fast navigation).

**Fix (recommended for upload screens):** Use an `isMounted` ref:
```tsx
const isMounted = useRef(true);
useEffect(() => () => { isMounted.current = false; }, []);
// In async: if (!isMounted.current) return;
```

---

## CRASH-05 — `Animated.Value` Created in `useState` (Not Lazy) (**MEDIUM — Performance/Stability**)

**File:** `screens/PublicProfileScreen.tsx:45-46`

```tsx
const toastOpacity = useState(new Animated.Value(0))[0];
const skeletonOpacity = useState(new Animated.Value(0.3))[0];
```

**Scenario:** `new Animated.Value()` is called on every render pass even though `useState` only keeps the first value. On a slow device with many re-renders (e.g., real-time Firestore listener causing frequent re-renders), this creates many discarded `Animated.Value` objects per second, stressing the garbage collector and potentially triggering jank.

**Fix:** Use lazy initializer or `useRef`:
```tsx
const toastOpacity = useRef(new Animated.Value(0)).current;
const skeletonOpacity = useRef(new Animated.Value(0.3)).current;
```

---

## CRASH-06 — Missing `audition` Guard Before Calling `notifyDirector` (**LOW**)

**File:** `screens/AuditionDetailScreen.tsx:158-185`

```tsx
const notifyDirector = async () => {
  if (audition.directorId === user?.uid) return;  // audition accessed without null check
```

This runs inside `useEffect([audition?.id])`, and the effect guard is `if (!audition?.id) return`. However `notifyDirector` itself directly accesses `audition.directorId` without optional chaining. If `audition` is somehow null when this runs (race condition between state updates), this crashes.

**Fix:** Add `if (!audition?.directorId) return;` at the top of `notifyDirector`.

---

## CRASH-07 — `messages` useEffect Missing `currentUser` in Dep Array (**LOW — Stale Closure**)

**File:** `screens/ChatScreen.tsx:128-147`

```tsx
useEffect(() => {
  // uses currentUser, messages, chat.id
}, [messages, chat.id, currentUser?.uid]);
```

This is actually correct — `currentUser?.uid` is in the dep array. However, the effect runs a Firestore write (`update({unreadCount...})`) on EVERY message update — even when no unread count changed. At 100+ messages in a chat, each new incoming message triggers reads on ALL messages to find unread ones, then writes for each unread message. This is not a crash but a Firestore write amplification bug.

**Fix:** Track which messages have already been marked read in a `Set` ref rather than scanning all messages on each render.

---

## Summary Table

| ID | File | Line | Crash Type | Severity |
|----|------|------|------------|----------|
| CRASH-01 | PublicProfileScreen.tsx, ChatScreen.tsx | 21, 25 | TypeError on undefined destructure | HIGH |
| CRASH-02 | ProfileScreen, ChatScreen, HomeScreen, CastingRequestScreen | Various | undefined URL from failed Cloudinary upload | HIGH |
| CRASH-03 | AuditionDetailScreen.tsx | 153 | Firestore error: undefined docId | MEDIUM |
| CRASH-04 | ProfileScreen, AuditionDetailScreen, HomeScreen | Various | setState after unmount | MEDIUM |
| CRASH-05 | PublicProfileScreen.tsx | 45-46 | Animated.Value in useState body | MEDIUM |
| CRASH-06 | AuditionDetailScreen.tsx | 159 | Null dereference on audition.directorId | LOW |
| CRASH-07 | ChatScreen.tsx | 128-147 | Write amplification on every message | LOW |
