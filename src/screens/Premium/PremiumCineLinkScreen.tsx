import React, {useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import {usePremiumStatus} from '../../../hooks/usePremiumStatus';
import {initiateSubscriptionCheckout} from '../../services/razorpaySubscriptionService';
import type {PremiumTier} from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// LINEAR GRADIENT — not yet installed.
// To enable gold gradient buttons and tier-name text:
//   1. npm install react-native-linear-gradient
//   2. npx react-native run-android   (native rebuild required)
//   3. Replace the <TouchableOpacity style={styles.subscribeBtn}> wrapper below
//      with: <LinearGradient colors={['#D4AF37','#F4E5C2']} start={{x:0,y:0}}
//             end={{x:1,y:0}} style={styles.subscribeBtn}>
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg:      '#0D0D0D',
  surface: '#1A1A1A',
  gold:    '#D4AF37',
  goldEnd: '#F4E5C2',
  border:  'rgba(212, 175, 55, 0.4)',
  text:    '#F5F5F0',
  muted:   '#8A8A85',
};

type TierKey = Exclude<PremiumTier, 'none' | 'black'>;

interface TierConfig {
  key: TierKey;
  name: string;
  price: number;
  duration: string;
  durationMonths: number;
  popular?: boolean;
  features: string[];
}

const TIERS: TierConfig[] = [
  {
    key: 'spotlight',
    name: 'Spotlight',
    price: 299,
    duration: '1 month',
    durationMonths: 1,
    features: [
      'Profile boost in search results',
      'Verified badge on your profile',
      '5× more audition applications',
      'Priority in casting matches',
    ],
  },
  {
    key: 'marquee',
    name: 'Marquee',
    price: 699,
    duration: '3 months',
    durationMonths: 3,
    popular: true,
    features: [
      'Everything in Spotlight',
      'Featured in industry directory',
      'Resume builder access',
      'Exclusive casting alerts',
    ],
  },
  {
    key: 'premiere',
    name: 'Premiere',
    price: 1299,
    duration: '6 months',
    durationMonths: 6,
    features: [
      'Everything in Marquee',
      'Top placement on audition lists',
      'Priority casting requests',
      'Analytics dashboard',
    ],
  },
  {
    key: 'premiereElite',
    name: 'Premiere Elite',
    price: 2499,
    duration: '12 months',
    durationMonths: 12,
    features: [
      'Everything in Premiere',
      'Maximum profile visibility',
      'VIP industry support',
      'Annual industry insights report',
    ],
  },
];

export default function PremiumCineLinkScreen({navigation}: any) {
  const user = auth().currentUser;
  const {isPremium, tier: currentTier, expiryDate, isExpiringSoon, loading} = usePremiumStatus();
  const [processingTier, setProcessingTier] = useState<TierKey | null>(null);

  const handleSubscribe = async (tier: TierKey) => {
    if (!user?.uid) {
      Alert.alert('Not logged in', 'Please log in to subscribe.');
      return;
    }
    setProcessingTier(tier);
    try {
      const result = await initiateSubscriptionCheckout(tier, user.uid);
      if (result.status === 'success') {
        Alert.alert(
          '✦ Subscribed!',
          'Your CineLink Premium subscription is being activated. This may take a moment to reflect on your profile.',
          [{text: 'Done', onPress: () => navigation.goBack()}],
        );
      } else if (result.status === 'error') {
        // Suppress the "not yet configured" error silently — the subscription
        // backend hasn't been deployed yet; showing a payment-failure Alert
        // when the user hasn't even seen a checkout is confusing.
        const isConfigError = result.message.includes('not yet configured');
        if (!isConfigError) {
          Alert.alert('Payment Failed', result.message);
        }
      }
      // status === 'cancelled': user dismissed checkout, do nothing
    } finally {
      setProcessingTier(null);
    }
  };

  const formatExpiry = (date: Date) =>
    date.toLocaleDateString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'});

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.gold} style={{marginTop: 60}} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CineLink Premium</Text>
        <Text style={styles.headerSub}>Unlock your full potential in the industry</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* CURRENT PLAN BANNER */}
        {isPremium && expiryDate && (
          <View style={styles.currentPlanCard}>
            <Text style={styles.currentPlanLabel}>Your Current Plan</Text>
            <Text style={styles.currentPlanTier}>
              {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Text>
            <Text style={[styles.currentPlanExpiry, isExpiringSoon && styles.expiryWarning]}>
              {isExpiringSoon ? '⚠ Renews in under 3 days — ' : 'Active until '}
              {formatExpiry(expiryDate)}
            </Text>
          </View>
        )}

        {/* TIER CARDS */}
        {TIERS.map(tier => {
          const isCurrentTier = isPremium && currentTier === tier.key;
          const isProcessing = processingTier === tier.key;

          return (
            <View
              key={tier.key}
              style={[styles.tierCard, isCurrentTier && styles.tierCardActive]}>

              {tier.popular && !isCurrentTier && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}

              {isCurrentTier && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>✓ YOUR PLAN</Text>
                </View>
              )}

              <Text style={styles.tierName}>{tier.name}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceSymbol}>₹</Text>
                <Text style={styles.priceAmount}>{tier.price}</Text>
                <Text style={styles.priceDuration}> / {tier.duration}</Text>
              </View>

              {tier.durationMonths > 1 && (
                <Text style={styles.perMonth}>
                  ₹{Math.round(tier.price / tier.durationMonths)}/month
                </Text>
              )}

              <View style={styles.featureList}>
                {tier.features.map((feature, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Text style={styles.featureDot}>✦</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {isCurrentTier ? (
                <View style={styles.activePlanBtn}>
                  <Text style={styles.activePlanBtnText}>Active Plan</Text>
                </View>
              ) : (
                // TODO (LinearGradient): replace TouchableOpacity with
                // <LinearGradient colors={['#D4AF37','#F4E5C2']} start={{x:0,y:0}}
                //   end={{x:1,y:0}} style={styles.subscribeBtn}>
                //   <Text style={styles.subscribeBtnText}>...</Text>
                // </LinearGradient>
                <TouchableOpacity
                  style={[styles.subscribeBtn, isProcessing && styles.subscribeBtnDisabled]}
                  onPress={() => handleSubscribe(tier.key)}
                  disabled={isProcessing || processingTier !== null}
                  activeOpacity={0.85}>
                  {isProcessing ? (
                    <ActivityIndicator color={C.bg} />
                  ) : (
                    <Text style={styles.subscribeBtnText}>Subscribe — ₹{tier.price}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <Text style={styles.footerNote}>
          Subscriptions are billed in advance and auto-renew. Cancel anytime from Settings.
          {'\n'}Prices are inclusive of GST. Powered by Razorpay.
        </Text>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   {flex: 1, backgroundColor: C.bg},
  header:      {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20},
  backBtn:     {marginBottom: 14},
  backBtnText: {color: C.gold, fontSize: 15, fontWeight: '600'},
  headerTitle: {color: C.text, fontSize: 26, fontWeight: 'bold', marginBottom: 6},
  headerSub:   {color: C.muted, fontSize: 13},

  scroll: {paddingHorizontal: 16, paddingTop: 4},

  currentPlanCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 18,
    marginBottom: 20, borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  currentPlanLabel:  {color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6},
  currentPlanTier:   {color: C.gold, fontSize: 22, fontWeight: 'bold', marginBottom: 4},
  currentPlanExpiry: {color: C.muted, fontSize: 13},
  expiryWarning:     {color: '#E8A838'},

  tierCard: {
    backgroundColor: C.surface, borderRadius: 18, padding: 22,
    marginBottom: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  tierCardActive: {borderColor: C.gold, borderWidth: 1.5},

  popularBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: C.gold, borderBottomLeftRadius: 12,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  popularBadgeText: {color: C.bg, fontSize: 10, fontWeight: '800', letterSpacing: 1},

  activeBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: 'rgba(212,175,55,0.15)', borderBottomLeftRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  activeBadgeText: {color: C.gold, fontSize: 10, fontWeight: '700', letterSpacing: 1},

  tierName: {color: C.gold, fontSize: 20, fontWeight: 'bold', marginBottom: 10, marginTop: 4},

  priceRow:     {flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4},
  priceSymbol:  {color: C.text, fontSize: 18, fontWeight: '600', lineHeight: 38},
  priceAmount:  {color: C.text, fontSize: 36, fontWeight: 'bold', lineHeight: 42},
  priceDuration: {color: C.muted, fontSize: 14, marginBottom: 6},
  perMonth:     {color: C.muted, fontSize: 12, marginBottom: 18},

  featureList: {marginBottom: 22, marginTop: 14, gap: 10},
  featureRow:  {flexDirection: 'row', gap: 10, alignItems: 'flex-start'},
  featureDot:  {color: C.gold, fontSize: 11, marginTop: 3},
  featureText: {color: C.text, fontSize: 14, flex: 1, lineHeight: 20, fontWeight: '300'},

  subscribeBtn: {
    backgroundColor: C.gold, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  subscribeBtnDisabled: {opacity: 0.55},
  subscribeBtnText: {color: C.bg, fontSize: 16, fontWeight: 'bold'},

  activePlanBtn: {
    backgroundColor: 'rgba(212,175,55,0.10)', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  activePlanBtnText: {color: C.gold, fontSize: 15, fontWeight: '600'},

  footerNote: {
    color: C.muted, fontSize: 11, textAlign: 'center',
    lineHeight: 18, paddingHorizontal: 16, marginTop: 8,
  },
});
