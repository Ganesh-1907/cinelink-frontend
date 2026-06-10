import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function ContestDetailScreen({route, navigation}: any) {
  const {contest} = route.params;
  const [entries, setEntries] = useState<any[]>([]);
  const [videoLink, setVideoLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const user = auth().currentUser;

  useEffect(() => {
    loadEntries();
    checkIfEntered();
  }, []);

  const loadEntries = () => {
    firestore()
      .collection('contestEntries')
      .where('contestId', '==', contest.id)
      .onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        data.sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0));
        setEntries(data);
      });
  };

  const checkIfEntered = async () => {
    const snapshot = await firestore()
      .collection('contestEntries')
      .where('contestId', '==', contest.id)
      .where('userId', '==', user?.uid)
      .get();
    if (!snapshot.empty) setEntered(true);
  };

  const submitEntry = async () => {
    if (!videoLink) {
      Alert.alert('Error', 'Please paste your video link!');
      return;
    }
    setLoading(true);
    try {
      await firestore().collection('contestEntries').add({
        contestId: contest.id,
        contestTitle: contest.title,
        userId: user?.uid,
        userEmail: user?.email,
        videoLink,
        votes: 0,
        juryScore: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await firestore()
        .collection('contests')
        .doc(contest.id)
        .update({
          entriesCount: firestore.FieldValue.increment(1),
        });

      setEntered(true);
      setShowSubmit(false);
      Alert.alert('Success!', 'Your entry has been submitted!');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const voteForEntry = async (entryId: string, entryUserId: string) => {
    if (entryUserId === user?.uid) {
      Alert.alert('Error', 'You cannot vote for your own entry!');
      return;
    }
    try {
      await firestore()
        .collection('contestEntries')
        .doc(entryId)
        .update({
          votes: firestore.FieldValue.increment(1),
        });
      Alert.alert('Voted!', 'Your vote has been counted!');
    } catch (e) {
      console.error(e);
    }
  };

  const getDaysLeft = (deadline: string) => {
    const today = new Date();
    const end = new Date(deadline);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Contest Ended';
    if (diff === 0) return 'Last Day!';
    return `${diff} days left`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>

        <View style={styles.headerCard}>
          <Text style={styles.contestType}>{contest.type}</Text>
          <Text style={styles.title}>{contest.title}</Text>
          <Text style={styles.prize}>🏆 {contest.prize}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{getDaysLeft(contest.deadline)}</Text>
              <Text style={styles.statLabel}>Deadline</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{contest.entriesCount || 0}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {contest.entryFee > 0 ? `Rs.${contest.entryFee}` : 'FREE'}
              </Text>
              <Text style={styles.statLabel}>Entry Fee</Text>
            </View>
          </View>
        </View>

        <View style={styles.votingCard}>
          <Text style={styles.votingTitle}>🏆 Winner Selection</Text>
          <View style={styles.votingRow}>
            <View style={styles.votingItem}>
              <Text style={styles.votingPercent}>60%</Text>
              <Text style={styles.votingLabel}>Jury Score</Text>
            </View>
            <Text style={styles.votingPlus}>+</Text>
            <View style={styles.votingItem}>
              <Text style={styles.votingPercent}>40%</Text>
              <Text style={styles.votingLabel}>Public Votes</Text>
            </View>
          </View>
        </View>

        {contest.rules ? (
          <View style={styles.rulesCard}>
            <Text style={styles.sectionTitle}>Rules & Guidelines</Text>
            <Text style={styles.rulesText}>{contest.rules}</Text>
          </View>
        ) : null}

        {!entered ? (
          <TouchableOpacity
            style={styles.enterBtn}
            onPress={() => setShowSubmit(!showSubmit)}>
            <Text style={styles.enterBtnText}>
              {showSubmit ? 'Cancel' : '🎬 Submit Your Entry'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.enteredBadge}>
            <Text style={styles.enteredText}>✅ You have submitted your entry!</Text>
          </View>
        )}

        {showSubmit && (
          <View style={styles.submitBox}>
            <Text style={styles.submitLabel}>Paste your video link:</Text>
            <TextInput
              style={styles.input}
              placeholder="YouTube / Drive / Vimeo link"
              placeholderTextColor="#64748B"
              value={videoLink}
              onChangeText={setVideoLink}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.submitBtn} onPress={submitEntry}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Entry</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          Submissions ({entries.length})
        </Text>

        {entries.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No entries yet!</Text>
            <Text style={styles.emptySubText}>Be the first to submit!</Text>
          </View>
        ) : (
          entries.map((item: any, index: number) => (
            <View key={item.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <Text style={styles.entryEmail}>{item.userEmail}</Text>
                <Text style={styles.entryVotes}>👍 {item.votes || 0}</Text>
              </View>
              <Text style={styles.entryLink} numberOfLines={1}>
                {item.videoLink}
              </Text>
              <TouchableOpacity
                style={styles.voteBtn}
                onPress={() => voteForEntry(item.id, item.userId)}>
                <Text style={styles.voteBtnText}>👍 Vote</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

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
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  contestType: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  prize: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
  },
  votingCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  votingTitle: {
    color: '#A5B4FC',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  votingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  votingItem: {
    alignItems: 'center',
  },
  votingPercent: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  votingLabel: {
    color: '#A5B4FC',
    fontSize: 12,
  },
  votingPlus: {
    color: '#A5B4FC',
    fontSize: 24,
    fontWeight: 'bold',
  },
  rulesCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionTitle: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  rulesText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
  },
  enterBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  enterBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  enteredBadge: {
    backgroundColor: '#064E3B',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  enteredText: {
    color: '#6EE7B7',
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitBox: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  submitLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptySubText: {
    color: '#64748B',
    fontSize: 13,
  },
  entryCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  rankBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  entryEmail: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  entryVotes: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: 'bold',
  },
  entryLink: {
    color: '#6366F1',
    fontSize: 12,
    marginBottom: 10,
  },
  voteBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  voteBtnText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: 'bold',
  },
});