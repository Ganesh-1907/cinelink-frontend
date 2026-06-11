import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {Platform, Alert} from 'react-native';

// ── Navigation ref (set this up in App.tsx) ──────────────────
// We use a ref so the background handler can navigate without
// needing the NavigationContainer to be mounted.
let _navigator: any = null;
export const setNavigator = (ref: any) => {
  _navigator = ref;
};

const navigateTo = (screen: string, params?: any) => {
  if (_navigator?.isReady?.()) {
    _navigator.navigate(screen, params);
  }
};

// ── Map notification type → screen + params ──────────────────
const resolveNavigation = (data: any) => {
  const type = data?.type;
  if (!type) return null;

  if (
    ['contest_entry', 'contest_created', 'new_contest',
     'contest_deadline', 'contest_winner'].includes(type)
  ) {
    if (data.contestId) return {screen: 'ContestDetail', params: {contestId: data.contestId}};
    return {screen: 'Main', params: {screen: 'Contests'}};
  }
  if (type === 'message' && data.chatId) {
    return {screen: 'ChatScreen', params: {chatId: data.chatId}};
  }
  if (['casting_request', 'new_casting_request'].includes(type)) {
    return {screen: 'AdminReports', params: undefined};
  }
  if (['casting_approved', 'casting_rejected'].includes(type)) {
    return {screen: 'DirectorDashboard', params: undefined};
  }
  if (['request_accepted', 'request_rejected'].includes(type)) {
    return {screen: 'MyApplications', params: undefined};
  }
  if (['new_audition', 'shortlisted', 'selected', 'rejected', 'application'].includes(type)) {
    if (data.auditionId) return {screen: 'AuditionDetail', params: {auditionId: data.auditionId}};
  }
  if (['new_follower', 'connect_request', 'connect_accepted'].includes(type)) {
    if (data.senderId) return {screen: 'PublicProfile', params: {userId: data.senderId}};
  }
  return null;
};

// ── Background + quit-state handler (must be outside React) ──
// Call this once at the top of index.js BEFORE AppRegistry
export const registerBackgroundHandler = () => {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('BG message:', remoteMessage);
    // Nothing to do here — tapping the notification triggers
    // getInitialNotification / onNotificationOpenedApp instead.
  });
};

// ── Foreground message handler ────────────────────────────────
const handleForegroundMessage = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
  const {notification, data} = remoteMessage;
  if (!notification) return;

  Alert.alert(
    notification.title || '🔔 CineLink',
    notification.body || '',
    [
      {
        text: 'View',
        onPress: () => {
          const nav = resolveNavigation(data);
          if (nav) navigateTo(nav.screen, nav.params);
        },
      },
      {text: 'Dismiss', style: 'cancel'},
    ],
  );
};

// ── Tap handler (app in background, notification tapped) ──────
const handleNotificationTap = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
  const nav = resolveNavigation(remoteMessage.data);
  if (nav) navigateTo(nav.screen, nav.params);
};

// ── Main init (call from App.tsx when user logs in) ───────────
export const initNotifications = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) return;

    // Save token
    const token = await messaging().getToken();
    if (token) await saveFCMToken(token);

    // Refresh token
    messaging().onTokenRefresh(saveFCMToken);

    // Foreground messages
    messaging().onMessage(handleForegroundMessage);

    // App opened from background by tapping notification
    messaging().onNotificationOpenedApp(handleNotificationTap);

    // App opened from quit state by tapping notification
    const initial = await messaging().getInitialNotification();
    if (initial) handleNotificationTap(initial);

  } catch (e) {
    console.log('Notification init error:', e);
  }
};

export const saveFCMToken = async (token: string) => {
  const user = auth().currentUser;
  if (!user) return;
  try {
    await firestore()
      .collection('users')
      .doc(user.uid)
      .set({fcmToken: token, platform: Platform.OS}, {merge: true});
  } catch (e) {
    console.log('FCM token error:', e);
  }
};