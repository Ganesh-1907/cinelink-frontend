import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function MyApplicationsScreen({navigation}: any) {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = auth().currentUser;

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('applications')
      .where('applicantId', '==', user?.uid)
      .onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Sort by latest first
        data.sort((a: any, b: any) => {
          if (!a.appliedAt || !b.appliedAt) return 0;
          return b.appliedAt.seconds - a.appliedAt.seconds;
        });
        setApplications(data);
        setLoading(false);
        setRefreshing(false);
      });
    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Selected':
        return {
          badge: styles.badgeGreen,
          text: styles.badgeTextGreen,
          cardBorder: '#4ADE80',
          message: '🎉 Congratulations! You are selected!',
          messageColor: '#4ADE80',
        };
      case 'Rejected':
        return {
          badge: styles.badgeRed,
          text: styles.badgeTextRed,
          cardBorder: '#FCA5A5',
          message: '😔 Not selected this time. Keep trying!',
          messageColor: '#FCA5A5',
        };
      default:
        return {
          badge: styles.badgeAmber,
          text: styles.badgeTextAmber,
          cardBorder: '#2A2A2A',
          message: '⏳ Application under review by director...',
          messageColor: '#FBBF24',
        };
    }
  };

  /* ── STATS ── */
  const totalApps = applications.length;
  const selectedCount = applications.filter(a => a.status === 'Selected').length;
  const pendingCount = applications.filter(a => a.status === 'Pending').length;
  const rejectedCount = applications.filter(a => a.status === 'Rejected').length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#C9956C"
          colors={['#C9956C']}
        />
      }>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      <View style={styles.section}>

        <Text style={styles.heading}>My Applications</Text>
        <Text style={styles.subHeading}>{totalApps} total applications</Text>

        {/* STATS ROW */}
        {totalApps > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalApps}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, {color: '#FBBF24'}]}>
                {pendingCount}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, {color: '#4ADE80'}]}>
                {selectedCount}
              </Text>
              <Text style={styles.statLabel}>Selected</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, {color: '#FCA5A5'}]}>
                {rejectedCount}
              </Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
          </View>
        )}

        {/* LOADING */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#C9956C" // FIX: was purple
            style={{marginTop: 30}}
          />
        ) : applications.length === 0 ? (

          /* EMPTY STATE */
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyText}>No applications yet!</Text>
            <Text style={styles.emptySubText}>
              Browse auditions and apply to see them here.
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => navigation.goBack()}>
              <Text style={styles.browseBtnText}>Browse Auditions</Text>
            </TouchableOpacity>
          </View>
        ) : (

          /* APPLICATION CARDS */
          applications.map((item: any) => {
            const config = getStatusConfig(item.status);
            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {borderColor: config.cardBorder},
                ]}>

                {/* HEADER */}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.auditionTitle}
                  </Text>
                  <View style={[styles.badge, config.badge]}>
                    <Text style={[styles.badgeText, config.text]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* STATUS MESSAGE */}
                <Text style={[styles.statusMessage, {color: config.messageColor}]}>
                  {config.message}
                </Text>

                {/* NOTE shown if actor left one */}
                {item.note ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteLabel}>Your note:</Text>
                    <Text style={styles.noteText}>{item.note}</Text>
                  </View>
                ) : null}

                {/* DATE */}
                <Text style={styles.cardSub}>
                  📅 Applied:{' '}
                  {item.appliedAt?.toDate
                    ? item.appliedAt.toDate().toLocaleDateString()
                    : 'Recently'}
                </Text>

                {/* VIEW AUDITION BUTTON */}
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() =>
                    navigation.navigate('AuditionDetail', {
                      audition: {id: item.auditionId, title: item.auditionTitle},
                    })
                  }>
                  <Text style={styles.viewBtnText}>View Audition →</Text>
                </TouchableOpacity>

              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A', // FIX: was #020617
  },

  section: {
    padding: 16,
    paddingBottom: 40,
  },

  heading: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  subHeading: {
    color: '#A09080',
    fontSize: 13,
    marginBottom: 16,
  },

  /* STATS */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  statNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },

  statLabel: {
    color: '#A09080',
    fontSize: 11,
  },

  /* EMPTY */
  emptyBox: {
    alignItems: 'center',
    marginTop: 80,
  },

  emptyIcon: {fontSize: 50, marginBottom: 16},

  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  emptySubText: {
    color: '#A09080',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },

  browseBtn: {
    backgroundColor: '#C9956C', // FIX: was purple
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  browseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  /* CARD */
  card: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },

  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  },

  statusMessage: {
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '500',
  },

  noteBox: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#C9956C',
  },

  noteLabel: {
    color: '#C9956C',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  noteText: {
    color: '#A09080',
    fontSize: 13,
    lineHeight: 18,
  },

  cardSub: {
    color: '#A09080',
    fontSize: 12,
    marginBottom: 12,
  },

  viewBtn: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },

  viewBtnText: {
    color: '#C9956C',
    fontSize: 13,
    fontWeight: '600',
  },

  /* BADGES */
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeText: {fontSize: 11, fontWeight: '600'},

  badgeGreen: {backgroundColor: '#064E3B'},
  badgeTextGreen: {color: '#6EE7B7'},
  badgeAmber: {backgroundColor: '#451A03'},
  badgeTextAmber: {color: '#FCD34D'},
  badgeRed: {backgroundColor: '#450A0A'},
  badgeTextRed: {color: '#FCA5A5'},
});