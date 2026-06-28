import {onCall, HttpsError} from 'firebase-functions/v2/https';
// TODO Step A: uncomment after running  npm install  inside /functions
// import Razorpay from 'razorpay';

// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY PLAN IDs  ← one-time manual setup, see instructions below
//
// You must create one Plan per tier in Razorpay Dashboard before this works:
//   Dashboard → Products → Subscriptions → Plans → + Create Plan
//
//   Tier             | Amount  | Period  | Interval | Count
//   ─────────────────|─────────|─────────|──────────|──────
//   Spotlight        | ₹299    | monthly | 1        | 1
//   Marquee          | ₹699    | monthly | 3        | 1
//   Premiere         | ₹1299   | monthly | 6        | 1
//   Premiere Elite   | ₹2499   | yearly  | 1        | 1
//
// After creating each plan, paste the generated plan_XXXXXXXXXXXX IDs below.
// Use TEST mode plan IDs until Razorpay activates your live account.
// ─────────────────────────────────────────────────────────────────────────────
const TIER_PLAN_IDS: Record<string, string> = {
  spotlight:    'plan_REPLACE_WITH_SPOTLIGHT_PLAN_ID',
  marquee:      'plan_REPLACE_WITH_MARQUEE_PLAN_ID',
  premiere:     'plan_REPLACE_WITH_PREMIERE_PLAN_ID',
  premiereElite: 'plan_REPLACE_WITH_PREMIERE_ELITE_PLAN_ID',
};

// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY API CREDENTIALS  ← server-side only, never expose on the client
//
// Store as Firebase secrets (recommended for production):
//   firebase functions:secrets:set RAZORPAY_KEY_ID
//   firebase functions:secrets:set RAZORPAY_KEY_SECRET
//
// For local emulator testing, create functions/.env with:
//   RAZORPAY_KEY_ID=rzp_test_SuJZOYDYUYgzIY
//   RAZORPAY_KEY_SECRET=your_test_secret_from_dashboard
//
// Your test Key ID is: rzp_test_SuJZOYDYUYgzIY
// Your test Key Secret is found at: Razorpay Dashboard → Settings → API Keys
// ─────────────────────────────────────────────────────────────────────────────
const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     ?? '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';

type SupportedTier = 'spotlight' | 'marquee' | 'premiere' | 'premiereElite';

interface CreateSubscriptionData {
  tier: SupportedTier;
  userId: string;
}

export const createRazorpaySubscription = onCall<CreateSubscriptionData>(
  {region: 'asia-south1'},
  async (request) => {
    // ── Auth guard ────────────────────────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in to subscribe.');
    }
    if (request.auth.uid !== request.data.userId) {
      throw new HttpsError('permission-denied', 'userId must match the authenticated user.');
    }

    const {tier, userId} = request.data;

    if (!TIER_PLAN_IDS[tier] || TIER_PLAN_IDS[tier].startsWith('plan_REPLACE')) {
      throw new HttpsError(
        'failed-precondition',
        `Plan ID for tier "${tier}" has not been configured. See TIER_PLAN_IDS in createSubscription.ts.`,
      );
    }
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new HttpsError(
        'failed-precondition',
        'Razorpay API credentials are not set. See environment variable instructions in createSubscription.ts.',
      );
    }

    const planId = TIER_PLAN_IDS[tier];
    console.log(`[createRazorpaySubscription] Creating subscription — tier=${tier}, userId=${userId}, planId=${planId}`);

    // ─────────────────────────────────────────────────────────────────────────
    // TODO Step B: Replace this stub with the real Razorpay API call.
    //
    // Prerequisites:
    //   1. Complete Step A (npm install in /functions)
    //   2. Fill in TIER_PLAN_IDS above with real plan_XXXX IDs from the Dashboard
    //   3. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (see instructions above)
    //
    // Then replace everything below the TODO with:
    //
    //   const razorpay = new Razorpay({
    //     key_id:     RAZORPAY_KEY_ID,
    //     key_secret: RAZORPAY_KEY_SECRET,
    //   });
    //
    //   const subscription = await razorpay.subscriptions.create({
    //     plan_id:         planId,
    //     total_count:     1,   // 1 billing cycle (user renews manually or auto-renews)
    //     quantity:        1,
    //     customer_notify: 1,   // Razorpay emails the customer on charge
    //     notes:           {userId, tier},
    //   });
    //
    //   console.log('[createRazorpaySubscription] Created:', subscription.id);
    //   return {subscriptionId: subscription.id};
    //
    // ─────────────────────────────────────────────────────────────────────────

    throw new HttpsError(
      'unimplemented',
      'Razorpay subscription creation is a stub. Complete the TODOs in functions/src/createSubscription.ts.',
    );
  },
);
