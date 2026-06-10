import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function PostContestScreen({navigation}: any) {
  const [title, setTitle] = useState('');
  const [prize, setPrize] = useState('');
  const [deadline, setDeadline] = useState('');
  const [rules, setRules] = useState('');
  const [type, setType] = useState('Short Film');
  const [entryFee, setEntryFee] = useState('0');
  const [loading, setLoading] = useState(false);
  const user = auth().currentUser;

  const contestTypes = ['Short Film', 'Acting', 'Dialogue', 'Cinematography', 'Script'];

  const postContest = async () => {
    if (!title || !prize || !deadline) {
      Alert.alert('Error', 'Please fill all required fields!');
      return;
    }
    setLoading(true);
    try {
      await firestore().collection('contests').add({
        title,
        prize,
        deadline,
        rules,
        type,
        entryFee: parseInt(entryFee) || 0,
        creatorId: user?.uid,
        creatorEmail: user?.email,
        entriesCount: 0,
        status: 'Active',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await firestore().collection('notifications').add({
        userId: user?.uid,
        type: 'new_audition',
        title: '🏆 Contest Created!',
        message: `Your contest "${title}" is now live!`,
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success!', 'Contest created successfully!');
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Something went wrong!');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>

        <Text style={styles.label}>Contest Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Best Drama Short 2026"
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Contest Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
          {contestTypes.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t && styles.typeBtnActive]}
              onPress={() => setType(t)}>
              <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Prize *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Rs.10,000 + Certificate"
          placeholderTextColor="#64748B"
          value={prize}
          onChangeText={setPrize}
        />

        <Text style={styles.label}>Deadline *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2026-06-30"
          placeholderTextColor="#64748B"
          value={deadline}
          onChangeText={setDeadline}
        />

        <Text style={styles.label}>Entry Fee (Rs.) — 0 for Free</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#64748B"
          value={entryFee}
          onChangeText={setEntryFee}
          keyboardType="numeric"
        />

        <View style={styles.feeInfo}>
          <Text style={styles.feeInfoText}>
            {parseInt(entryFee) === 0
              ? '✅ This is a FREE contest'
              : `💰 Entry fee: Rs.${entryFee} per submission`}
          </Text>
        </View>

        <Text style={styles.label}>Rules & Guidelines</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Contest rules, submission guidelines..."
          placeholderTextColor="#64748B"
          value={rules}
          onChangeText={setRules}
          multiline
          numberOfLines={5}
        />

        <View style={styles.votingInfo}>
          <Text style={styles.votingTitle}>🏆 Winner Selection</Text>
          <Text style={styles.votingText}>
            • Jury Score (60%) — You rate submissions
          </Text>
          <Text style={styles.votingText}>
            • Public Votes (40%) — Audience votes
          </Text>
        </View>

        <TouchableOpacity style={styles.postBtn} onPress={postContest}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>Create Contest</Text>
          )}
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  section: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  multiline: {
    height: 120,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  typeBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  typeBtnText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  feeInfo: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  feeInfoText: {
    color: '#6EE7B7',
    fontSize: 13,
  },
  votingInfo: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  votingTitle: {
    color: '#6366F1',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  votingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 4,
  },
  postBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  postBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});