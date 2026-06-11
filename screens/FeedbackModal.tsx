import React, {useState} from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Animated,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

const STARS = [1, 2, 3, 4, 5];

export default function FeedbackModal({visible, onClose}: FeedbackModalProps) {
  const [rating, setRating]       = useState(0);
  const [message, setMessage]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const user = auth().currentUser;

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Please rate', 'Tap a star to give a rating first!');
      return;
    }
    setSubmitting(true);
    try {
      await firestore().collection('feedback').add({
        userId:    user?.uid || 'anonymous',
        userEmail: user?.email || '',
        rating,
        message:   message.trim(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      setSubmitted(true);
    } catch (e) {
      Alert.alert('Error', 'Could not submit feedback. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state for next time (won't show again anyway)
    setRating(0);
    setMessage('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modal}>

          {submitted ? (
            /* ── THANK YOU STATE ── */
            <View style={styles.thankYou}>
              <Text style={styles.thankEmoji}>🎬</Text>
              <Text style={styles.thankTitle}>Thank You!</Text>
              <Text style={styles.thankSub}>
                Your feedback helps us build a better CineLink for India's film community.
              </Text>
              {rating >= 4 && (
                <Text style={styles.playStoreHint}>
                  ⭐ Love CineLink? Rate us on the Play Store!
                </Text>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── FEEDBACK FORM ── */
            <>
              {/* Header */}
              <TouchableOpacity style={styles.skipX} onPress={handleClose}>
                <Text style={styles.skipXText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.emoji}>🎬</Text>
              <Text style={styles.title}>How's Your CineLink Experience?</Text>
              <Text style={styles.sub}>Your feedback helps us improve for India's film community.</Text>

              {/* Stars */}
              <View style={styles.starsRow}>
                {STARS.map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starBtn}>
                    <Text style={[styles.star, star <= rating && styles.starActive]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <Text style={styles.ratingLabel}>
                  {rating === 1 ? 'Poor 😔' : rating === 2 ? 'Fair 😐' : rating === 3 ? 'Good 🙂' : rating === 4 ? 'Great 😊' : 'Excellent 🤩'}
                </Text>
              )}

              {/* Text input */}
              <TextInput
                style={styles.input}
                placeholder="Tell us what you think... (optional)"
                placeholderTextColor="#5C5048"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                maxLength={300}
              />

              {/* Buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.skipBtn} onPress={handleClose}>
                  <Text style={styles.skipBtnText}>Maybe Later</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting || rating === 0}>
                  {submitting
                    ? <ActivityIndicator color="#0A0A0A" size="small" />
                    : <Text style={styles.submitBtnText}>Submit ✓</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modal: {
    backgroundColor: '#1C1C1C', borderRadius: 24,
    padding: 28, width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  skipX: {
    position: 'absolute', top: 14, right: 14,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center',
  },
  skipXText: {color: '#A09080', fontSize: 12, fontWeight: 'bold'},
  emoji:    {fontSize: 44, marginBottom: 12, marginTop: 8},
  title:    {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8},
  sub:      {color: '#A09080', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 22},
  starsRow: {flexDirection: 'row', gap: 8, marginBottom: 10},
  starBtn:  {padding: 4},
  star:       {fontSize: 38, color: '#2A2A2A'},
  starActive: {color: '#C9956C'},
  ratingLabel:{color: '#C9956C', fontSize: 14, fontWeight: '600', marginBottom: 16},
  input: {
    backgroundColor: '#0A0A0A', borderRadius: 12, padding: 14,
    color: '#FFFFFF', fontSize: 14, borderWidth: 1, borderColor: '#2A2A2A',
    width: '100%', minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
  },
  btnRow:     {flexDirection: 'row', gap: 12, width: '100%'},
  skipBtn:    {flex: 1, backgroundColor: '#2A2A2A', borderRadius: 12, padding: 14, alignItems: 'center'},
  skipBtnText:{color: '#A09080', fontWeight: '600', fontSize: 14},
  submitBtn:  {flex: 1, backgroundColor: '#C9956C', borderRadius: 12, padding: 14, alignItems: 'center'},
  submitBtnDisabled: {opacity: 0.4},
  submitBtnText: {color: '#0A0A0A', fontWeight: 'bold', fontSize: 14},

  // Thank you state
  thankYou:   {alignItems: 'center', paddingVertical: 10},
  thankEmoji: {fontSize: 52, marginBottom: 14},
  thankTitle: {color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 10},
  thankSub:   {color: '#A09080', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16},
  playStoreHint: {color: '#C9956C', fontSize: 13, textAlign: 'center', marginBottom: 16, fontWeight: '600'},
  closeBtn:   {backgroundColor: '#C9956C', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40},
  closeBtnText:{color: '#0A0A0A', fontWeight: 'bold', fontSize: 15},
});