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
  displayName?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  photoUrl?: string | null;
  role: string | null;
  bio?: string;
  location?: string;
  isApprovedDirector?: boolean;
  isAdmin?: boolean;
  isOnline?: boolean;
  lastSeen?: FirebaseFirestoreTypes.Timestamp;
  fcmToken?: string;
  profileLikes?: number;
  profileLikedBy?: string[];
  profileViews?: number;
  votedEntries?: string[];
  createdAt?: FirebaseFirestoreTypes.Timestamp;

  // ── Premium fields — written by server only ──────────────────────────────
  premiumTier: PremiumTier;
  premiumExpiry: FirebaseFirestoreTypes.Timestamp | null;
  verifiedReal: boolean;
  subscriptionId: string | null;
  monthlyApplicationCount: number;
  isTopDirector: boolean;
  verifiedProductionHouse: boolean;

  // ── Portfolio ──
  introVideoLink?: string;
  portfolio1?: string;
  portfolio2?: string;
  portfolio3?: string;
  portfolioPhotos?: string[];
  portfolioMedia?: string[];
  instagramLink?: string;
  youtubeLink?: string;
  ageRange?: string;
  height?: string;
  bodyType?: string;
  availabilityStatus?: string;
  lookingFor?: string;
  profileTags?: string[];
  verificationStatus?: string;
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
