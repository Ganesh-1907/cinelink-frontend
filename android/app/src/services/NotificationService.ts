import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {Platform} from 'react-native';

export const initNotifications = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) return;
    const token = await messaging().getToken();
    if (token) await saveFCMToken(token);
    messaging().onTokenRefresh(async newToken => {
      await saveFCMToken(newToken);
    });
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
      .set(
        {fcmToken: token, platform: Platform.OS},
        {merge: true},
      );
  } catch (e) {
    console.log('FCM token error:', e);
  }
};