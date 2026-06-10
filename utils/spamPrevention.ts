// ─────────────────────────────────────────────────────────────────────────────
// spamPrevention.ts — Rate limiting + spam prevention for CineLink
// Place this file at: CineLink/utils/spamPrevention.ts
// ─────────────────────────────────────────────────────────────────────────────

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {Alert} from 'react-native';

// ─── RATE LIMITS (customize as needed) ──────────────────────────────────────
const RATE_LIMITS: any = {
  auditions: {
    maxPerDay: 3,
    cooldownMinutes: 10,
    label: 'auditions',
  },
  films: {
    maxPerDay: 2,
    cooldownMinutes: 15,
    label: 'films',
  },
  contests: {
    maxPerDay: 2,
    cooldownMinutes: 10,
    label: 'contests',
  },
  comments: {
    maxPerDay: 30,
    cooldownMinutes: 1,
    label: 'comments',
  },
};

// Admin email — admins bypass all rate limits
const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com';

// ─── CHECK IF USER CAN POST ─────────────────────────────────────────────────
// Call this BEFORE allowing a post. Returns { allowed: true/false, message }

export async function canUserPost(
  collection: 'auditions' | 'films' | 'contests' | 'comments',
): Promise<{allowed: boolean; message: string}> {
  const currentUser = auth().currentUser;

  if (!currentUser) {
    return {allowed: false, message: 'You must be logged in to post.'};
  }

  // Admin bypasses all limits
  if (currentUser.email === ADMIN_EMAIL) {
    return {allowed: true, message: 'Admin - no limits.'};
  }

  const limits = RATE_LIMITS[collection];
  if (!limits) {
    return {allowed: true, message: 'No limits set.'};
  }

  try {
    // Get current time
    const now = new Date();

    // 1. Check cooldown (time since last post)
    const cooldownTime = new Date(
      now.getTime() - limits.cooldownMinutes * 60 * 1000,
    );

    const recentPost = await firestore()
      .collection(collection)
      .where('postedBy', '==', currentUser.uid)
      .where('createdAt', '>=', firestore.Timestamp.fromDate(cooldownTime))
      .limit(1)
      .get();

    if (!recentPost.empty) {
      const lastPost = recentPost.docs[0].data();
      const lastPostTime = lastPost.createdAt?.toDate();
      const waitMinutes = Math.ceil(
        (limits.cooldownMinutes * 60 * 1000 -
          (now.getTime() - lastPostTime.getTime())) /
          60000,
      );

      return {
        allowed: false,
        message: `Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before posting another ${limits.label.slice(0, -1)}.`,
      };
    }

    // 2. Check daily limit
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const todayPosts = await firestore()
      .collection(collection)
      .where('postedBy', '==', currentUser.uid)
      .where('createdAt', '>=', firestore.Timestamp.fromDate(startOfDay))
      .get();

    if (todayPosts.size >= limits.maxPerDay) {
      return {
        allowed: false,
        message: `You've reached the daily limit of ${limits.maxPerDay} ${limits.label}. Try again tomorrow.`,
      };
    }

    return {
      allowed: true,
      message: `OK. ${limits.maxPerDay - todayPosts.size} posts remaining today.`,
    };
  } catch (error: any) {
    console.warn('Spam check error:', error);
    // If check fails, allow the post (don't block due to errors)
    return {allowed: true, message: 'Check failed, allowing post.'};
  }
}

// ─── SHOW SPAM ALERT ─────────────────────────────────────────────────────────
// Convenience function — shows an alert if rate limited

export async function checkAndAlert(
  collection: 'auditions' | 'films' | 'contests' | 'comments',
): Promise<boolean> {
  const result = await canUserPost(collection);

  if (!result.allowed) {
    Alert.alert('⏳ Slow Down', result.message);
    return false;
  }

  return true;
}

// ─── CONTENT FILTER ──────────────────────────────────────────────────────────
// Basic text filter for inappropriate content

const BLOCKED_WORDS = [
  // Add words you want to filter out
  'scam',
  'fraud',
  'fake casting',
  'send money',
  'pay first',
  'casting couch',
];

export function containsBlockedContent(text: string): {
  blocked: boolean;
  reason: string;
} {
  const lowerText = text.toLowerCase();

  for (const word of BLOCKED_WORDS) {
    if (lowerText.includes(word)) {
      return {
        blocked: true,
        reason: `Your post contains restricted content ("${word}"). Please revise and try again.`,
      };
    }
  }

  // Check for excessive caps (spam indicator)
  const capsRatio =
    (text.match(/[A-Z]/g)?.length || 0) / text.length;
  if (text.length > 20 && capsRatio > 0.7) {
    return {
      blocked: true,
      reason: 'Please avoid using excessive capital letters.',
    };
  }

  // Check for excessive repeated characters
  if (/(.)\1{4,}/.test(text)) {
    return {
      blocked: true,
      reason: 'Please avoid repeating characters excessively.',
    };
  }

  return {blocked: false, reason: ''};
}

// ─── FULL PRE-POST CHECK ─────────────────────────────────────────────────────
// Combined check: rate limit + content filter

export async function prePostCheck(
  collection: 'auditions' | 'films' | 'contests' | 'comments',
  text: string,
): Promise<{allowed: boolean; message: string}> {
  // 1. Content filter
  const contentCheck = containsBlockedContent(text);
  if (contentCheck.blocked) {
    return {allowed: false, message: contentCheck.reason};
  }

  // 2. Rate limit
  const rateCheck = await canUserPost(collection);
  if (!rateCheck.allowed) {
    return {allowed: false, message: rateCheck.message};
  }

  return {allowed: true, message: 'OK'};
}