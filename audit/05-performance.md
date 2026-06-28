# Phase 5 — Performance Audit

---

## PERF-01 — No Pagination on Any Firestore Collection (**HIGH**)

**Files & Lines:**

| File | Line | Query |
|------|------|-------|
| `screens/HomeScreen.tsx:601-639` | 618 | `collection('auditions').orderBy(...).get()` — no `.limit()` |
| `screens/HomeScreen.tsx:661-673` | 663 | `collection('films').orderBy(...).onSnapshot(...)` — no `.limit()` |
| `screens/HomeScreen.tsx:676-689` | 679 | `collection('contests').orderBy(...).onSnapshot(...)` — no `.limit()` |
| `screens/BrowseAuditionsScreen.tsx` | — | All auditions fetched — no `.limit()` |
| `screens/ChatListScreen.tsx` | — | All chats fetched — no `.limit()` |
| `screens/NotificationsScreen.tsx` | — | All notifications fetched — no `.limit()` |

**Impact:** At 500 auditions, each HomeScreen load fetches 500 documents + serializes them. At 1000 users × 500 docs = 500,000 Firestore reads per home screen load cycle. At current Firestore free tier (50,000 reads/day), a single active user would exhaust the quota in minutes.

**Fix:** Add `.limit(20)` to all initial queries. Implement "load more" / infinite scroll using `startAfter(lastDoc)`.

---

## PERF-02 — Cloudinary Images Loaded at Full Resolution (**HIGH**)

**Files:** `HomeScreen.tsx`, `ProfileScreen.tsx`, `AuditionDetailScreen.tsx`, `ChatScreen.tsx`, `PublicProfileScreen.tsx`, `BrowseAuditionsScreen.tsx`

All images are loaded from raw Cloudinary URLs like:
```
https://res.cloudinary.com/dipwobgzb/image/upload/v1234567/photo.jpg
```

No transformation parameters are applied. A poster photo uploaded at 3000×4000px is delivered at full resolution to a phone screen where it's displayed at 390×520px. This wastes mobile data and memory.

**Fix:** Append Cloudinary transformation parameters to the URL before rendering:
```tsx
const optimizeImage = (url: string, width = 600) =>
  url?.replace('/upload/', `/upload/w_${width},f_auto,q_auto:good/`);
```

Apply to all `<Image source={{uri: ...}}>` usages.

---

## PERF-03 — FlatList `renderMessage` Is a Non-Stable Function Reference (**MEDIUM**)

**File:** `screens/ChatScreen.tsx:357-458`

```tsx
const renderMessage = ({item, index}: any) => { ... };
// ...
<FlatList renderItem={renderMessage} />
```

`renderMessage` is defined inside the component and references `messages`, `currentUser`, `otherUserName`, `otherUserPhoto`. It's recreated on every render. FlatList's internal `PureComponent` optimization is bypassed, so all visible message cells re-render on every state change (including typing indicator updates, unread count changes, etc.).

**Fix:** Wrap in `useCallback`:
```tsx
const renderMessage = useCallback(({item, index}: any) => { ... }, [messages, currentUser, otherUserName, otherUserPhoto]);
```
Or extract `MessageBubble` into a `React.memo`-wrapped component.

---

## PERF-04 — No `React.memo` on Repeating List Components (**MEDIUM**)

**File:** `screens/HomeScreen.tsx:235-277, 280-363, 365-545`

`ProfileCard`, `AuditionCard`, and `PostBubble` are all defined inside `HomeScreen`. They are recreated on every `HomeScreen` render. When `HomeScreen` re-renders (e.g., `unreadCount` badge updates every N seconds via Firestore listener), all visible cards re-render unnecessarily.

**Fix:** Move `ProfileCard`, `AuditionCard`, `PostBubble` outside `HomeScreen` and wrap with `React.memo`. Pass only the props they need.

---

## PERF-05 — Inline Arrow Functions as Props Defeat Memoization (**MEDIUM**)

**File:** `screens/HomeScreen.tsx` (various)

Example at line ~969:
```tsx
onPress={() => navigation.navigate('FilmDetail', {film: item})}
onPress={() => handleLike(item.id, item.likedBy)}
```

Every `HomeScreen` render creates new function instances for these props. If cards were memoized (PERF-04), these inline functions would break the memo. Even without memo, these create unnecessary GC pressure.

**Fix:** Stabilize with `useCallback` for frequently-called handlers, or extract item components with stable callback props.

---

## PERF-06 — `PostBubble` Creates a Firestore Listener Per Post (**MEDIUM**)

**File:** `screens/HomeScreen.tsx:375-387`

```tsx
useEffect(() => {
  const unsub = firestore()
    .collection('feedPosts').doc(item.id)
    .collection('comments')
    .orderBy('createdAt', 'asc').limit(10)
    .onSnapshot(...)
  return () => unsub();
}, [item.id]);
```

Every `PostBubble` that is rendered sets up a live Firestore listener. If there are 20 posts on screen, that's 20 active listeners. These listeners persist for as long as the component is mounted, charging reads on every comment addition anywhere.

**Fix:** Lazy-load comments only when the user taps "Comment" (`showComments === true`), and unsubscribe when `showComments` becomes false.

```tsx
useEffect(() => {
  if (!showComments) return;
  const unsub = firestore()...onSnapshot(...)
  return () => unsub();
}, [item.id, showComments]);
```

---

## PERF-07 — `SkeletonBlock` Creates Animated Loop Without Stable Reference (**LOW**)

**File:** `screens/HomeScreen.tsx:63-79`

```tsx
function SkeletonBlock({width, height, style}: any) {
  const shimmer = useState(new Animated.Value(0.25))[0];
  useEffect(() => {
    const loop = Animated.loop(...)
    loop.start();
    return () => loop.stop();
  }, []);
```

`SkeletonBlock` is called 3 times per `SkeletonCard` and there are [1,2,3] skeleton cards shown on load — 9 `SkeletonBlock` instances, each with its own `Animated.loop`. This is 9 concurrent animation loops. Not critical but unnecessary CPU usage during the loading state.

**Fix:** Use a single shared `shimmer` value passed from the parent `SkeletonCard`.

---

## PERF-08 — Chat Read Receipt Loop Fires on Every Message Change (**LOW**)

**File:** `screens/ChatScreen.tsx:128-147`

The `useEffect` that marks messages as read fires on every `messages` state change. Each firing iterates ALL messages to find unread ones and issues a Firestore `.update()` per unread message. On chat open, this can cause N writes where N is the number of unread messages. On subsequent message arrivals, it fires again and re-checks all previous messages even though they were already marked read.

**Fix:** Track marked-as-read IDs in a `useRef<Set>` and skip messages already in the set.

---

## Summary Table

| ID | File | Severity | Impact |
|----|------|----------|--------|
| PERF-01 | All data screens | HIGH | Firestore quota exhaustion at scale |
| PERF-02 | All image-rendering screens | HIGH | Excess bandwidth & memory |
| PERF-03 | ChatScreen.tsx | MEDIUM | All chat cells re-render on every state change |
| PERF-04 | HomeScreen.tsx | MEDIUM | All feed cards re-render on unread count tick |
| PERF-05 | HomeScreen.tsx | MEDIUM | Inline functions break future memoization |
| PERF-06 | HomeScreen.tsx (PostBubble) | MEDIUM | N Firestore listeners for N posts |
| PERF-07 | HomeScreen.tsx (SkeletonBlock) | LOW | 9 concurrent animation loops on load |
| PERF-08 | ChatScreen.tsx | LOW | Repeated read receipt writes |
