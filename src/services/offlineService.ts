// CineLink Offline Support
// Enables Firestore offline persistence and provides connectivity awareness

import firestore from '@react-native-firebase/firestore';

let persistenceEnabled = false;

export function enableOfflinePersistence() {
  if (persistenceEnabled) return;
  try {
    firestore().settings({ persistence: true });
    persistenceEnabled = true;
    console.log('[Offline] Firestore persistence enabled');
  } catch (e) {
    console.warn('[Offline] Failed to enable persistence:', e);
  }
}

export function isOnline(): Promise<boolean> {
  return firestore().waitForPendingWrites().then(() => true).catch(() => false);
}
