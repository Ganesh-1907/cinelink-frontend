import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const REPORT_REASONS = [
  {id: 'fake', label: '🚫 Fake / Scam Audition', icon: '🚫'},
  {id: 'inappropriate', label: '⚠️ Inappropriate Content', icon: '⚠️'},
  {id: 'spam', label: '📢 Spam / Duplicate Post', icon: '📢'},
  {id: 'harassment', label: '🛑 Harassment / Abuse', icon: '🛑'},
  {id: 'misleading', label: '❌ Misleading Information', icon: '❌'},
  {id: 'other', label: '📝 Other', icon: '📝'},
];

type ReportModalProps = {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'audition' | 'film' | 'contest' | 'user';
  contentTitle: string;
};

export default function ReportModal({
  visible,
  onClose,
  contentId,
  contentType,
  contentTitle,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitReport = async () => {
    if (!selectedReason) {
      Alert.alert('Select a reason', 'Please choose why you are reporting this.');
      return;
    }

    const currentUser = auth().currentUser;
    if (!currentUser) return;

    setSubmitting(true);

    try {
      // Check if user already reported this
      const existing = await firestore()
        .collection('reports')
        .where('contentId', '==', contentId)
        .where('reportedBy', '==', currentUser.uid)
        .get();

      if (!existing.empty) {
        Alert.alert('Already Reported', 'You have already reported this content. Our team will review it.');
        onClose();
        resetForm();
        return;
      }

      await firestore().collection('reports').add({
        contentId,
        contentType,
        contentTitle,
        reason: selectedReason,
        details: details.trim(),
        reportedBy: currentUser.uid,
        reportedByEmail: currentUser.email,
        status: 'pending', // pending, reviewed, action_taken, dismissed
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert(
        '✅ Report Submitted',
        'Thank you for reporting. Our team will review this within 24 hours.',
        [{text: 'OK', onPress: onClose}],
      );
      resetForm();
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedReason('');
    setDetails('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🚩 Report Content</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.reportingLabel}>
            Reporting: <Text style={styles.reportingTitle}>{contentTitle}</Text>
          </Text>

          {/* Reasons */}
          <Text style={styles.sectionTitle}>Why are you reporting this?</Text>

          {REPORT_REASONS.map(reason => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonBtn,
                selectedReason === reason.id && styles.reasonBtnActive,
              ]}
              onPress={() => setSelectedReason(reason.id)}>
              <Text
                style={[
                  styles.reasonText,
                  selectedReason === reason.id && styles.reasonTextActive,
                ]}>
                {reason.label}
              </Text>
              {selectedReason === reason.id && (
                <Text style={styles.checkMark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}

          {/* Details */}
          <TextInput
            style={styles.detailsInput}
            placeholder="Add more details (optional)..."
            placeholderTextColor="#A09080"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={submitReport}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>🚩 Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1C1C1C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    color: '#A09080',
    fontSize: 22,
    padding: 4,
  },
  reportingLabel: {
    color: '#A09080',
    fontSize: 13,
    marginBottom: 16,
  },
  reportingTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  reasonBtn: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  reasonBtnActive: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  reasonText: {
    color: '#A09080',
    fontSize: 14,
    fontWeight: '500',
  },
  reasonTextActive: {
    color: '#FCA5A5',
    fontWeight: '600',
  },
  checkMark: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    minHeight: 70,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});