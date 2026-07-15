/**
 * razorpaySubscriptionService.ts
 *
 * Client-side service for initiating premium subscription checkout via the backend API.
 * The backend creates the Razorpay subscription server-side to keep API secrets safe.
 * On success, the Razorpay webhook handler on the backend verifies payment and
 * updates Firestore premium fields using the Admin SDK.
 */

// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';
import auth from '@react-native-firebase/auth';
import api from '../api/client';
import type {PremiumTier} from '../types';

export type SubscriptionCheckoutResult =
  | {status: 'success'; paymentId: string; subscriptionId: string}
  | {status: 'cancelled'}
  | {status: 'error'; message: string};

/**
 * Opens Razorpay checkout for a premium subscription.
 *
 * Flow:
 *   1. Get Firebase ID token (sent automatically by api client)
 *   2. Call backend API to create a Razorpay subscription server-side
 *   3. Pass subscription_id to RazorpayCheckout.open()
 *   4. Return result (webhook handles Firestore write server-side)
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
    // ── Step 1: Create subscription via backend API ──────────────────────
    const result = await api.post('/payments/create-subscription', {tier, userId});
    const subscriptionId: string = result.subscriptionId;
    const keyId: string = result.keyId;

    if (!subscriptionId) {
      return {status: 'error', message: 'Server returned an invalid response.'};
    }

    // ── Step 2: Open Razorpay checkout ──────────────────────────────────
    const options = {
      key: keyId,
      subscription_id: subscriptionId,
      name: 'CineLink',
      description: `CineLink ${tier} subscription`,
      prefill: {
        name: user.displayName || '',
        email: user.email || '',
        contact: '',
      },
      theme: {color: '#D4AF37'},
    };

    return new Promise<SubscriptionCheckoutResult>(resolve => {
      RazorpayCheckout.open(options)
        .then((data: {razorpay_payment_id: string; razorpay_subscription_id: string}) => {
          // ⚠ Do NOT write premiumTier to Firestore here from the client.
          // The Razorpay webhook handler on the backend verifies the payment
          // server-side via webhook signature and writes to Firestore using
          // the Admin SDK. Trusting the client would allow users to grant
          // themselves premium by replaying this call.
          resolve({
            status: 'success',
            paymentId: data.razorpay_payment_id,
            subscriptionId: data.razorpay_subscription_id,
          });
        })
        .catch((error: {code: number; description?: string}) => {
          if (error.code === 2) {
            resolve({status: 'cancelled'});
          } else {
            resolve({
              status: 'error',
              message: error.description || 'Payment failed. Please try again.',
            });
          }
        });
    });
  } catch (err: any) {
    console.error('[RazorpaySubscription] Error:', err);
    return {status: 'error', message: err?.message || 'Something went wrong. Please try again.'};
  }
}
