import React, {useEffect, useRef} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';

interface CompletionItem {
  label: string;
  done: boolean;
  emoji: string;
  points: number;
}

interface Props {
  name: string;
  phone: string;
  bio: string;
  photoUrl: string;
  role: string;
  portfolioPhotos: string[];
  introVideoLink: string;
  portfolio1: string;
  onItemPress?: () => void;
}

export default function ProfileCompletionCard({
  name, phone, bio, photoUrl, role,
  portfolioPhotos, introVideoLink, portfolio1,
  onItemPress,
}: Props) {

  const items: CompletionItem[] = [
    {label: 'Add your full name',     emoji: '👤', done: !!name?.trim(),            points: 20},
    {label: 'Add profile photo',      emoji: '📸', done: !!photoUrl,                points: 20},
    {label: 'Write your bio',         emoji: '✍️',  done: !!bio?.trim(),             points: 15},
    {label: 'Add phone number',       emoji: '📱', done: !!phone?.trim(),           points: 15},
    {label: 'Select your role',       emoji: '🎭', done: !!role && role !== '',     points: 10},
    {label: 'Add portfolio photos',   emoji: '🖼️',  done: portfolioPhotos?.length > 0, points: 10},
    {label: 'Add intro video link',   emoji: '🎬', done: !!introVideoLink?.trim(), points: 5},
    {label: 'Add previous works',     emoji: '🔗', done: !!portfolio1?.trim(),      points: 5},
  ];

  const totalPoints = items.reduce((sum, i) => sum + i.points, 0);
  const earnedPoints = items.filter(i => i.done).reduce((sum, i) => sum + i.points, 0);
  const percent = Math.round((earnedPoints / totalPoints) * 100);

  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: percent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const pending = items.filter(i => !i.done);

  const getColor = () => {
    if (percent >= 80) return '#4ADE80'; // green
    if (percent >= 50) return '#FBBF24'; // yellow
    return '#C9956C';                    // orange
  };

  const getMessage = () => {
    if (percent === 100) return '🌟 Perfect profile! You\'re all set!';
    if (percent >= 80) return '🔥 Almost there! Just a few more steps.';
    if (percent >= 50) return '💪 Good progress! Keep going.';
    return '🚀 Complete your profile to get discovered!';
  };

  if (percent === 100) {
    return (
      <View style={[styles.card, styles.completeCard]}>
        <Text style={styles.completeEmoji}>🌟</Text>
        <Text style={styles.completeTitle}>Profile Complete!</Text>
        <Text style={styles.completeSub}>You're fully set up to get discovered</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Profile Strength</Text>
          <Text style={styles.message}>{getMessage()}</Text>
        </View>
        <View style={[styles.percentBadge, {backgroundColor: getColor() + '20', borderColor: getColor()}]}>
          <Text style={[styles.percentText, {color: getColor()}]}>{percent}%</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: animWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: getColor(),
            },
          ]}
        />
      </View>

      <Text style={styles.pendingLabel}>
        {pending.length} item{pending.length !== 1 ? 's' : ''} remaining:
      </Text>

      {/* Pending items */}
      <View style={styles.itemsList}>
        {pending.slice(0, 4).map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.item}
            onPress={onItemPress}
            activeOpacity={0.7}>
            <Text style={styles.itemEmoji}>{item.emoji}</Text>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>+{item.points}%</Text>
            </View>
          </TouchableOpacity>
        ))}
        {pending.length > 4 && (
          <Text style={styles.moreText}>+{pending.length - 4} more items</Text>
        )}
      </View>

      {/* Completed items preview */}
      <View style={styles.doneRow}>
        {items.filter(i => i.done).map((item, i) => (
          <View key={i} style={styles.doneChip}>
            <Text style={styles.doneEmoji}>{item.emoji}</Text>
            <Text style={styles.doneCheck}>✓</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C1C',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  completeCard: {
    alignItems: 'center',
    paddingVertical: 24,
    borderColor: '#4ADE80',
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
  },
  completeEmoji: {fontSize: 40, marginBottom: 8},
  completeTitle: {color: '#4ADE80', fontSize: 18, fontWeight: 'bold', marginBottom: 4},
  completeSub: {color: '#A09080', fontSize: 13},

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4},
  message: {color: '#A09080', fontSize: 12, maxWidth: '80%'},

  percentBadge: {
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 10, paddingVertical: 4,
    minWidth: 52, alignItems: 'center',
  },
  percentText: {fontSize: 18, fontWeight: 'bold'},

  barBackground: {
    height: 8, backgroundColor: '#2A2A2A',
    borderRadius: 4, marginBottom: 14, overflow: 'hidden',
  },
  barFill: {height: '100%', borderRadius: 4},

  pendingLabel: {
    color: '#A09080', fontSize: 12,
    fontWeight: '600', marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  itemsList: {gap: 8, marginBottom: 14},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12, padding: 12, gap: 10,
  },
  itemEmoji: {fontSize: 18},
  itemLabel: {flex: 1, color: '#FFFFFF', fontSize: 14},
  pointsBadge: {
    backgroundColor: '#FF6B3520',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#C9956C',
  },
  pointsText: {color: '#C9956C', fontSize: 11, fontWeight: 'bold'},

  doneRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  doneChip: {
    backgroundColor: '#064E3B',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: '#4ADE80',
  },
  doneEmoji: {fontSize: 12},
  doneCheck: {color: '#4ADE80', fontSize: 11, fontWeight: 'bold'},

  moreText: {color: '#A09080', fontSize: 12, textAlign: 'center', marginTop: 4},
});