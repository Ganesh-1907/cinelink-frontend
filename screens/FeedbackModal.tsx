import React, {useState, useEffect} from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView, Platform, Dimensions,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import crashlytics from '@react-native-firebase/crashlytics';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  screenName?: string;
}

const STARS = [1, 2, 3, 4, 5];
const SCREEN_WIDTH = Dimensions.get('window').width;

type FeedbackType = 'feedback' | 'bug' | 'feature';

export default function FeedbackModal({visible, onClose, screenName}: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feedback');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const user = auth().currentUser;

  useEffect(() => {
    if (!visible) {
      setRating(0);
      setMessage('');
      setSubmitted(false);
      setFeedbackType('feedback');
    }
  }, [visible]);

  const getDeviceInfo = () => ({
    platform: Platform.OS,
    osVersion: Platform.Version,
    screenWidth: SCREEN_WIDTH,
    timestamp: new Date().toISOString(),
  });

  const handleSubmit = async () => {
    if (feedbackType === 'feedback' && rating === 0) {
      Alert.alert('Please rate', 'Tap a star to give a rating first!');
      return;
    }
    if (!message.trim() && feedbackType !== 'feedback') {
      Alert.alert('Required', 'Please describe the issue or feature request.');
      return;
    }
    setSubmitting(true);
    try {
      const doc: any = {
        type: feedbackType,
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || '',
        message: message.trim(),
        screenName: screenName || 'unknown',
        deviceInfo: getDeviceInfo(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      if (feedbackType === 'feedback') doc.rating = rating;

      await firestore().collection('feedback').add(doc);

      if (feedbackType === 'bug') {
        crashlytics().log(`Bug report from ${user?.email}: ${message}`);
      }

      setSubmitted(true);
    } catch (e) {
      Alert.alert('Error', 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setMessage('');
    setSubmitted(false);
    setFeedbackType('feedback');
    onClose();
  };

  if (submitted) {
    return (
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.thanksEmoji}>{feedbackType === 'bug' ? '🛠️' : feedbackType === 'feature' ? '🚀' : '❤️'}</Text>
            <Text style={styles.thanksTitle}>
              {feedbackType === 'bug' ? 'Bug Reported!' : feedbackType === 'feature' ? 'Great Idea!' : 'Thank You!'}
            </Text>
            <Text style={styles.thanksText}>
              {feedbackType === 'bug'
                ? 'We\'ll investigate and fix this issue. Your app stability helps everyone!'
                : feedbackType === 'feature'
                ? 'We review every suggestion and prioritize based on community demand.'
                : 'Your feedback helps us make CineLink better for everyone!'}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const typeLabels: Record<FeedbackType, { label: string; icon: string; color: string }> = {
    feedback: { label: 'Feedback', icon: '💬', color: '#C9956C' },
    bug: { label: 'Bug Report', icon: '🐛', color: '#F87171' },
    feature: { label: 'Feature Request', icon: '💡', color: '#4ADE80' },
  };

  const currentType = typeLabels[feedbackType];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Help us improve CineLink</Text>

          <View style={styles.typeRow}>
            {(Object.entries(typeLabels) as [FeedbackType, typeof currentType][]).map(([key, val]) => (
              <TouchableOpacity
                key={key}
                style={[styles.typeChip, feedbackType === key && { backgroundColor: val.color + '30', borderColor: val.color }]}
                onPress={() => setFeedbackType(key)}>
                <Text style={styles.typeIcon}>{val.icon}</Text>
                <Text style={[styles.typeLabel, feedbackType === key && { color: val.color }]}>{val.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.scrollArea}>
            {feedbackType === 'feedback' && (
              <>
                <Text style={styles.sectionTitle}>Rate your experience</Text>
                <View style={styles.starsRow}>
                  {STARS.map(s => (
                    <TouchableOpacity key={s} onPress={() => setRating(s)}>
                      <Text style={[styles.star, s <= rating && styles.starActive]}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {rating > 0 && (
                  <Text style={styles.ratingText}>
                    {rating <= 2 ? 'We\'re sorry! Tell us how to improve.' :
                     rating === 3 ? 'Thanks! Any suggestions?' :
                     'Great! What do you love?'}
                  </Text>
                )}
              </>
            )}

            {feedbackType === 'bug' && (
              <>
                <Text style={styles.sectionTitle}>What went wrong?</Text>
                <Text style={styles.hint}>Describe the steps to reproduce this issue:</Text>
              </>
            )}

            {feedbackType === 'feature' && (
              <>
                <Text style={styles.sectionTitle}>What would you like to see?</Text>
                <Text style={styles.hint}>Describe your idea and how it would help:</Text>
              </>
            )}

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={
                feedbackType === 'bug' ? 'Steps to reproduce, what you expected, etc...' :
                feedbackType === 'feature' ? 'Describe your feature idea...' :
                'Any additional comments? (optional)'
              }
              placeholderTextColor="#6B5D52"
              multiline
              style={styles.input}
              textAlignVertical="top"
            />

            {screenName && (
              <Text style={styles.screenTag}>From: {screenName}</Text>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitText}>
                  {feedbackType === 'bug' ? '🐛 Report Bug' :
                   feedbackType === 'feature' ? '💡 Suggest' : 'Send Feedback'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1C1C1C',
    gap: 4,
  },
  typeIcon: { fontSize: 14 },
  typeLabel: { color: '#A09080', fontSize: 13, fontWeight: '600' },
  scrollArea: { maxHeight: 250 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  hint: { color: '#A09080', fontSize: 13, marginBottom: 12 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  star: { fontSize: 36, color: '#2A2A2A' },
  starActive: { color: '#FBBF24' },
  ratingText: { color: '#A09080', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  input: {
    backgroundColor: '#1C1C1C',
    color: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    fontSize: 14,
    lineHeight: 20,
  },
  screenTag: { color: '#6B5D52', fontSize: 11, marginTop: 8, textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cancelText: { color: '#A09080', fontSize: 15, fontWeight: '600' },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#C9956C',
    alignItems: 'center',
  },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  thanksEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  thanksTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  thanksText: { color: '#A09080', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  closeBtn: {
    backgroundColor: '#C9956C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
