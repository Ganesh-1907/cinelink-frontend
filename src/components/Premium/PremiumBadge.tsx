import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {PremiumTier} from '../../types';

// When react-native-linear-gradient is installed, replace the solid-color
// container View with:
//   <LinearGradient colors={['#D4AF37', '#F4E5C2']} start={{x:0,y:0}} end={{x:1,y:0}} style={...}>
// For the 'black' tier use: colors={['#2A1F00', '#B8860B']}

interface PremiumBadgeProps {
  tier: PremiumTier | string;
  verifiedReal: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ICON_SIZE: Record<'small' | 'medium' | 'large', number> = {
  small:  12,
  medium: 16,
  large:  24,
};

const GOLD    = '#D4AF37';
const GOLD_DK = '#B8860B';

export default function PremiumBadge({tier, verifiedReal, size = 'medium'}: PremiumBadgeProps) {
  const isPremium = tier !== 'none' && !!tier;
  if (!isPremium && !verifiedReal) return null;

  const fontSize = ICON_SIZE[size];
  const isBlack  = tier === 'black';

  return (
    <View style={styles.row}>

      {/* Tier badge */}
      {isPremium && (
        <View style={[
          styles.badge,
          isBlack ? styles.badgeBlack : styles.badgeGold,
          {paddingHorizontal: size === 'small' ? 3 : 5, paddingVertical: size === 'small' ? 1 : 2},
        ]}>
          <Text style={[styles.icon, {fontSize, color: isBlack ? GOLD_DK : GOLD}]}>
            {isBlack ? '◆' : '♛'}
          </Text>
        </View>
      )}

      {/* Verified checkmark */}
      {verifiedReal && (
        <View style={[
          styles.badge,
          styles.badgeVerified,
          {paddingHorizontal: size === 'small' ? 3 : 5, paddingVertical: size === 'small' ? 1 : 2},
          isPremium && {marginLeft: 3},
        ]}>
          <Text style={[styles.icon, {fontSize, color: GOLD}]}>✓</Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Solid gold — swap for LinearGradient when installed
  badgeGold: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(212,175,55,0.5)',
  },
  badgeBlack: {
    backgroundColor: 'rgba(26,15,0,0.8)',
    borderWidth: 0.5,
    borderColor: GOLD_DK,
  },
  badgeVerified: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  icon: {
    lineHeight: undefined,
    includeFontPadding: false,
  },
});
