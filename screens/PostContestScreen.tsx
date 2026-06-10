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
  SafeAreaView,
  Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const CONTEST_TYPES = [
  'Short Film',
  'Acting',
  'Dialogue',
  'Cinematography',
  'Script',
  'Documentary',
];

export default function PostContestScreen({navigation}: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prize, setPrize] = useState('');
  const [deadline, setDeadline] = useState('');
  const [rules, setRules] = useState('');
  const [type, setType] = useState('Short Film');
  const [entryFee, setEntryFee] = useState('0');
  const [loading, setLoading] = useState(false);

  const user = auth().currentUser;

  const creatorName =
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Creator';

  const postContest = async () => {
    if (!title.trim() || !prize.trim() || !deadline.trim()) {
      Alert.alert('Missing Info', 'Please fill Title, Prize and Deadline!');
      return;
    }

    setLoading(true);
    try {
      const contestRef = await firestore().collection('contests').add({
        title: title.trim(),
        description: description.trim(),
        prize: prize.trim(),
        deadline: deadline.trim(),
        rules: rules.trim(),
        type,
        entryFee: parseInt(entryFee) || 0,
        creatorId: user?.uid,
        creatorEmail: user?.email,
        creatorName,
        entriesCount: 0,
        status: 'Active',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Notify admin (yourself)
      await firestore().collection('notifications').add({
  userId: user?.uid,
  type: 'contest_created',
  title: '🏆 Contest Created!',
  message: `Your contest "${title.trim()}" is now live!`,
  contestId: contestRef.id,
  read: false,
  createdAt: firestore.FieldValue.serverTimestamp(),
});

      // Notify ALL other users
      const usersSnapshot = await firestore().collection('users').get();
      const batch = firestore().batch();
      usersSnapshot.docs.forEach(doc => {
        if (doc.id !== user?.uid) {
          const notifRef = firestore().collection('notifications').doc();
          batch.set(notifRef, {
            userId: doc.id,
            type: 'new_contest',
            title: '🏆 New Contest Alert!',
            message: `"${title.trim()}" is live — Prize: ${prize.trim()}. Enter now on CineLink!`,
            senderId: user?.uid,
            contestId: contestRef.id,
            read: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      });
      await batch.commit();

      Alert.alert('Success! 🏆', 'Your contest is now live!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Something went wrong. Try again!');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>

          {/* TITLE */}
          <Text style={styles.label}>Contest Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Best Drama Short 2026"
            placeholderTextColor="#A09080"
            value={title}
            onChangeText={setTitle}
          />

          {/* TYPE */}
          <Text style={styles.label}>Contest Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.typeRow}>
            {CONTEST_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                onPress={() => setType(t)}>
                <Text
                  style={[
                    styles.typeBtnText,
                    type === t && styles.typeBtnTextActive,
                  ]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* DESCRIPTION */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="What is this contest about? Who can participate?"
            placeholderTextColor="#A09080"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* PRIZE */}
          <Text style={styles.label}>Prize *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. ₹10,000 + Certificate + Trophy"
            placeholderTextColor="#A09080"
            value={prize}
            onChangeText={setPrize}
          />

          {/* DEADLINE */}
<Text style={styles.label}>Deadline *</Text>
<TextInput
  style={styles.input}
  placeholder="e.g. 2026-07-30"
  placeholderTextColor="#A09080"
  value={deadline}
  onChangeText={setDeadline}
  maxLength={10}
/>
{deadline.length > 0 && deadline.length < 10 && (
  <Text style={{color:'#FCA5A5',fontSize:12,marginTop:4}}>
    ⚠️ Use format YYYY-MM-DD e.g. 2026-07-30
  </Text>
)}
{deadline.length === 10 && (
  <Text style={{color:'#4ADE80',fontSize:12,marginTop:4}}>
    ✅ Deadline: {deadline}
  </Text>
)}

          {/* ENTRY FEE */}
          <Text style={styles.label}>Entry Fee (₹) — 0 for Free</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#A09080"
            value={entryFee}
            onChangeText={setEntryFee}
            keyboardType="numeric"
          />

          <View
            style={[
              styles.feeInfo,
              parseInt(entryFee) > 0 && styles.feeInfoPaid,
            ]}>
            <Text style={styles.feeInfoText}>
              {parseInt(entryFee) === 0
                ? '✅ This is a FREE contest — maximum participation'
                : `💰 Entry fee: ₹${entryFee} per submission`}
            </Text>
          </View>

          {/* RULES */}
          <Text style={styles.label}>Rules & Guidelines</Text>
          <TextInput
            style={[styles.input, styles.multilineLg]}
            placeholder="Contest rules, submission format, eligibility criteria..."
            placeholderTextColor="#A09080"
            value={rules}
            onChangeText={setRules}
            multiline
            numberOfLines={5}
          />

          {/* VOTING INFO */}
          <View style={styles.votingInfo}>
            <Text style={styles.votingTitle}>🏆 Winner Selection Method</Text>
            <View style={styles.votingRow}>
              <View style={styles.votingItem}>
                <Text style={styles.votingPercent}>60%</Text>
                <Text style={styles.votingLabel}>Jury Score</Text>
                <Text style={styles.votingDesc}>You rate submissions</Text>
              </View>
              <Text style={styles.votingPlus}>+</Text>
              <View style={styles.votingItem}>
                <Text style={styles.votingPercent}>40%</Text>
                <Text style={styles.votingLabel}>Public Votes</Text>
                <Text style={styles.votingDesc}>Audience votes</Text>
              </View>
            </View>
          </View>

          {/* SUBMIT */}
          <TouchableOpacity
            style={[styles.postBtn, loading && styles.postBtnDisabled]}
            onPress={postContest}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.postBtnText}>🏆 Create Contest</Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0A0A0A'},
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  section: {padding: 20, paddingBottom: 48},
  label: {color: '#C9956C', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 18, textTransform: 'uppercase', letterSpacing: 0.5},
  input: {backgroundColor: '#1C1C1C', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2A2A2A'},
  multiline: {height: 80, textAlignVertical: 'top'},
  multilineLg: {height: 120, textAlignVertical: 'top'},
  typeRow: {flexDirection: 'row', marginBottom: 4},
  typeBtn: {backgroundColor: '#1C1C1C', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8, borderWidth: 1, borderColor: '#2A2A2A'},
  typeBtnActive: {backgroundColor: '#C9956C', borderColor: '#C9956C'},
  typeBtnText: {color: '#A09080', fontSize: 13},
  typeBtnTextActive: {color: '#FFFFFF', fontWeight: 'bold'},
  feeInfo: {backgroundColor: '#0A2E1F', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#4ADE80'},
  feeInfoPaid: {backgroundColor: '#2A1500', borderColor: '#FBBF24'},
  feeInfoText: {color: '#4ADE80', fontSize: 13},
  votingInfo: {backgroundColor: '#1C1C1C', borderRadius: 14, padding: 16, marginTop: 22, borderWidth: 1, borderColor: '#C9956C'},
  votingTitle: {color: '#C9956C', fontSize: 15, fontWeight: 'bold', marginBottom: 14, textAlign: 'center'},
  votingRow: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20},
  votingItem: {alignItems: 'center'},
  votingPercent: {color: '#FFFFFF', fontSize: 28, fontWeight: 'bold'},
  votingLabel: {color: '#C9956C', fontSize: 13, fontWeight: '600', marginTop: 4},
  votingDesc: {color: '#A09080', fontSize: 11, marginTop: 2},
  votingPlus: {color: '#C9956C', fontSize: 24, fontWeight: 'bold'},
  postBtn: {backgroundColor: '#C9956C', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 26},
  postBtnDisabled: {opacity: 0.5},
  postBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
});