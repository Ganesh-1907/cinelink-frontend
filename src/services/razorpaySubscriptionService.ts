// @ts-ignore — react-native-razorpay has no bundled TS types
import RazorpayCheckout from 'react-native-razorpay';
import auth from '@react-native-firebase/auth';
import type {PremiumTier} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY KEY ID (test mode)
// This key is already used in screens/PaymentScreen.tsx for one-off contest payments.
// Switch to rzp_live_XXXXXXXXXX here AND in PaymentScreen.tsx when going live.
// Found at: Razorpay Dashboard → Settings → API Keys → Test Key ID
// ─────────────────────────────────────────────────────────────────────────────
const RAZORPAY_KEY_ID = 'rzp_test_SuJZOYDYUYgzIY';

// ─────────────────────────────────────────────────────────────────────────────
// CLOUD FUNCTION URL
// After deploying (firebase deploy --only functions), find this URL at:
//   Firebase Console → Functions → createRazorpaySubscription → Trigger URL
// Or it prints to terminal on deploy. Region is asia-south1 (from your firebase.json).
//
// Format: https://asia-south1-YOUR_PROJECT_ID.cloudfunctions.net/createRazorpaySubscription
// ─────────────────────────────────────────────────────────────────────────────
const CREATE_SUBSCRIPTION_FUNCTION_URL =
  'https://asia-south1-REPLACE_WITH_YOUR_PROJECT_ID.cloudfunctions.net/createRazorpaySubscription';

export type SubscriptionCheckoutResult =
  | {status: 'success'; paymentId: string; subscriptionId: string}
  | {status: 'cancelled'}
  | {status: 'error'; message: string};

/**
 * Opens Razorpay checkout for a premium subscription.
 *
 * Flow:
 *   1. Get Firebase ID token (to authenticate the Cloud Function call)
 *   2. Call Cloud Function → returns a Razorpay subscription_id created server-side
 *   3. Pass subscription_id to RazorpayCheckout.open()
 *   4. On success, return paymentId + subscriptionId (server webhook handles Firestore write)
 */
export async function initiateSubscriptionCheckout(
  tier: Exclude<PremiumTier, 'none' | 'black'>,
  userId: string,
): Promise<SubscriptionCheckoutResult> {
  const user = auth().currentUser;
  if (!user) {
    return {status: 'error', message: 'You must be logged in to subscribe.'};
  }

  try {
    // ── Step 1: Firebase ID token for authenticating the Cloud Function ──────
    const idToken = await user.getIdToken();
    console.log('[RazorpaySubscription] Creating subscription for tier:', tier);

    // ── Step 2: Call Cloud Function to create subscription server-side ───────
    // The Cloud Function calls the Razorpay API using the secret key (never on client),
    // creates a subscription against the correct plan_id, and returns the subscription_id.
    const response = await fetch(CREATE_SUBSCRIPTION_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      // Firebase callable functions expect: {"data": {...}}
      body: JSON.stringify({data: {tier, userId}}),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[RazorpaySubscription] Cloud Function error:', response.status, body);
      return {status: 'error', message: 'Could not create subscription. Please try again.'};
    }

    const json = await response.json();
    // Firebase callable functions return: {"result": {...}}
    const subscriptionId: string | undefined = json.result?.subscriptionId;

    if (!subscriptionId) {
      console.error('[RazorpaySubscription] Missing subscriptionId in response:', json);
      return {status: 'error', message: 'Server returned an invalid response. Please contact support.'};
    }

    console.log('[RazorpaySubscription] Got subscriptionId:', subscriptionId, '— opening checkout');

    // ── Step 3: Open Razorpay checkout ───────────────────────────────────────
    const options = {
      key:             RAZORPAY_KEY_ID,
      subscription_id: subscriptionId,   // subscription flow — no "amount" field
      name:            'CineLink',
      description:     `CineLink ${tier} subscription`,
      prefill: {
        name:    user.displayName || '',
        email:   user.email || '',
        contact: '',
      },
      theme: {color: '#D4AF37'},
    };

    return new Promise<SubscriptionCheckoutResult>(resolve => {
      RazorpayCheckout.open(options)
        .then((data: {razorpay_payment_id: string; razorpay_subscription_id: string}) => {
          console.log('[RazorpaySubscription] Checkout success — paymentId:', data.razorpay_payment_id);
          // ⚠ Do NOT write premiumTier to Firestore here from the client.
          // The Razorpay webhook Cloud Function (Step 3 of the premium system)
          // verifies the payment server-side via webhook signature and writes
          // to Firestore using the Admin SDK. Trusting the client would allow
          // users to grant themselves premium by replaying this call.
          resolve({
            status: 'success',
            paymentId: data.razorpay_payment_id,
            subscriptionId: data.razorpay_subscription_id,
          });
        })
        .catch((error: {code: number; description?: string}) => {
          if (error.code === 2) {
            // Razorpay code 2 = user pressed back/dismissed checkout
            console.log('[RazorpaySubscription] User cancelled checkout.');
            resolve({status: 'cancelled'});
          } else {
            console.error('[RazorpaySubscription] Checkout failed:', error);
            resolve({
              status: 'error',
              message: error.description || 'Payment failed. Please try again.',
            });
          }
        });
    });
  } catch (err: any) {
    console.error('[RazorpaySubscription] Unexpected error:', err);
    return {status: 'error', message: err?.message || 'Something went wrong. Please try again.'};
  }
}
