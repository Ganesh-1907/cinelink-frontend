import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  Alert, RefreshControl,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'User';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function DirectorDashboardScreen({navigation}: any) {
  const [applications, setApplications] = useState<any[]>([]);
  const [auditions, setAuditions] = useState<any[]>([]);
  const [myAuditions, setMyAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAuditionId, setExpandedAuditionId] = useState<string | null>(null);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'auditions' | 'applications'>('auditions');

  const user = auth().currentUser;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadMyAuditions(), loadApplications()]);
    } finally {
      setLoading(false);
    }
  };

  /* ── LOAD MY AUDITIONS ── */
  const loadMyAuditions = async () => {
    try {
      const snapshot = await firestore()
        .collection('auditions')
        .where('directorId', '==', user?.uid)
        .get();
      const items = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      items.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMyAuditions(items);
    } catch (e) {
      console.log('LOAD MY AUDITIONS ERROR:', e);
    }
  };

  /* ── LOAD APPLICATIONS ── */
  const loadApplications = async () => {
    try {
      const snapshot = await firestore()
        .collection('applications')
        .where('directorId', '==', user?.uid)
        .get();
      const apps = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      apps.sort((a: any, b: any) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0));
      setApplications(apps);
      const auditionIds = [...new Set(apps.map((app: any) => app.auditionId))];
      const auditionDocs = await Promise.all(
        auditionIds.map(id => firestore().collection('auditions').doc(id as string).get()),
      );
      setAuditions(auditionDocs.filter(doc => doc.exists).map(doc => ({id: doc.id, ...doc.data()})));
    } catch (e) {
      console.log('LOAD APPLICATIONS ERROR:', e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  /* ── DELETE AUDITION ── */
  const deleteAudition = (audition: any) => {
    Alert.alert(
      '🗑 Delete Audition',
      `Are you sure you want to delete "${audition.title}"? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('auditions').doc(audition.id).delete();
              setMyAuditions(prev => prev.filter(a => a.id !== audition.id));
              Alert.alert('✅ Deleted', 'Audition deleted successfully!');
            } catch (e) {
              console.log('DELETE ERROR:', e);
              Alert.alert('Error', 'Could not delete audition.');
            }
          },
        },
      ],
    );
  };

  /* ── TOGGLE AUDITION STATUS ── */
  const toggleAuditionStatus = async (audition: any) => {
    const newStatus = audition.isActive === false ? true : false;
    try {
      await firestore().collection('auditions').doc(audition.id).update({
        isActive: newStatus,
        status: newStatus ? 'Open' : 'Closed',
      });
      setMyAuditions(prev =>
        prev.map(a => a.id === audition.id ? {...a, isActive: newStatus, status: newStatus ? 'Open' : 'Closed'} : a),
      );
      Alert.alert('✅ Updated', `Audition ${newStatus ? 'reopened' : 'closed'} successfully!`);
    } catch (e) {
      Alert.alert('Error', 'Could not update audition status.');
    }
  };

  /* ── ACCEPT APPLICATION ── */
  const acceptApplication = async (appId: string, app: any) => {
    setProcessingAppId(appId);
    try {
      await firestore().collection('applications').doc(appId).update({
        status: 'Accepted',
        decidedAt: firestore.FieldValue.serverTimestamp(),
      });
      await firestore().collection('notifications').add({
        userId: app.applicantId,
        type: 'application_accepted',
        title: '🎉 Application Accepted!',
        message: `Congratulations! You've been selected for "${app.auditionTitle}"`,
        senderId: user?.uid,
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      await loadApplications();
      Alert.alert('✅ Accepted', `${app.applicantName} has been notified!`);
    } catch (e) {
      Alert.alert('Error', 'Could not accept application');
    } finally {
      setProcessingAppId(null);
    }
  };

  /* ── REJECT APPLICATION ── */
  const rejectApplication = async (appId: string, app: any) => {
    Alert.alert('Reject Application', 'Are you sure you want to reject this application?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          setProcessingAppId(appId);
          try {
            await firestore().collection('applications').doc(appId).update({
              status: 'Rejected',
              decidedAt: firestore.FieldValue.serverTimestamp(),
            });
            await firestore().collection('notifications').add({
              userId: app.applicantId,
              type: 'application_rejected',
              title: '❌ Application Not Selected',
              message: `Thank you for applying for "${app.auditionTitle}". We appreciate your interest!`,
              senderId: user?.uid,
              read: false,
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
            await loadApplications();
            Alert.alert('Done', `${app.applicantName} has been notified`);
          } catch (e) {
            Alert.alert('Error', 'Could not reject application');
          } finally {
            setProcessingAppId(null);
          }
        },
      },
    ]);
  };

  /* ── START CHAT ── */
   const startChat = async (app: any) => {
  try {
    const chatId = [user?.uid, app.applicantId].sort().join('_');

    const myDoc = await firestore().collection('users').doc(user?.uid).get();
    const myData = myDoc.data();
    const directorName = myData?.fullName || myData?.displayName || myData?.name
      || user?.displayName || cleanName(user?.email) || 'Director';

    const applicantName = app.applicantName || cleanName(app.applicantEmail) || 'Applicant';

    await firestore().collection('chats').doc(chatId).set({
      participants: [user?.uid, app.applicantId],
      participantNames: [directorName, applicantName],
      participantEmails: [user?.email, app.applicantEmail],
      lastMessage: '',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    navigation.navigate('ChatScreen', {
      chat: {id: chatId, participantNames: [directorName, applicantName]},
    });
  } catch (e) {
    console.log('CHAT ERROR:', e);
    Alert.alert('Error', 'Could not start chat');
  }
};

  const renderApplicationCard = (app: any) => {
    const isProcessing = processingAppId === app.id;
    const statusColor = app.status === 'Accepted' ? '#10B981' : app.status === 'Rejected' ? '#EF4444' : '#FBBF24';
    const statusBgColor = app.status === 'Accepted' ? '#064E3B' : app.status === 'Rejected' ? '#7F1D1D' : '#78350F';

    return (
      <View key={app.id} style={styles.appCard}>
        <View style={styles.appHeader}>
          <View style={styles.appAvatarCircle}>
            <Text style={styles.appAvatarText}>{(app.applicantName || 'A').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.appName}>{app.applicantName || 'Applicant'}</Text>
            <Text style={styles.appEmail}>{cleanName(app.applicantEmail)}</Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusBgColor}]}>
            <Text style={[styles.statusText, {color: statusColor}]}>
              {app.status === 'Accepted' ? '✅ Selected' : app.status === 'Rejected' ? '❌ Rejected' : '⏳ Pending'}
            </Text>
          </View>
        </View>

        <Text style={styles.appliedDate}>📅 {app.appliedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</Text>

        {app.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>💭 Applicant Note:</Text>
            <Text style={styles.noteText}>{app.note}</Text>
          </View>
        ) : null}

        {app.status === 'Pending' ? (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.acceptBtn, isProcessing && styles.btnDisabled]}
              onPress={() => acceptApplication(app.id, app)}
              disabled={isProcessing}>
              {isProcessing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.acceptBtnText}>✅ Accept</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, isProcessing && styles.btnDisabled]}
              onPress={() => rejectApplication(app.id, app)}
              disabled={isProcessing}>
              {isProcessing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.rejectBtnText}>❌ Reject</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatBtn} onPress={() => startChat(app)} disabled={isProcessing}>
              <Text style={styles.chatBtnText}>💬</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.chatBtn, {marginTop: 10}]} onPress={() => startChat(app)}>
            <Text style={styles.chatBtnText}>💬 Message</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAuditionGroup = (auditionId: string) => {
    const audition = auditions.find(a => a.id === auditionId);
    const auditionApps = applications.filter(a => a.auditionId === auditionId);
    const isExpanded = expandedAuditionId === auditionId;
    const stats = {
      total: auditionApps.length,
      pending: auditionApps.filter((a: any) => a.status === 'Pending').length,
      accepted: auditionApps.filter((a: any) => a.status === 'Accepted').length,
      rejected: auditionApps.filter((a: any) => a.status === 'Rejected').length,
    };

    return (
      <View key={auditionId} style={styles.auditionSection}>
        <TouchableOpacity
          style={styles.auditionHeader}
          onPress={() => setExpandedAuditionId(isExpanded ? null : auditionId)}>
          <View style={{flex: 1}}>
            <Text style={styles.auditionTitle}>🎭 {audition?.title || 'Audition'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}><Text style={styles.statLabel}>Total</Text><Text style={styles.statValue}>{stats.total}</Text></View>
              <View style={styles.statItem}><Text style={[styles.statLabel, {color: '#FBBF24'}]}>Pending</Text><Text style={[styles.statValue, {color: '#FBBF24'}]}>{stats.pending}</Text></View>
              <View style={styles.statItem}><Text style={[styles.statLabel, {color: '#10B981'}]}>Accepted</Text><Text style={[styles.statValue, {color: '#10B981'}]}>{stats.accepted}</Text></View>
              <View style={styles.statItem}><Text style={[styles.statLabel, {color: '#EF4444'}]}>Rejected</Text><Text style={[styles.statValue, {color: '#EF4444'}]}>{stats.rejected}</Text></View>
            </View>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.applicationsContainer}>
            {auditionApps.length === 0 ? (
              <Text style={styles.noAppsText}>No applications yet</Text>
            ) : (
              auditionApps.map(app => renderApplicationCard(app))
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#C9956C" />
          <Text style={styles.loaderText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const uniqueAuditionIds = [...new Set(applications.map(app => app.auditionId))];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9956C" colors={['#C9956C']} progressBackgroundColor="#0A0A0A" />
        }>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📊 Director Dashboard</Text>
          <Text style={styles.headerSubtitle}>Manage your auditions & applications</Text>
        </View>

        {/* STATS */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{myAuditions.length}</Text>
            <Text style={styles.statCardLabel}>My Auditions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, {color: '#FBBF24'}]}>{applications.filter((a: any) => a.status === 'Pending').length}</Text>
            <Text style={styles.statCardLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, {color: '#10B981'}]}>{applications.filter((a: any) => a.status === 'Accepted').length}</Text>
            <Text style={styles.statCardLabel}>Accepted</Text>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'auditions' && styles.tabActive]}
            onPress={() => setActiveTab('auditions')}>
            <Text style={[styles.tabText, activeTab === 'auditions' && styles.tabTextActive]}>
              🎭 My Auditions ({myAuditions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'applications' && styles.tabActive]}
            onPress={() => setActiveTab('applications')}>
            <Text style={[styles.tabText, activeTab === 'applications' && styles.tabTextActive]}>
              📋 Applications ({applications.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* MY AUDITIONS TAB */}
        {activeTab === 'auditions' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.postNewBtn}
              onPress={() => navigation.navigate('PostAudition')}>
              <Text style={styles.postNewBtnText}>+ Post New Audition</Text>
            </TouchableOpacity>

            {myAuditions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🎭</Text>
                <Text style={styles.emptyTitle}>No auditions posted yet</Text>
                <Text style={styles.emptySubtitle}>Post your first audition to get started!</Text>
              </View>
            ) : (
              myAuditions.map(audition => (
                <View key={audition.id} style={styles.myAuditionCard}>
                  <View style={styles.myAuditionTop}>
                    <View style={[
                      styles.auditionStatusBadge,
                      {backgroundColor: audition.isActive === false ? '#2A0A0A' : '#064E3B'},
                    ]}>
                      <Text style={[
                        styles.auditionStatusText,
                        {color: audition.isActive === false ? '#FCA5A5' : '#4ADE80'},
                      ]}>
                        {audition.isActive === false ? '🔴 Closed' : '🟢 Open'}
                      </Text>
                    </View>
                    <Text style={styles.myAuditionAppsCount}>
                      {applications.filter(a => a.auditionId === audition.id).length} applications
                    </Text>
                  </View>

                  <Text style={styles.myAuditionTitle}>{audition.title}</Text>

                  <View style={styles.myAuditionMeta}>
                    {audition.location ? <Text style={styles.myAuditionMetaText}>📍 {audition.location}</Text> : null}
                    {audition.role ? <Text style={styles.myAuditionMetaText}>🎭 {audition.role}</Text> : null}
                  </View>

                  {/* ACTION BUTTONS */}
                  <View style={styles.myAuditionActions}>
                    <TouchableOpacity
                      style={styles.toggleBtn}
                      onPress={() => toggleAuditionStatus(audition)}>
                      <Text style={styles.toggleBtnText}>
                        {audition.isActive === false ? '🔓 Reopen' : '🔒 Close'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteAuditionBtn}
                      onPress={() => deleteAudition(audition)}>
                      <Text style={styles.deleteAuditionBtnText}>🗑 Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* APPLICATIONS TAB */}
        {activeTab === 'applications' && (
          <View style={styles.section}>
            {applications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No applications yet</Text>
                <Text style={styles.emptySubtitle}>Applications will appear here when actors apply</Text>
              </View>
            ) : (
              uniqueAuditionIds.map(audId => renderAuditionGroup(audId as string))
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  loaderContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loaderText: {color: '#A09080', marginTop: 12, fontSize: 14},
  header: {paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#1C1C1C', borderBottomWidth: 1, borderBottomColor: '#2A2A2A'},
  headerTitle: {color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 4},
  headerSubtitle: {color: '#A09080', fontSize: 14},
  statsContainer: {flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10},
  statCard: {flex: 1, backgroundColor: '#1C1C1C', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center'},
  statCardValue: {color: '#C9956C', fontSize: 24, fontWeight: 'bold', marginBottom: 4},
  statCardLabel: {color: '#A09080', fontSize: 11, textAlign: 'center'},

  /* TABS */
  tabs: {flexDirection: 'row', marginHorizontal: 16, marginTop: 8, marginBottom: 4, backgroundColor: '#1C1C1C', borderRadius: 12, padding: 4},
  tab: {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10},
  tabActive: {backgroundColor: '#C9956C'},
  tabText: {color: '#A09080', fontSize: 12, fontWeight: '600'},
  tabTextActive: {color: '#FFFFFF', fontWeight: 'bold'},

  section: {paddingHorizontal: 16, paddingVertical: 12},

  postNewBtn: {backgroundColor: '#C9956C', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16},
  postNewBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 15},

  /* MY AUDITION CARD */
  myAuditionCard: {
    backgroundColor: '#1C1C1C', borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A',
  },
  myAuditionTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  auditionStatusBadge: {borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4},
  auditionStatusText: {fontSize: 12, fontWeight: '700'},
  myAuditionAppsCount: {color: '#A09080', fontSize: 12},
  myAuditionTitle: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 8},
  myAuditionMeta: {flexDirection: 'row', gap: 12, marginBottom: 12},
  myAuditionMetaText: {color: '#A09080', fontSize: 12},
  myAuditionActions: {flexDirection: 'row', gap: 8},
  toggleBtn: {
    flex: 1, backgroundColor: '#2A2A2A', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#C9956C',
  },
  toggleBtnText: {color: '#C9956C', fontSize: 13, fontWeight: '600'},
  deleteAuditionBtn: {
    flex: 1, backgroundColor: '#2A0A0A', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#DC2626',
  },
  deleteAuditionBtnText: {color: '#FCA5A5', fontSize: 13, fontWeight: '600'},

  /* APPLICATIONS */
  auditionSection: {marginBottom: 16, backgroundColor: '#1C1C1C', borderRadius: 14, borderWidth: 1, borderColor: '#2A2A2A', overflow: 'hidden'},
  auditionHeader: {flexDirection: 'row', padding: 14, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#2A2A2A'},
  auditionTitle: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 10},
  statsRow: {flexDirection: 'row', gap: 12},
  statItem: {alignItems: 'center'},
  statLabel: {color: '#A09080', fontSize: 10, marginBottom: 2},
  statValue: {color: '#C9956C', fontSize: 16, fontWeight: 'bold'},
  expandIcon: {color: '#C9956C', fontSize: 16, fontWeight: 'bold'},
  applicationsContainer: {paddingHorizontal: 12, paddingVertical: 12, gap: 10},
  noAppsText: {color: '#A09080', textAlign: 'center', paddingVertical: 16, fontSize: 13},
  appCard: {backgroundColor: '#0A0A0A', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#2A2A2A'},
  appHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  appAvatarCircle: {width: 44, height: 44, borderRadius: 22, backgroundColor: '#C9956C', justifyContent: 'center', alignItems: 'center', marginRight: 12},
  appAvatarText: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold'},
  appName: {color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 2},
  appEmail: {color: '#A09080', fontSize: 12},
  statusBadge: {borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4},
  statusText: {fontSize: 11, fontWeight: '600'},
  appliedDate: {color: '#A09080', fontSize: 11, marginBottom: 10},
  noteBox: {backgroundColor: '#1C1C1C', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A'},
  noteLabel: {color: '#C9956C', fontSize: 11, fontWeight: '600', marginBottom: 6},
  noteText: {color: '#A09080', fontSize: 12, lineHeight: 18},
  actionButtonsRow: {flexDirection: 'row', gap: 8, marginTop: 10},
  acceptBtn: {flex: 1, backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
  acceptBtnText: {color: '#FFFFFF', fontSize: 12, fontWeight: '600'},
  rejectBtn: {flex: 1, backgroundColor: '#EF4444', borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
  rejectBtnText: {color: '#FFFFFF', fontSize: 12, fontWeight: '600'},
  chatBtn: {flex: 1, backgroundColor: '#0B2C4F', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#C9956C'},
  chatBtnText: {color: '#C9956C', fontSize: 12, fontWeight: '600'},
  btnDisabled: {opacity: 0.5},
  emptyContainer: {alignItems: 'center', paddingVertical: 60},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 6},
  emptySubtitle: {color: '#A09080', fontSize: 14, textAlign: 'center', paddingHorizontal: 20},
});