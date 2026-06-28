# Phase 4 — Navigation & State Bugs

Navigator structure from `App.tsx`:
- `AuthStack`: Auth, PrivacyPolicy, Terms
- `MainStack` (wraps TabNavigator + all feature screens)
- `TabNavigator`: Home, Crew, Contests, Chats, Profile

---

## NAV-01 — `ReelsScreen` / `UploadReels` Navigate to Unregistered Screens (**HIGH**)

**File:** `screens/ReelsScreen.tsx:150, 162, 203, 238`

```tsx
navigation.navigate('UploadReels')
navigation.navigate('PublicProfile', {userId: item.creatorId})
```

`ReelsScreen` is **not imported or registered** in `App.tsx`. The screen exists on disk but is not in the navigation tree. If it were ever reached (e.g., from a deep link or a future tab addition), `navigation.navigate('UploadReels')` would throw: `The action 'NAVIGATE' with payload {"name":"UploadReels"} was not handled by any navigator`.

**Fix:** Either register `ReelsScreen` and `UploadReelsScreen` in `MainStack`, or delete the file if the feature is abandoned.

---

## NAV-02 — `ChatListScreen` Navigates to `'Home'` (Tab Screen) from Stack Context (**MEDIUM**)

**File:** `screens/ChatListScreen.tsx:254`

```tsx
onPress={() => navigation.navigate('Home')}
```

`ChatListScreen` is mounted inside `TabNavigator` → `Chats` tab. Calling `navigation.navigate('Home')` from inside a tab navigator switches to the Home tab. This works correctly in React Navigation v6. However, `SavedAuditionsScreen.tsx:148` does the same from inside the **stack** navigator (it's a stack screen, not a tab screen), which in React Navigation v6 bubbles up to the parent navigator and finds the 'Home' tab — also works, but it's fragile. If screen names ever collide or the navigator hierarchy changes, this silently navigates to the wrong place.

**Recommendation:** Use `navigation.navigate('Main', {screen: 'Home'})` for navigating from stack screens to tab screens (as correctly done in `NotificationsScreen.tsx:180`).

---

## NAV-03 — `NotificationsScreen` Navigates to `'ChatScreen'` Without Verifying Chat Exists (**MEDIUM**)

**File:** `screens/NotificationsScreen.tsx:165-169`

```tsx
navigation.navigate('ChatScreen', {
  chat: {
    id: item.chatId,
    participantNames: [item.senderName || 'User', currentUserName],
    participants: [item.senderId, currentUser?.uid],
  },
});
```

`item.chatId`, `item.senderId` could be `undefined` if the notification was created with missing fields (see RULES-02 in firestore audit — any user can create a notification). If `chatId` is undefined, `ChatScreen` mounts with `chat.id = undefined`, and the Firestore listener `firestore().collection('chats').doc(undefined)` throws an error.

**Fix:** Guard before navigating:
```tsx
if (!item.chatId || !item.senderId) return;
```

---

## NAV-04 — `AuditionDetailScreen` Navigates to `'ChatScreen'` vs `'ChatScreen'` Naming Inconsistency (**LOW**)

**File:** `screens/AuditionDetailScreen.tsx:328`

```tsx
navigation.navigate('ChatScreen', {chat: {...}})
```

The stack screen in `App.tsx` is registered as `name="ChatScreen"` (line 209). This is consistent. However the **tab screen** `Chats` navigates via `navigation.navigate('ChatScreen', {chat})` — this works because `ChatScreen` is the *stack* screen, not a tab. No bug, but confusing naming. Fine to leave.

---

## NAV-05 — Hardware Back Button Behavior in `ChatScreen` (**LOW**)

**File:** `screens/ChatScreen.tsx`

When the user presses the Android hardware back button from `ChatScreen`, the typing indicator state is not cleared:

```tsx
// No cleanup on navigation.goBack()
await firestore().collection('chats').doc(chat.id).update({typingUser: currentUser?.uid});
```

If the user starts typing, then presses back, `typingUser` remains set in Firestore, and the other user's chat screen will show "typing..." indefinitely until the next typing update.

**Fix:** Add a `navigation.addListener('beforeRemove', ...)` cleanup that clears `typingUser` on exit.

---

## NAV-06 — `ProfileScreen` Menu Navigates to `'DirectorDashboard'` Without Role Check (**LOW**)

**File:** `screens/ProfileScreen.tsx:523-529`

```tsx
{icon: '📊', label: 'Dashboard', screen: 'DirectorDashboard'},
```

This menu item is shown to ALL users regardless of role. Non-directors navigating to `DirectorDashboard` will see an empty or misleading dashboard. Not a crash, but a UX issue that could confuse actors who think they have a director account.

**Fix:** Filter menu items by `role === 'Director'` or `isApprovedDirector`.

---

## NAV-07 — `ContestDetailScreen` Calls `navigation.goBack()` Inside `useEffect` on Mount (**LOW**)

**File:** `screens/ContestDetailScreen.tsx:40-44`

```tsx
useEffect(() => {
  if (!contestId) {
    Alert.alert('Error', 'Contest not found.');
    navigation.goBack();
    return;
  }
  ...
}, [contestId]);
```

Calling `navigation.goBack()` synchronously inside a `useEffect` on mount is a React Navigation anti-pattern. The navigation state may not be ready to go back on the first render. The `Alert` will also not be dismissible before `goBack` executes.

**Fix:** Use `navigation.replace()` to navigate to a safe screen, or defer the goBack with `setTimeout(() => navigation.goBack(), 0)` and ensure the Alert is shown first.

---

## Screens Not in Navigator

| Screen File | Registered in App.tsx? |
|-------------|------------------------|
| ReelsScreen.tsx | NO |
| UploadReelsScreen.tsx | NO |
| All others in /screens | YES |

---

## Summary Table

| ID | File | Line | Issue | Severity |
|----|------|------|-------|----------|
| NAV-01 | ReelsScreen.tsx | 150, 238 | Navigate to unregistered screens | HIGH |
| NAV-02 | ChatListScreen.tsx, SavedAuditionsScreen.tsx | 254, 148 | Implicit tab navigate from stack | MEDIUM |
| NAV-03 | NotificationsScreen.tsx | 165 | ChatScreen navigate without chatId guard | MEDIUM |
| NAV-04 | AuditionDetailScreen.tsx | 328 | Naming consistency (no bug) | LOW |
| NAV-05 | ChatScreen.tsx | — | typingUser not cleared on back | LOW |
| NAV-06 | ProfileScreen.tsx | 523 | Dashboard shown to all roles | LOW |
| NAV-07 | ContestDetailScreen.tsx | 40 | goBack() inside mount useEffect | LOW |
