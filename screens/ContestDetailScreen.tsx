import React, {useState, useEffect} from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
  StatusBar, Linking,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'Creator';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function ContestDetailScreen({route, navigation}: any) {
  const {contest} = route.params;
  const [entries, setEntries] = useState<any[]>([]);
  const [videoLink, setVideoLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [votedEntries, setVotedEntries] = useState<Set<string>>(new Set());

  const user = auth().currentUser;
  const isAdmin = user?.email === ADMIN_EMAIL;
  const currentUserName =
    user?.displayName || user?.email?.split('@')[0] || 'Creator';

  useEffect(() => {
    loadEntries();
    checkIfEntered();
    loadVotedEntries();

    const unsubscribe = navigation.addListener('focus', () => {
      checkIfEntered();
    });
    return unsubscribe;
  }, []);

  const loadEntries = () => {
    firestore()
      .collection('contestEntries')
      .where('contestId', '==', contest.id)
      .onSnapshot(
        snapshot => {
          if (!snapshot) return;
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          data.sort((a: any, b: any) =>
            (b.finalScore || b.votes || 0) - (a.finalScore || a.votes || 0),
          );
          setEntries(data);
        },
        err => console.log('ENTRIES ERROR:', err),
      );
  };

  const checkIfEntered = async () => {
    try {
      const snapshot = await firestore()
        .collection('contestEntries')
        .where('contestId', '==', contest.id)
        .where('userId', '==', user?.uid)
        .get();
      if (!snapshot.empty) setEntered(true);
    } catch (e) {console.log(e);}
  };

  const loadVotedEntries = async () => {
    try {
      const userDoc = await firestore().collection('users').doc(user?.uid).get();
      const voted = userDoc.data()?.votedEntries || [];
      setVotedEntries(new Set(voted));
    } catch (e) {console.log(e);}
  };

  const submitEntry = async () => {
    if (!videoLink.trim()) {
      Alert.alert('Missing Link', 'Please paste your video link!');
      return;
    }

    if (contest.entryFee > 0) {
      navigation.navigate('Payment', {
        amount: contest.entryFee,
        purpose: 'contest_entry',
        itemId: contest.id,
        itemTitle: contest.title,
        videoLink: videoLink.trim(),
      });
      return;
    }

    const existing = await firestore()
      .collection('contestEntries')
      .where('contestId', '==', contest.id)
      .where('userId', '==', user?.uid)
      .get();

    if (!existing.empty) {
      Alert.alert('Already Entered', 'You have already submitted an entry!');
      setEntered(true);
      return;
    }

    setLoading(true);
    try {
      await firestore().collection('contestEntries').add({
        contestId: contest.id,
        contestTitle: contest.title,
        userId: user?.uid,
        userEmail: user?.email,
        userName: currentUserName,
        videoLink: videoLink.trim(),
        votes: 0,
        juryScore: 0,
        finalScore: 0,
        paid: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await firestore().collection('contests').doc(contest.id).update({
        entriesCount: firestore.FieldValue.increment(1),
      });

      if (contest.creatorId && contest.creatorId !== user?.uid) {
        await firestore().collection('notifications').add({
          userId:    contest.creatorId,
          type:      'contest_entry',
          title:     '🎬 New Contest Entry!',
          message:   `${currentUserName} submitted an entry for "${contest.title}"`,
          senderId:  user?.uid,
          contestId: contest.id,
          read:      false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      setEntered(true);
      setShowSubmit(false);
      setVideoLink('');
      Alert.alert('🎬 Submitted!', 'Your entry has been submitted successfully!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong. Try again.');
    }
    setLoading(false);
  };

  const voteForEntry = async (entryId: string, entryUserId: string) => {
    if (entryUserId === user?.uid) {
      Alert.alert('Error', 'You cannot vote for your own entry!');
      return;
    }
    if (votedEntries.has(entryId)) {
      Alert.alert('Already Voted', 'You have already voted for this entry!');
      return;
    }
    try {
      await firestore().collection('contestEntries').doc(entryId).update({
        votes: firestore.FieldValue.increment(1),
      });
      await firestore().collection('users').doc(user?.uid).update({
        votedEntries: firestore.FieldValue.arrayUnion(entryId),
      });
      const updated = new Set(votedEntries);
      updated.add(entryId);
      setVotedEntries(updated);
      setEntries(prev =>
        prev.map(e => e.id === entryId ? {...e, votes: (e.votes || 0) + 1} : e),
      );
      Alert.alert('👍 Voted!', 'Your vote has been counted!');
    } catch (e) {
      Alert.alert('Error', 'Could not register vote. Try again.');
    }
  };

  const updateJuryScore = async (entryId: string, scoreText: string, currentVotes: number) => {
    const score = Math.min(100, Math.max(0, Number(scoreText) || 0));
    const finalScore = score * 0.6 + (currentVotes || 0) * 0.4;
    try {
      await firestore().collection('contestEntries').doc(entryId).update({juryScore: score, finalScore});
      setEntries(prev =>
        prev.map(e => e.id === entryId ? {...e, juryScore: score, finalScore} : e),
      );
    } catch (e) {console.log('JURY SCORE ERROR:', e);}
  };

  const deleteContest = () => {
    Alert.alert(
      '🗑 Remove Contest',
      `Are you sure you want to permanently delete "${contest.title}"?\n\nThis will also delete all ${entries.length} entries. This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all entries first
              const entriesSnapshot = await firestore()
                .collection('contestEntries')
                .where('contestId', '==', contest.id)
                .get();

              if (!entriesSnapshot.empty) {
                const batch = firestore().batch();
                entriesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
              }

              // Delete the contest document
              await firestore()
                .collection('contests')
                .doc(contest.id)
                .delete();

              Alert.alert('✅ Deleted', 'Contest and all entries removed successfully.');
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not delete contest. Try again.');
            }
          },
        },
      ],
    );
  };

  const getDaysLeft = (deadline: string) => {
    if (!deadline) return 'Open';
    const diff = Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0) return 'Contest Ended';
    if (diff === 0) return '🔥 Last Day!';
    return `${diff} days left`;
  };

  const daysLeft = getDaysLeft(contest.deadline);
  const isEnded = daysLeft === 'Contest Ended';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
        <View style={styles.section}>

          {/* HEADER CARD */}
          <View style={styles.headerCard}>
            <Text style={styles.contestType}>{contest.type || 'Contest'}</Text>
            <Text style={styles.title}>{contest.title}</Text>
            <Text style={styles.prize}>🏆 {contest.prize}</Text>
            {contest.description ? (
              <Text style={styles.description}>{contest.description}</Text>
            ) : null}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, isEnded && {color: '#FCA5A5'}]}>{daysLeft}</Text>
                <Text style={styles.statLabel}>Deadline</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{contest.entriesCount || 0}</Text>
                <Text style={styles.statLabel}>Entries</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, contest.entryFee === 0 && {color: '#4ADE80'}]}>
                  {contest.entryFee > 0 ? `₹${contest.entryFee}` : 'FREE'}
                </Text>
                <Text style={styles.statLabel}>Entry Fee</Text>
              </View>
            </View>
          </View>

          {/* VOTING METHOD CARD */}
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

          {/* ADMIN DELETE BUTTON */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.deleteContestBtn}
              onPress={deleteContest}>
              <Text style={styles.deleteContestBtnText}>🗑 Remove Contest</Text>
            </TouchableOpacity>
          )}

          {/* RULES */}
          {contest.rules ? (
            <View style={styles.rulesCard}>
              <Text style={styles.sectionTitle}>📜 Rules & Guidelines</Text>
              <Text style={styles.rulesText}>{contest.rules}</Text>
            </View>
          ) : null}

          {/* SUBMIT / ENTERED */}
          {!isEnded ? (
            !entered ? (
              <TouchableOpacity
                style={styles.enterBtn}
                onPress={() => setShowSubmit(!showSubmit)}>
                <Text style={styles.enterBtnText}>
                  {showSubmit ? '✕ Cancel' : '🎬 Submit Your Entry'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.enteredBadge}>
                <Text style={styles.enteredText}>✅ You already submitted your entry</Text>
              </View>
            )
          ) : (
            <View style={styles.endedBadge}>
              <Text style={styles.endedText}>🔒 Contest has ended</Text>
            </View>
          )}

          {/* SUBMIT BOX */}
          {showSubmit && !entered && (
            <View style={styles.submitBox}>
              <Text style={styles.submitLabel}>📎 Paste your video link</Text>
              <TextInput
                style={styles.input}
                placeholder="YouTube / Google Drive / Vimeo link"
                placeholderTextColor="#A09080"
                value={videoLink}
                onChangeText={setVideoLink}
                autoCapitalize="none"
              />
              {contest.entryFee > 0 && (
                <View style={styles.feeWarning}>
                  <Text style={styles.feeWarningText}>
                    💰 Entry fee: ₹{contest.entryFee} — you will be redirected to payment
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.submitBtn, loading && {opacity: 0.5}]}
                onPress={submitEntry}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {contest.entryFee > 0 ? `💳 Pay ₹${contest.entryFee} & Submit` : '🚀 Submit Entry'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* LEADERBOARD */}
          <Text style={styles.sectionTitle}>🎬 Submissions ({entries.length})</Text>

          {entries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No submissions yet!</Text>
              <Text style={styles.emptySubText}>Be the first to submit!</Text>
            </View>
          ) : (
            entries.map((item: any, index: number) => {
              const hasVoted = votedEntries.has(item.id);
              const isOwn = item.userId === user?.uid;
              const entrantName = cleanName(item.userName) || cleanName(item.userEmail) || 'Creator';
              const finalScore = ((item.juryScore || 0) * 0.6 + (item.votes || 0) * 0.4).toFixed(1);

              return (
                <View key={item.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={[
                      styles.rankBadge,
                      index === 0 && styles.rankBadgeGold,
                      index === 1 && styles.rankBadgeSilver,
                      index === 2 && styles.rankBadgeBronze,
                    ]}>
                      <Text style={styles.rankText}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </Text>
                    </View>
                    <Text style={styles.entryName}>{entrantName}</Text>
                    {isOwn && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    )}
                    <Text style={styles.entryVotes}>👍 {item.votes || 0}</Text>
                  </View>

                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Jury: <Text style={styles.scoreValue}>{item.juryScore || 0}</Text></Text>
                    <Text style={styles.scoreLabel}>Votes: <Text style={styles.scoreValue}>{item.votes || 0}</Text></Text>
                    <Text style={styles.finalScoreText}>Final: <Text style={styles.finalScoreValue}>{finalScore}</Text></Text>
                  </View>

                  <TouchableOpacity
                    style={styles.watchBtn}
                    onPress={() => {
                      if (!item.videoLink) {Alert.alert('No video', 'No video link available.'); return;}
                      Linking.openURL(item.videoLink).catch(() => Alert.alert('Error', 'Could not open video link.'));
                    }}>
                    <Text style={styles.watchBtnText}>▶️ Watch Video</Text>
                  </TouchableOpacity>

                  {!isOwn && (
                    <TouchableOpacity
                      style={[styles.voteBtn, hasVoted && styles.voteBtnDone]}
                      onPress={() => voteForEntry(item.id, item.userId)}
                      disabled={hasVoted}>
                      <Text style={[styles.voteBtnText, hasVoted && styles.voteBtnTextDone]}>
                        {hasVoted ? '✓ Voted' : '👍 Vote'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {isOwn && (
                    <View style={styles.ownEntryNote}>
                      <Text style={styles.ownEntryNoteText}>👤 This is your entry — you cannot vote for yourself</Text>
                    </View>
                  )}

                  {isAdmin && (
                    <View style={styles.juryRow}>
                      <Text style={styles.juryLabel}>⭐ Jury Score (0–100):</Text>
                      <TextInput
                        style={styles.juryInput}
                        placeholder="0"
                        placeholderTextColor="#A09080"
                        keyboardType="numeric"
                        defaultValue={String(item.juryScore || 0)}
                        onEndEditing={e => updateJuryScore(item.id, e.nativeEvent.text, item.votes)}
                      />
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  section: {padding: 16},
  headerCard: {backgroundColor: '#1C1C1C', borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#2A2A2A'},
  contestType: {color: '#C9956C', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1},
  title: {color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 8},
  prize: {color: '#FBBF24', fontSize: 17, fontWeight: 'bold', marginBottom: 10},
  description: {color: '#A09080', fontSize: 14, lineHeight: 20, marginBottom: 14},
  statsRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 8},
  statBox: {flex: 1, alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, padding: 10},
  statValue: {color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginBottom: 4, textAlign: 'center'},
  statLabel: {color: '#A09080', fontSize: 11},
  votingCard: {backgroundColor: '#1C1C1C', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#C9956C'},
  votingTitle: {color: '#C9956C', fontSize: 15, fontWeight: 'bold', marginBottom: 14, textAlign: 'center'},
  votingRow: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20},
  votingItem: {alignItems: 'center'},
  votingPercent: {color: '#FFFFFF', fontSize: 26, fontWeight: 'bold'},
  votingLabel: {color: '#A09080', fontSize: 12, marginTop: 4},
  votingPlus: {color: '#C9956C', fontSize: 24, fontWeight: 'bold'},
  deleteContestBtn: {backgroundColor: '#450A0A', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#DC2626'},
  deleteContestBtnText: {color: '#FCA5A5', fontSize: 14, fontWeight: 'bold'},
  rulesCard: {backgroundColor: '#1C1C1C', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#2A2A2A'},
  sectionTitle: {color: '#C9956C', fontSize: 17, fontWeight: 'bold', marginBottom: 10, marginTop: 6},
  rulesText: {color: '#A09080', fontSize: 14, lineHeight: 24},
  enterBtn: {backgroundColor: '#C9956C', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 14},
  enterBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
  enteredBadge: {backgroundColor: '#064E3B', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#4ADE80'},
  enteredText: {color: '#4ADE80', fontSize: 14, fontWeight: 'bold'},
  endedBadge: {backgroundColor: '#2A0A0A', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#DC2626'},
  endedText: {color: '#FCA5A5', fontSize: 14, fontWeight: 'bold'},
  submitBox: {backgroundColor: '#1C1C1C', borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#2A2A2A'},
  submitLabel: {color: '#C9956C', fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5},
  input: {backgroundColor: '#2A2A2A', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 14, borderWidth: 1, borderColor: '#333333', marginBottom: 12},
  feeWarning: {backgroundColor: '#2A1500', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FBBF24'},
  feeWarningText: {color: '#FBBF24', fontSize: 13},
  submitBtn: {backgroundColor: '#C9956C', borderRadius: 12, padding: 14, alignItems: 'center'},
  submitBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: 'bold'},
  emptyBox: {alignItems: 'center', paddingVertical: 40},
  emptyText: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 6},
  emptySubText: {color: '#A09080', fontSize: 13},
  entryCard: {backgroundColor: '#1C1C1C', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A'},
  entryHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10},
  rankBadge: {backgroundColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4},
  rankBadgeGold: {backgroundColor: 'rgba(251,191,36,0.12)'},
  rankBadgeSilver: {backgroundColor: '#334155'},
  rankBadgeBronze: {backgroundColor: '#431407'},
  rankText: {color: '#FFFFFF', fontSize: 13, fontWeight: 'bold'},
  entryName: {color: '#FFFFFF', fontSize: 14, fontWeight: '600', flex: 1},
  youBadge: {backgroundColor: '#C9956C', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2},
  youBadgeText: {color: '#FFFFFF', fontSize: 10, fontWeight: 'bold'},
  entryVotes: {color: '#FBBF24', fontSize: 13, fontWeight: 'bold'},
  scoreRow: {flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#2A2A2A', borderRadius: 10, padding: 10, marginBottom: 10},
  scoreLabel: {color: '#A09080', fontSize: 12},
  scoreValue: {color: '#FFFFFF', fontWeight: 'bold'},
  finalScoreText: {color: '#A09080', fontSize: 12},
  finalScoreValue: {color: '#C9956C', fontWeight: 'bold'},
  watchBtn: {backgroundColor: '#1E3A5F', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#38BDF8'},
  watchBtnText: {color: '#38BDF8', fontSize: 14, fontWeight: 'bold'},
  voteBtn: {backgroundColor: '#2A2A2A', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333333'},
  voteBtnDone: {backgroundColor: '#064E3B', borderColor: '#4ADE80'},
  voteBtnText: {color: '#FBBF24', fontSize: 13, fontWeight: 'bold'},
  voteBtnTextDone: {color: '#4ADE80'},
  ownEntryNote: {backgroundColor: '#1C1C1C', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 4, borderWidth: 1, borderColor: '#2A2A2A'},
  ownEntryNoteText: {color: '#A09080', fontSize: 12},
  juryRow: {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2A1500', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#C9956C'},
  juryLabel: {color: '#C9956C', fontSize: 12, fontWeight: '600', flex: 1},
  juryInput: {backgroundColor: '#1C1C1C', borderRadius: 8, padding: 8, color: '#FFFFFF', width: 60, textAlign: 'center', borderWidth: 1, borderColor: '#C9956C', fontSize: 14, fontWeight: 'bold'},
});