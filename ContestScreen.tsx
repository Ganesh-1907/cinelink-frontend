import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function ContestScreen({navigation}: any) {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const user = auth().currentUser;

  const tabs = ['All', 'Free', 'Paid', 'My Contests'];

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('contests')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
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

  const getDaysLeft = (deadline: string) => {
    const today = new Date();
    const end = new Date(deadline);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Ended';
    if (diff === 0) return 'Last day!';
    return `${diff} days left`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      <View style={styles.header}>
        <Text style={styles.heading}>🏆 Contests</Text>
        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => navigation.navigate('PostContest')}>
          <Text style={styles.postBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

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

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {loading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{marginTop: 30}} />
          ) : filteredContests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyText}>No contests yet!</Text>
              <Text style={styles.emptySubText}>Be the first to create one!</Text>
            </View>
          ) : (
            filteredContests.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => navigation.navigate('ContestDetail', {contest: item})}>

                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <Text style={styles.contestType}>{item.type || 'Short Film'}</Text>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                  </View>
                  <View style={[
                    styles.feeBadge,
                    item.entryFee > 0 ? styles.feeBadgePaid : styles.feeBadgeFree,
                  ]}>
                    <Text style={[
                      styles.feeBadgeText,
                      item.entryFee > 0 ? styles.feeBadgeTextPaid : styles.feeBadgeTextFree,
                    ]}>
                      {item.entryFee > 0 ? `Rs.${item.entryFee}` : 'FREE'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.prize}>🏆 Prize: {item.prize}</Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.deadline}>
                    ⏰ {getDaysLeft(item.deadline)}
                  </Text>
                  <Text style={styles.entries}>
                    👥 {item.entriesCount || 0} entries
                  </Text>
                  <View style={styles.votingBadge}>
                    <Text style={styles.votingBadgeText}>Jury + Public</Text>
                  </View>
                </View>

                <View style={styles.enterBtn}>
                  <Text style={styles.enterBtnText}>View Contest →</Text>
                </View>

              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heading: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  postBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  postBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  tabText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubText: {
    color: '#64748B',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTopLeft: {
    flex: 1,
    marginRight: 8,
  },
  contestType: {
    color: '#6366F1',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  feeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  feeBadgeFree: {
    backgroundColor: '#064E3B',
  },
  feeBadgePaid: {
    backgroundColor: '#451A03',
  },
  feeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  feeBadgeTextFree: {
    color: '#6EE7B7',
  },
  feeBadgeTextPaid: {
    color: '#FCD34D',
  },
  prize: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  deadline: {
    color: '#94A3B8',
    fontSize: 12,
  },
  entries: {
    color: '#94A3B8',
    fontSize: 12,
  },
  votingBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  votingBadgeText: {
    color: '#A5B4FC',
    fontSize: 10,
    fontWeight: '500',
  },
  enterBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  enterBtnText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: 'bold',
  },
});