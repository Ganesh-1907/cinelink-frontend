import {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';

// ── Premium tiers ────────────────────────────────────────────────────────────
export type PremiumTier =
  | 'none'
  | 'spotlight'
  | 'marquee'
  | 'premiere'
  | 'premiereElite'
  | 'black';

// ── Core user document (mirrors users/{uid} in Firestore) ────────────────────
export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL?: string | null;
  role: 'actor' | 'director' | 'admin' | null;
  bio?: string;
  isApprovedDirector?: boolean;
  isOnline?: boolean;
  lastSeen?: FirebaseFirestoreTypes.Timestamp;
  fcmToken?: string;
  profileLikes?: number;
  profileLikedBy?: string[];
  profileViews?: number;
  votedEntries?: string[];
  createdAt?: FirebaseFirestoreTypes.Timestamp;

  // ── Premium fields — written by Cloud Functions only ──────────────────────
  premiumTier: PremiumTier;
  premiumExpiry: FirebaseFirestoreTypes.Timestamp | null;
  verifiedReal: boolean;
  subscriptionId: string | null;
  monthlyApplicationCount: number;
  isTopDirector: boolean;
  verifiedProductionHouse: boolean;
}

// ── Subscription ledger (subscriptions/{id}) ─────────────────────────────────
export interface Subscription {
  id: string;
  userId: string;
  tier: Exclude<PremiumTier, 'none'>;
  paymentId: string;
  startDate: FirebaseFirestoreTypes.Timestamp;
  endDate: FirebaseFirestoreTypes.Timestamp;
  status: 'active' | 'expired' | 'cancelled';
}
