import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {ADMIN_EMAIL} from '../src/api/config';

export default function MyContestsScreen({navigation}: any) {
  const [contests, setContests] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('My Entries');
  const user = auth().currentUser;
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const unsubEntries = loadMyEntries();
    const unsubContests = loadMyContests();
    return () => {
      unsubEntries();
      unsubContests();
    };
  }, []);

  const loadMyEntries = () => {
  return firestore()
    .collection('contestEntries')
    .where('userId', '==', user?.uid)
    .onSnapshot(
      snapshot => {
        if (!snapshot) return;
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        data.sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0));
        setEntries(data);
        setLoading(false);
      },
      error => {
        console.log('loadMyEntries error:', error);
        setLoading(false);
      },
    );
};

const loadMyContests = () => {
  return firestore()
    .collection('contests')
    .where('creatorId', '==', user?.uid)
    .onSnapshot(
      snapshot => {
        if (!snapshot) return;
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setContests(data);
      },
      error => {
        console.log('loadMyContests error:', error);
      },
    );
};
  const deleteEntry = async (entryId: string) => {
    Alert.alert('Remove Entry', 'Remove your entry from this contest?', [
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await firestore().collection('contestEntries').doc(entryId).delete();
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const getDaysLeft = (deadline: string) => {
    if (!deadline) return 'Open';
    const diff = Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0) return '🔴 Ended';
    if (diff === 0) return '🟡 Last day!';
    return `🟢 ${diff} days left`;
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0A0A0A'}}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* TABS */}
      <View style={styles.tabRow}>
        {['My Entries', 'My Contests'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#C9956C"
            style={{marginTop: 30}}
          />
        ) : activeTab === 'My Entries' ? (

          /* ── MY ENTRIES ── */
          entries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyText}>No contest entries yet!</Text>
              <Text style={styles.emptySubText}>Enter a contest to see it here.</Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => navigation.navigate('Contests')}>
                <Text style={styles.browseBtnText}>Browse Contests</Text>
              </TouchableOpacity>
            </View>
          ) : (
            entries.map((item: any, index: number) => (
              <View key={item.id} style={styles.card}>

                {/* RANK */}
                <View style={styles.cardTopRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.contestTitle}
                  </Text>
                </View>

                {/* STATS */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{item.votes || 0}</Text>
                    <Text style={styles.statLabel}>Votes</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>
                      {item.juryScore || '—'}
                    </Text>
                    <Text style={styles.statLabel}>Jury Score</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, {color: item.paid ? '#4ADE80' : '#FCA5A5'}]}>
                      {item.paid ? '✅' : '❌'}
                    </Text>
                    <Text style={styles.statLabel}>Paid</Text>
                  </View>
                </View>

                {/* VIDEO LINK */}
                {item.videoLink ? (
                  <TouchableOpacity onPress={() => Linking.openURL(item.videoLink)}>
                    <Text style={styles.videoLink} numberOfLines={1}>
                      🎬 Watch my entry
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* VIEW CONTEST */}
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() =>
                    navigation.navigate('ContestDetail', {
                      contest: {id: item.contestId, title: item.contestTitle},
                    })
                  }>
                  <Text style={styles.viewBtnText}>View Contest →</Text>
                </TouchableOpacity>

                {/* DELETE */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteEntry(item.id)}>
                  <Text style={styles.deleteBtnText}>🗑 Remove Entry</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        ) : (

          /* ── MY CONTESTS ── */
          <>
            {isAdmin && (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => navigation.navigate('PostContest')}>
                <Text style={styles.createBtnText}>+ Create New Contest</Text>
              </TouchableOpacity>
            )}

            {contests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyText}>No contests created!</Text>
                <Text style={styles.emptySubText}>Create a contest to see it here.</Text>
              </View>
            ) : (
            contests.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('ContestDetail', {contest: item})
                }>
                <View style={styles.cardTopRow}>
                  <View style={[
                    styles.statusBadge,
                    item.status === 'Active' ? styles.statusActive : styles.statusEnded,
                  ]}>
                    <Text style={styles.statusText}>{item.status || 'Active'}</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.prize}>🏆 {item.prize}</Text>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{item.entriesCount || 0}</Text>
                    <Text style={styles.statLabel}>Entries</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>
                      {item.entryFee > 0 ? `₹${item.entryFee}` : 'FREE'}
                    </Text>
                    <Text style={styles.statLabel}>Entry Fee</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{getDaysLeft(item.deadline)}</Text>
                    <Text style={styles.statLabel}>Deadline</Text>
                  </View>
                </View>

                <View style={styles.viewBtn}>
                  <Text style={styles.viewBtnText}>Manage Contest →</Text>
                </View>
              </TouchableOpacity>
            ))
            )}
          </>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  tabRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  tabActive: {
    backgroundColor: '#C9956C',
    borderColor: '#C9956C',
  },

  tabText: {color: '#A09080', fontSize: 13, fontWeight: '600'},
  tabTextActive: {color: '#FFFFFF', fontWeight: 'bold'},

  section: {padding: 16, paddingBottom: 40},

  emptyBox: {alignItems: 'center', marginTop: 60},
  emptyIcon: {fontSize: 50, marginBottom: 12},
  emptyText: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 8},
  emptySubText: {color: '#A09080', fontSize: 14, textAlign: 'center', marginBottom: 20},

  browseBtn: {
    backgroundColor: '#C9956C',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 14},

  card: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },

  rankBadge: {
    backgroundColor: '#C9956C',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rankText: {color: '#FFFFFF', fontSize: 12, fontWeight: 'bold'},

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  statusActive: {backgroundColor: '#064E3B'},
  statusEnded: {backgroundColor: '#450A0A'},
  statusText: {color: '#6EE7B7', fontSize: 12, fontWeight: '600'},

  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginBottom: 8,
  },

  prize: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  statBox: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },

  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },

  statLabel: {color: '#A09080', fontSize: 11},

  videoLink: {
    color: '#C9956C',
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '600',
  },

  viewBtn: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  viewBtnText: {color: '#C9956C', fontSize: 13, fontWeight: 'bold'},

  deleteBtn: {
    backgroundColor: '#450A0A',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  deleteBtnText: {color: '#FCA5A5', fontSize: 13, fontWeight: 'bold'},

  createBtn: {
    backgroundColor: '#C9956C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  createBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 15},
});