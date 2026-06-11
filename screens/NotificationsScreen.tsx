import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const C = {
  background:   '#0A0A0A',
  card:         '#1C1C1C',
  cardElevated: '#242424',
  border:       '#2A2A2A',
  primary:      '#C9956C',
  primaryFaint: 'rgba(201,149,108,0.10)',
  textPrimary:  '#FFFFFF',
  textSecondary:'#A09080',
  success:      '#4ADE80',
  successFaint: 'rgba(74,222,128,0.12)',
  error:        '#EF4444',
  errorFaint:   'rgba(239,68,68,0.12)',
  warning:      '#FBBF24',
  warningFaint: 'rgba(251,191,36,0.10)',
};

const cleanMessage = (msg: string): string => {
  if (!msg) return '';
  return msg.replace(/([a-zA-Z0-9._%+\-]+)@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, (_, u) => u);
};

const getIcon = (type: string) => {
  switch (type) {
    case 'connect_request':  return '🤝';
    case 'connect_accepted': return '✅';
    case 'new_follower':     return '👥';
    case 'shortlisted':      return '🎉';
    case 'new_audition':     return '🎬';
    case 'contest_deadline': return '⏰';
    case 'selected':         return '✅';
    case 'rejected':         return '😔';
    case 'message':          return '💬';
    case 'application':      return '📋';
    default:                 return '🔔';
  }
};

const getBorderColor = (type: string) => {
  switch (type) {
    case 'connect_request':  return C.primary;
    case 'connect_accepted': return C.success;
    case 'new_follower':     return C.primary;
    case 'shortlisted':      return C.success;
    case 'new_audition':     return C.primary;
    case 'contest_deadline': return C.warning;
    case 'selected':         return C.success;
    case 'rejected':         return C.error;
    default:                 return C.primary;
  }
};

// Which notification types navigate to a profile on tap
const isProfileNotif = (type: string) =>
  [
    'new_follower',
    'follow',
    'follower',
    'connect_request',
    'connect_accepted',
    'message',
  ].includes(type);

// Which notification types navigate to audition detail
const isAuditionNotif = (type: string) =>
  ['new_audition', 'shortlisted', 'selected', 'rejected', 'application'].includes(type);

const isCastingRequestNotif = (type: string) =>
  ['casting_request', 'new_casting_request'].includes(type);

const isCastingApprovedNotif = (type: string) =>
  ['casting_approved', 'casting_rejected'].includes(type);

const isMessageNotif = (type: string) => type === 'message';
const isContestNotif = (type: string) =>
  ['contest_entry', 'contest_created', 'new_contest', 'contest_deadline', 'contest_winner'].includes(type);

export default function NotificationsScreen({navigation}: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [senderNames, setSenderNames]     = useState<any>({});
  const [loading, setLoading]             = useState(true);
  const user = auth().currentUser;

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = firestore()
      .collection('notifications')
      .where('userId', '==', user?.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        {includeMetadataChanges: false},
        snapshot => {
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          setNotifications(data);
          setLoading(false);
          loadSenderNames(data);
        },
        err => {
          console.log('NOTIFICATIONS ERROR:', err);
          setLoading(false);
        },
      );
    return () => unsub();
  }, []);

  const loadSenderNames = (notifList: any[]) => {
  const names: any = {};
  for (const notif of notifList) {
    const senderId = notif.senderId || notif.viewerId || notif.fromUserId;
    const name = notif.senderName || notif.fromName || notif.userName;
    if (senderId && name) names[senderId] = name;
  }
  setSenderNames(names);
};

  const resolveMessage = (item: any): string => {
    const raw = item.message || '';
    const senderId = item.senderId || item.viewerId || item.fromUserId;
    const realName = senderNames[senderId];
    if (realName) {
      return raw.replace(/([a-zA-Z0-9._%+\-]+)@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, realName);
    }
    return cleanMessage(raw);
  };

  const markAsRead = async (id: string) => {
    await firestore().collection('notifications').doc(id).update({read: true}).catch(() => {});
  };

  const deleteNotification = async (id: string) => {
    // Update UI instantly before Firestore confirms
    setNotifications(prev => prev.filter(n => n.id !== id));
    await firestore().collection('notifications').doc(id).delete().catch(() => {});
  };

  // ── TAP NOTIFICATION → Navigate to relevant screen ─────────
  const handleNotifTap = async (item: any) => {
  await markAsRead(item.id);

  const senderId =
    item.senderId ||
    item.viewerId ||
    item.fromUserId ||
    item.followerId;

  if (isCastingRequestNotif(item.type)) {
    navigation.navigate('AdminReports');

  } else if (isCastingApprovedNotif(item.type)) {
    navigation.navigate('DirectorDashboard');

  } else if (isMessageNotif(item.type) && item.chatId) {
    navigation.navigate('ChatScreen', {
      chat: {
        id: item.chatId,
        participants: [user?.uid, item.senderId].filter(Boolean),
        participantNames: [],
        lastMessage: '',
      },
    });

  } else if (isContestNotif(item.type)) {
    if (item.contestId) {
      navigation.navigate('ContestDetail', {
        contestId: item.contestId,
      });
    } else {
      navigation.navigate('Main', {
        screen: 'Contests',
      });
    }

  } else if (
    item.type === 'request_accepted' ||
    item.type === 'request_rejected'
  ) {
    navigation.navigate('MyApplications');

  } else if (item.type === 'comment' && item.auditionId) {
    navigation.navigate('AuditionDetail', {
      auditionId: item.auditionId,
    });

  } else if (isAuditionNotif(item.type) && item.auditionId) {
    navigation.navigate('AuditionDetail', {
      auditionId: item.auditionId,
    });

  } else if (isProfileNotif(item.type) && senderId) {
    navigation.navigate('PublicProfile', {
      userId: senderId,
    });
  }
};
  // ── ACCEPT CONNECT REQUEST ───────────────────────────────────
  const handleAccept = async (notif: any) => {
    try {
      const currentUserName = user?.displayName || user?.email?.split('@')[0] || 'User';
      const senderId = notif.senderId;

      // Create connection
      await firestore().collection('connections').add({
        users: [user?.uid, senderId],
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Notify sender
      await firestore().collection('notifications').add({
        userId:     senderId,
        type:       'connect_accepted',
        title:      '✅ Connection Accepted!',
        message:    `${currentUserName} accepted your connection request`,
        senderId:   user?.uid,
        senderName: currentUserName,
        read:       false,
        createdAt:  firestore.FieldValue.serverTimestamp(),
      });

      // Update request status
      const reqSnap = await firestore()
        .collection('connectionRequests')
        .where('fromUserId', '==', senderId)
        .where('toUserId',   '==', user?.uid)
        .get();
      for (const doc of reqSnap.docs) {
        await doc.ref.update({status: 'accepted'});
      }

      // Delete this notification
      await deleteNotification(notif.id);

      // ✅ Navigate to their profile after accepting
      Alert.alert(
        'Connected! 🎉',
        `You are now connected with ${notif.senderName || 'this creator'}. You can now message each other.`,
        [
          {text: 'View Profile', onPress: () => navigation.navigate('PublicProfile', {userId: senderId})},
          {text: 'OK', style: 'cancel'},
        ],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    }
  };

  // ── DECLINE CONNECT REQUEST ──────────────────────────────────
  const handleDecline = async (notif: any) => {
    try {
      const reqSnap = await firestore()
        .collection('connectionRequests')
        .where('fromUserId', '==', notif.senderId)
        .where('toUserId',   '==', user?.uid)
        .get();
      for (const doc of reqSnap.docs) {
        await doc.ref.update({status: 'declined'});
      }
      await deleteNotification(notif.id);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    }
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Delete all notifications?', [
      {
        text: 'Clear All', style: 'destructive',
        onPress: async () => {
          // Clear UI instantly
          setNotifications([]);
          const batch = firestore().batch();
          notifications.forEach(n =>
            batch.delete(firestore().collection('notifications').doc(n.id)),
          );
          await batch.commit().catch(() => {});
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.background} />
      <View style={styles.section}>

        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.heading}>🔔 Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount} new</Text>
              </View>
            )}
          </View>
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={C.primary} style={{marginTop: 30}} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubText}>Connect with creators to get updates</Text>
          </View>
        ) : (
          notifications.map(item => {
            const isConnectRequest = item.type === 'connect_request';
            const isTappable =
  isProfileNotif(item.type) ||
  isAuditionNotif(item.type) ||
  isCastingRequestNotif(item.type) ||
  isCastingApprovedNotif(item.type) ||
  isMessageNotif(item.type) ||
  isContestNotif(item.type) ||
  item.type === 'request_accepted' ||
  item.type === 'request_rejected' ||
  item.type === 'new_audition' ||
  item.type === 'comment';
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={isTappable ? 0.7 : 1}
                style={[
                  styles.card,
                  {borderColor: getBorderColor(item.type), borderWidth: item.read ? 1 : 2},
                  isConnectRequest && styles.connectRequestCard,
                ]}
                onPress={() => isTappable && !isConnectRequest && handleNotifTap(item)}>

                <View style={styles.cardRow}>
                  {/* ICON */}
                  <View style={[styles.iconBox, {backgroundColor: C.primaryFaint}]}>
                    <Text style={styles.icon}>{getIcon(item.type)}</Text>
                  </View>

                  {/* CONTENT */}
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      {!item.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.cardMessage}>{resolveMessage(item)}</Text>
                    <Text style={styles.cardTime}>
                      {item.createdAt?.toDate
                        ? item.createdAt.toDate().toLocaleDateString([], {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})
                        : 'Recently'}
                    </Text>

                    {/* CONNECT REQUEST — Accept / Decline */}
                    {isConnectRequest && (
                      <View style={styles.actionBtns}>
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => handleAccept(item)}>
                          <Text style={styles.acceptBtnText}>✅ Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.declineBtn}
                          onPress={() => handleDecline(item)}>
                          <Text style={styles.declineBtnText}>✕ Decline</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Tap hint for profile notifications */}
                    {isTappable && !isConnectRequest && (
  <Text style={styles.tapHint}>
    {isCastingRequestNotif(item.type)
      ? 'Tap to review application →'
      : isMessageNotif(item.type)
      ? 'Tap to open chat →'
      : isCastingApprovedNotif(item.type)
      ? 'Tap to go to dashboard →'
      : isContestNotif(item.type)
      ? 'Tap to view contest →'
      : 'Tap to view profile →'}
  </Text>
)}
                  </View>

                  {/* DELETE */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={e => {
                      e.stopPropagation?.();
                      deleteNotification(item.id);
                    }}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: C.background},
  section:   {padding: 16, paddingBottom: 40},

  headerRow:  {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 10},
  heading:    {color: C.textPrimary, fontSize: 20, fontWeight: 'bold'},
  badge:      {backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4},
  badgeText:  {color: '#FFFFFF', fontSize: 12, fontWeight: 'bold'},
  clearBtn:   {backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.primary},
  clearBtnText: {color: C.primary, fontSize: 12, fontWeight: 'bold'},

  emptyBox:     {alignItems: 'center', marginTop: 80},
  emptyIcon:    {fontSize: 50, marginBottom: 16},
  emptyTitle:   {color: C.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: 8},
  emptySubText: {color: C.textSecondary, fontSize: 14, textAlign: 'center'},

  card:               {backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12},
  connectRequestCard: {backgroundColor: '#1A1410'},
  cardRow:            {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  iconBox:            {width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center'},
  icon:               {fontSize: 20},

  cardContent: {flex: 1},
  cardHeader:  {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4},
  cardTitle:   {color: C.textPrimary, fontSize: 15, fontWeight: 'bold', flex: 1},
  unreadDot:   {width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginLeft: 6},
  cardMessage: {color: C.textSecondary, fontSize: 13, marginBottom: 6, lineHeight: 18},
  cardTime:    {color: C.textSecondary, fontSize: 11},
  tapHint:     {color: C.primary, fontSize: 11, marginTop: 6, fontWeight: '500'},

  actionBtns: {flexDirection: 'row', gap: 10, marginTop: 12},
  acceptBtn:  {flex: 1, backgroundColor: C.successFaint, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.success},
  acceptBtnText: {color: C.success, fontWeight: 'bold', fontSize: 13},
  declineBtn:    {flex: 1, backgroundColor: C.errorFaint, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.error},
  declineBtnText:{color: C.error, fontWeight: 'bold', fontSize: 13},

  deleteBtn:     {backgroundColor: C.primaryFaint, borderRadius: 12, width: 28, height: 28, justifyContent: 'center', alignItems: 'center'},
  deleteBtnText: {color: C.primary, fontSize: 12, fontWeight: 'bold'},
});