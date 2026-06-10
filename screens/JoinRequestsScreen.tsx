import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, StatusBar,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function JoinRequestsScreen({route, navigation}: any) {
  const {project} = route.params;
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth().currentUser;

  useEffect(() => {
    const unsub = firestore()
      .collection('projects')
      .doc(project.id)
      .collection('requests')
      .orderBy('requestedAt', 'desc')
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          setRequests(data);
          setLoading(false);
        },
        err => {
          console.log('REQUESTS ERROR:', err);
          setLoading(false);
        },
      );
    return () => unsub();
  }, []);

  const handleAccept = async (request: any) => {
    Alert.alert(
      '✅ Accept Request',
      `Accept ${request.userName} as ${request.role}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Accept',
          onPress: async () => {
            try {
              // Update request status
              await firestore()
                .collection('projects')
                .doc(project.id)
                .collection('requests')
                .doc(request.id)
                .update({status: 'Accepted'});

              // Add to members subcollection
              await firestore()
                .collection('projects')
                .doc(project.id)
                .collection('members')
                .doc(request.userId)
                .set({
                  userId: request.userId,
                  name: request.userName,
                  email: request.userEmail,
                  role: request.role,
                  joinedAt: firestore.FieldValue.serverTimestamp(),
                });

              // Mark role as filled
              const updatedRoles = project.rolesNeeded.map((r: any) =>
                r.role === request.role && !r.filled
                  ? {...r, filled: true, memberId: request.userId, memberName: request.userName}
                  : r,
              );
              await firestore().collection('projects').doc(project.id).update({
                rolesNeeded: updatedRoles,
                membersCount: firestore.FieldValue.increment(1),
              });

              // Add to project group chat participants
              const chatId = `project_${project.id}`;
              const chatRef = firestore().collection('chats').doc(chatId);
              const chatDoc = await chatRef.get();
              if (chatDoc.exists) {
                await chatRef.update({
                  participants: firestore.FieldValue.arrayUnion(request.userId),
                  participantNames: firestore.FieldValue.arrayUnion(request.userName),
                });
              } else {
                await chatRef.set({
                  id: chatId,
                  isGroupChat: true,
                  groupName: project.title,
                  projectId: project.id,
                  participants: [currentUser?.uid, request.userId],
                  participantNames: [project.directorName, request.userName],
                  lastMessage: '',
                  createdAt: firestore.FieldValue.serverTimestamp(),
                });
              }

              // Notify the user
              await firestore().collection('notifications').add({
                userId: request.userId,
                type: 'request_accepted',
                title: '🎉 Request Accepted!',
                message: `You have been accepted as ${request.role} in "${project.title}"!`,
                projectId: project.id,
                read: false,
                createdAt: firestore.FieldValue.serverTimestamp(),
              });

              Alert.alert('✅ Accepted!', `${request.userName} has been added to the project as ${request.role}.`);
            } catch (e: any) {
              console.log(e);
              Alert.alert('Error', e.message || 'Could not accept request.');
            }
          },
        },
      ],
    );
  };

  const handleReject = async (request: any) => {
    Alert.alert(
      '❌ Reject Request',
      `Reject ${request.userName}'s request for ${request.role}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('projects')
                .doc(project.id)
                .collection('requests')
                .doc(request.id)
                .update({status: 'Rejected'});

              // Notify the user
              await firestore().collection('notifications').add({
                userId: request.userId,
                type: 'request_rejected',
                title: '❌ Request Update',
                message: `Your request for ${request.role} in "${project.title}" was not accepted this time.`,
                projectId: project.id,
                read: false,
                createdAt: firestore.FieldValue.serverTimestamp(),
              });

              Alert.alert('Done', 'Request has been rejected.');
            } catch (e: any) {
              console.log(e);
              Alert.alert('Error', e.message || 'Could not reject request.');
            }
          },
        },
      ],
    );
  };

  const viewProfile = (userId: string) => {
    navigation.navigate('PublicProfile', {userId});
  };

  const getStatusColor = (status: string) => {
    if (status === 'Accepted') return '#4ADE80';
    if (status === 'Rejected') return '#EF4444';
    return '#FBBF24';
  };

  const getStatusBg = (status: string) => {
    if (status === 'Accepted') return '#1A3020';
    if (status === 'Rejected') return '#2A0A0A';
    return '#2A1500';
  };

  const renderRequest = ({item}: any) => {
    const isPending = item.status === 'Pending';

    return (
      <View style={styles.card}>

        {/* USER INFO */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.userName?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.userName}</Text>
            <Text style={styles.userRole}>Applying for: <Text style={styles.roleHighlight}>{item.role}</Text></Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: getStatusBg(item.status)}]}>
            <Text style={[styles.statusText, {color: getStatusColor(item.status)}]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* NOTE */}
        {item.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Note from applicant:</Text>
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        ) : null}

        {/* ACTIONS */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => viewProfile(item.userId)}>
            <Text style={styles.profileBtnText}>👤 View Profile</Text>
          </TouchableOpacity>

          {isPending && (
            <>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleReject(item)}>
                <Text style={styles.rejectBtnText}>✕ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAccept(item)}>
                <Text style={styles.acceptBtnText}>✓ Accept</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Join Requests</Text>
          <Text style={styles.headerSub}>{project.title}</Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9956C" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          renderItem={renderRequest}
          contentContainerStyle={{padding: 16, paddingBottom: 40}}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptyText}>
                When crew members apply to join your project, they'll appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#2A2A2A',
  },
  backBtn: {marginRight: 12},
  backText: {color: '#C9956C', fontSize: 26, fontWeight: 'bold'},
  headerInfo: {flex: 1},
  headerTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold'},
  headerSub: {color: '#A09080', fontSize: 12, marginTop: 2},
  pendingBadge: {
    backgroundColor: '#C9956C', borderRadius: 12,
    minWidth: 24, height: 24,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  pendingBadgeText: {color: '#FFFFFF', fontSize: 12, fontWeight: 'bold'},

  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  card: {
    backgroundColor: '#1C1C1C', borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10},
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 18},
  userInfo: {flex: 1},
  userName: {color: '#FFFFFF', fontSize: 15, fontWeight: 'bold'},
  userRole: {color: '#A09080', fontSize: 13, marginTop: 2},
  roleHighlight: {color: '#C9956C', fontWeight: 'bold'},
  statusBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusText: {fontSize: 12, fontWeight: 'bold'},

  noteBox: {
    backgroundColor: '#2A2A2A', borderRadius: 10,
    padding: 10, marginBottom: 10,
  },
  noteLabel: {color: '#A09080', fontSize: 11, marginBottom: 4},
  noteText: {color: '#FFFFFF', fontSize: 13, lineHeight: 20},

  actions: {flexDirection: 'row', gap: 8},
  profileBtn: {
    flex: 1, backgroundColor: '#2A2A2A',
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  profileBtnText: {color: '#A09080', fontSize: 13, fontWeight: '600'},
  rejectBtn: {
    flex: 1, backgroundColor: '#2A0A0A',
    borderRadius: 10, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#DC2626',
  },
  rejectBtnText: {color: '#FCA5A5', fontSize: 13, fontWeight: 'bold'},
  acceptBtn: {
    flex: 1, backgroundColor: '#1A3020',
    borderRadius: 10, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#4ADE80',
  },
  acceptBtnText: {color: '#4ADE80', fontSize: 13, fontWeight: 'bold'},

  emptyContainer: {alignItems: 'center', paddingTop: 80},
  emptyEmoji: {fontSize: 60, marginBottom: 16},
  emptyTitle: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8},
  emptyText: {
    color: '#A09080', fontSize: 14, textAlign: 'center',
    paddingHorizontal: 40, lineHeight: 22,
  },
});