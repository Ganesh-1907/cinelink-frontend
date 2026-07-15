/**
 * CineLink Analytics Service
 *
 * Provides Firebase Analytics event tracking for key user actions.
 * Drop-in replacement for console.log-based tracking.
 */

let analytics: any = { logEvent: async () => {} };
try {
  analytics = require('@react-native-firebase/analytics').default;
} catch {}; // Graceful fallback if analytics not installed

export async function trackEvent(eventName: string, params?: Record<string, any>) {
  try {
    await analytics().logEvent(eventName, params);
  } catch (e) {
    // Analytics should never crash the app
    console.warn('[Analytics] Failed to log event:', eventName);
  }
}

// ── Auth Events ──
export const trackSignUp = (method: string) => trackEvent('sign_up', { method });
export const trackLogin = (method: string) => trackEvent('login', { method });

// ── Content Events ──
export const trackPostAudition = () => trackEvent('post_audition');
export const trackApplyAudition = (auditionId: string) => trackEvent('apply_audition', { audition_id: auditionId });
export const trackUploadFilm = () => trackEvent('upload_film');
export const trackCreateContest = () => trackEvent('create_contest');
export const trackEnterContest = (contestId: string) => trackEvent('enter_contest', { contest_id: contestId });
export const trackSendMessage = () => trackEvent('send_message');
export const trackFollowUser = () => trackEvent('follow_user');

// ── Payment Events ──
export const trackPurchasePremium = (tier: string, amount: number) =>
  trackEvent('purchase_premium', { tier, amount });
export const trackContestPayment = (contestId: string, amount: number) =>
  trackEvent('contest_payment', { contest_id: contestId, amount });

// ── Engagement Events ──
export const trackScreenView = (screenName: string) =>
  trackEvent('screen_view', { screen_name: screenName });
export const trackShare = (contentType: string) =>
  trackEvent('share', { content_type: contentType });

// ── Screen Tracking (call in useEffect for each screen) ──
export const useScreenTracking = (screenName: string) => {
  const React = require('react');
  React.useEffect(() => {
    trackScreenView(screenName);
  }, [screenName]);
};
