import React, {useRef, useState} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, FlatList, StatusBar, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LiquidPress} from '../components/LiquidPress';

const {width, height} = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🎬',
    title: 'Welcome to CineLink',
    subtitle: "India's #1 Cinema Network",
    description: 'Connect with actors, directors, writers and film industry professionals across India.',
    bg: '#0A0A0A',
    accent: '#C9956C',
  },
  {
    id: '2',
    emoji: '🎭',
    title: 'Find Auditions',
    subtitle: 'Your Break Awaits',
    description: 'Browse hundreds of audition opportunities from top directors and production houses across India.',
    bg: '#0A0A0A',
    accent: '#C9956C',
  },
  {
    id: '3',
    emoji: '🤝',
    title: 'Build Your Network',
    subtitle: 'Connect & Collaborate',
    description: 'Message directors, join crew teams, and collaborate on short films, web series and more.',
    bg: '#0A0A0A',
    accent: '#C9956C',
  },
  {
    id: '4',
    emoji: '⭐',
    title: 'Showcase Talent',
    subtitle: 'Your Portfolio, Your Story',
    description: 'Upload your portfolio, acting reels and previous works. Get discovered by top filmmakers.',
    bg: '#0A0A0A',
    accent: '#C9956C',
  },
];

interface OnboardingProps {
  onDone: () => void;
}

export default function OnboardingScreen({onDone}: OnboardingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleDone = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    onDone();
  };

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({index: currentIndex + 1, animated: true});
      setCurrentIndex(currentIndex + 1);
    } else {
      handleDone();
    }
  };

  const renderSlide = ({item}: any) => (
    <View style={styles.slide}>
      {/* Big emoji icon */}
      <View style={styles.emojiContainer}>
        <View style={[styles.emojiCircle, {borderColor: item.accent}]}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>
        {/* Decorative rings */}
        <View style={[styles.ring1, {borderColor: item.accent + '30'}]} />
        <View style={[styles.ring2, {borderColor: item.accent + '15'}]} />
      </View>

      {/* Text content */}
      <View style={styles.textContent}>
        <Text style={[styles.subtitle, {color: item.accent}]}>{item.subtitle}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsRow}>
      {SLIDES.map((_, index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={index}
            style={[styles.dot, {width: dotWidth, opacity}]}
          />
        );
      })}
    </View>
  );

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleDone}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: false},
        )}
        onMomentumScrollEnd={e => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {renderDots()}

        <LiquidPress
          style={[styles.nextBtn, isLastSlide && styles.nextBtnLast]}
          onPress={goNext}>
          <Text style={styles.nextBtnText}>
            {isLastSlide ? '🚀 Get Started' : 'Next →'}
          </Text>
        </LiquidPress>

        {isLastSlide && (
          <Text style={styles.termsText}>
            By continuing you agree to CineLink's Terms & Privacy Policy
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},

  skipBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipText: {color: '#A09080', fontSize: 14, fontWeight: '600'},

  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 80,
  },

  emojiContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },

  emojiCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#1C1C1C',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },

  ring1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
  },

  ring2: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
  },

  emoji: {fontSize: 60},

  textContent: {alignItems: 'center'},

  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },

  description: {
    color: '#A09080',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 10,
  },

  bottomSection: {
    paddingBottom: 50,
    paddingHorizontal: 30,
    alignItems: 'center',
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    gap: 6,
  },

  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C9956C',
  },

  nextBtn: {
    width: '100%',
    backgroundColor: '#C9956C',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },

  nextBtnLast: {
    backgroundColor: '#C9956C',
    shadowColor: '#C9956C',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },

  termsText: {
    color: '#A09080',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});