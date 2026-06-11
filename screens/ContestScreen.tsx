import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function ContestScreen({navigation}: any) {
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [userRole, setUserRole] = useState<string | null>(null);

  const user = auth().currentUser;
  const isAdmin = user?.email === 'anilkumardevarakonda03@gmail.com';

  const tabs = ['All', 'Free', 'Paid', 'My Contests'];

  /* ── load user role ── */
  useEffect(() => {
    if (!user) return;
    firestore()
      .collection('users')
      .doc(user.uid)
      .get()
      .then(doc => {
        setUserRole((doc.data()?.role as string)?.toLowerCase() || null);
      })
      .catch(console.log);
  }, []);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('contests')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setContests(data);
        setLoading(false);
      });
    return () => unsubscribe();
  }, []);

  const filteredContests = contests.filter((item: any) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Free') return item.entryFee === 0 || item.entryFee === '0';
    if (activeTab === 'Paid') return item.entryFee > 0;
    if (activeTab === 'My Contests') return item.creatorId === user?.uid;
    return true;
  });

  const parseDeadline = (deadline: any): Date | null => {
  if (!deadline) return null;
  if (typeof deadline?.toDate === 'function') return deadline.toDate();
  if (typeof deadline !== 'string') return null;
  const s = deadline.trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59);
  }
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 23, 59, 59);
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const getDaysLeft = (deadline: any) => {
  const end = parseDeadline(deadline);
  if (!end) return 'Open';
  const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Ended';
  if (diff === 0) return '🔥 Last day!';
  return `${diff} days left`;
};
  // FIX: show create button for admin OR directors
  const canCreate = isAdmin || userRole === 'director' || userRole === 'admin';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>🏆 Contests</Text>
          <Text style={styles.subHeading}>Showcase your cinema talent</Text>
        </View>
        {canCreate && (
          <TouchableOpacity
            style={styles.postBtn}
            onPress={() => navigation.navigate('PostContest')}>
            <Text style={styles.postBtnText}>+ Create</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* FILTER TABS */}
      <View style={styles.tabRow}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 30}}>
        <View style={styles.section}>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#C9956C"
              style={{marginTop: 40}}
            />
          ) : filteredContests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyText}>No contests yet!</Text>
              <Text style={styles.emptySubText}>
                {canCreate
                  ? 'Be the first to create one!'
                  : 'Check back soon for exciting contests!'}
              </Text>
              {canCreate && (
                <TouchableOpacity
                  style={styles.emptyCreateBtn}
                  onPress={() => navigation.navigate('PostContest')}>
                  <Text style={styles.emptyCreateText}>+ Create Contest</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredContests.map((item: any) => {
              const daysLeft = getDaysLeft(item.deadline);
              const isEnded = daysLeft === 'Ended';

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.card, isEnded && styles.cardEnded]}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate('ContestDetail', {contest: item})
                  }>

                  {/* TOP */}
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <Text style={styles.contestType}>
                        {item.type || 'Short Film'}
                      </Text>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                    </View>
                    <View
                      style={[
                        styles.feeBadge,
                        item.entryFee > 0
                          ? styles.feeBadgePaid
                          : styles.feeBadgeFree,
                      ]}>
                      <Text
                        style={[
                          styles.feeBadgeText,
                          item.entryFee > 0
                            ? styles.feeBadgeTextPaid
                            : styles.feeBadgeTextFree,
                        ]}>
                        {item.entryFee > 0 ? `₹${item.entryFee}` : 'FREE'}
                      </Text>
                    </View>
                  </View>

                  {/* PRIZE */}
                  <Text style={styles.prize}>
                    🏆 Prize: {item.prize || 'Coming Soon'}
                  </Text>

                  {/* DESCRIPTION */}
                  {item.description ? (
                    <Text numberOfLines={2} style={styles.description}>
                      {item.description}
                    </Text>
                  ) : null}

                  {/* FOOTER */}
                  <View style={styles.cardFooter}>
                    <Text
                      style={[
                        styles.deadline,
                        isEnded && {color: '#FCA5A5'},
                      ]}>
                      ⏰ {daysLeft}
                    </Text>
                    <Text style={styles.entries}>
                      👥 {item.entriesCount || 0} entries
                    </Text>
                  </View>

                  {/* VOTING BADGE */}
                  <View style={styles.votingBadge}>
                    <Text style={styles.votingBadgeText}>
                      ⚖️ Jury + Public Voting
                    </Text>
                  </View>

                  {/* CTA BUTTON */}
                  <View
                    style={[
                      styles.enterBtn,
                      isEnded && styles.enterBtnEnded,
                    ]}>
                    <Text
                      style={[
                        styles.enterBtnText,
                        isEnded && styles.enterBtnTextEnded,
                      ]}>
                      {isEnded ? '🔒 Contest Ended' : 'View Contest →'}
                    </Text>
                  </View>

                </TouchableOpacity>
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 14,
  },

  heading: {color: '#FFFFFF', fontSize: 28, fontWeight: 'bold'},
  subHeading: {color: '#A09080', marginTop: 4, fontSize: 13},

  postBtn: {
    backgroundColor: '#C9956C',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    elevation: 5,
  },

  postBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: 'bold'},

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 6,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  tabActive: {backgroundColor: '#C9956C', borderColor: '#C9956C'},
  tabText: {color: '#A09080', fontSize: 11, fontWeight: '600'},
  tabTextActive: {color: '#FFFFFF'},

  section: {paddingHorizontal: 16},

  emptyBox: {alignItems: 'center', marginTop: 100},
  emptyIcon: {fontSize: 54, marginBottom: 18},
  emptyText: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8},
  emptySubText: {color: '#A09080', fontSize: 14, marginBottom: 20, textAlign: 'center'},

  emptyCreateBtn: {
    backgroundColor: '#C9956C',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  emptyCreateText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 14},

  card: {
    backgroundColor: '#1C1C1C',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  cardEnded: {opacity: 0.7},

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  cardTopLeft: {flex: 1, marginRight: 10},

  contestType: {
    color: '#C9956C',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },

  cardTitle: {color: '#FFFFFF', fontSize: 17, fontWeight: 'bold'},

  feeBadge: {borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6},
  feeBadgeFree: {backgroundColor: '#064E3B'},
  feeBadgePaid: {backgroundColor: '#451A03'},
  feeBadgeText: {fontSize: 12, fontWeight: 'bold'},
  feeBadgeTextFree: {color: '#6EE7B7'},
  feeBadgeTextPaid: {color: '#FCD34D'},

  prize: {color: '#FBBF24', fontSize: 14, fontWeight: 'bold', marginBottom: 8},

  description: {
    color: '#A09080',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  deadline: {color: '#A09080', fontSize: 12},
  entries: {color: '#A09080', fontSize: 12},

  votingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 14,
  },

  votingBadgeText: {color: '#C9956C', fontSize: 11, fontWeight: '600'},

  enterBtn: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },

  enterBtnEnded: {borderColor: '#450A0A'},

  enterBtnText: {color: '#C9956C', fontSize: 14, fontWeight: 'bold'},
  enterBtnTextEnded: {color: '#FCA5A5'},
});