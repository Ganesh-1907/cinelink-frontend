import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, SafeAreaView, StatusBar,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function ProjectDetailScreen({route, navigation}: any) {
  const {project} = route.params;
  const [requests, setRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [myRequest, setMyRequest] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);

  const currentUser = auth().currentUser;
  const isDirector = project.directorId === currentUser?.uid;
  const currentUserName =
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'User';

  const openRoles = project.rolesNeeded?.filter((r: any) => !r.filled) || [];

  useEffect(() => {
    loadMembers();
    loadMyRequest();
  }, []);

  const loadMembers = async () => {
    try {
      const snapshot = await firestore()
        .collection('projects')
        .doc(project.id)
        .collection('members')
        .get();
      setMembers(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    } catch (e) {console.log(e);}
  };

  const loadMyRequest = async () => {
    if (!currentUser) return;
    try {
      const snapshot = await firestore()
        .collection('projects')
        .doc(project.id)
        .collection('requests')
        .where('userId', '==', currentUser.uid)
        .get();
      if (!snapshot.empty) {
        setMyRequest({id: snapshot.docs[0].id, ...snapshot.docs[0].data()});
      }
    } catch (e) {console.log(e);}
  };

  const submitRequest = async () => {
    if (!selectedRole) {
      Alert.alert('Select Role', 'Please select which role you are applying for.');
      return;
    }
    setLoading(true);
    try {
      await firestore()
        .collection('projects')
        .doc(project.id)
        .collection('requests')
        .add({
          userId: currentUser?.uid,
          userName: currentUserName,
          userEmail: currentUser?.email,
          role: selectedRole,
          note: note.trim(),
          status: 'Pending',
          requestedAt: firestore.FieldValue.serverTimestamp(),
        });

      // Notify director
      await firestore().collection('notifications').add({
        userId: project.directorId,
        type: 'join_request',
        title: '🎬 New Join Request!',
        message: `${currentUserName} wants to join "${project.title}" as ${selectedRole}`,
        projectId: project.id,
        senderId: currentUser?.uid,
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('✅ Request Sent!', 'Your request has been sent to the director. You will be notified when they respond.');
      setShowApplyForm(false);
      setSelectedRole('');
      setNote('');
      loadMyRequest();
    } catch (e: any) {
      console.log(e);
      Alert.alert('Error', e.message || 'Could not send request. Try again.');
    }
    setLoading(false);
  };

  const openGroupChat = async () => {
    try {
      const chatId = `project_${project.id}`;
      const chatRef = firestore().collection('chats').doc(chatId);
      const chatDoc = await chatRef.get();

      if (!chatDoc.exists) {
        await chatRef.set({
          id: chatId,
          isGroupChat: true,
          groupName: project.title,
          projectId: project.id,
          participants: [project.directorId, currentUser?.uid],
          participantNames: [project.directorName, currentUserName],
          lastMessage: '',
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      const updatedDoc = await chatRef.get();
      navigation.navigate('ChatScreen', {
        chat: {id: chatId, ...updatedDoc.data()},
      });
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Could not open group chat.');
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Accepted') return '#4ADE80';
    if (status === 'Rejected') return '#EF4444';
    return '#FBBF24';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{project.title}</Text>
        </View>

        <View style={styles.section}>

          {/* PROJECT INFO CARD */}
          <View style={styles.infoCard}>
            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{project.type}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>🟢 {project.status}</Text>
              </View>
            </View>

            <Text style={styles.projectTitle}>{project.title}</Text>

            <View style={styles.metaGrid}>
              <Text style={styles.metaItem}>🎬 {project.directorName}</Text>
              <Text style={styles.metaItem}>📍 {project.location}</Text>
              <Text style={styles.metaItem}>🗣️ {project.language}</Text>
              <Text style={styles.metaItem}>👥 {project.membersCount || 1} members</Text>
            </View>

            {project.description ? (
              <Text style={styles.description}>{project.description}</Text>
            ) : null}
          </View>

          {/* ROLES NEEDED */}
          <View style={styles.rolesCard}>
            <Text style={styles.sectionTitle}>🎭 Roles Needed</Text>
            {project.rolesNeeded?.map((role: any, index: number) => (
              <View key={index} style={styles.roleRow}>
                <View style={[styles.roleStatus, role.filled && styles.roleStatusFilled]} />
                <Text style={styles.roleName}>{role.role}</Text>
                <View style={[styles.roleBadge, role.filled && styles.roleBadgeFilled]}>
                  <Text style={[styles.roleBadgeText, role.filled && styles.roleBadgeTextFilled]}>
                    {role.filled ? `✓ ${role.memberName || 'Filled'}` : 'OPEN'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* TEAM MEMBERS */}
          {members.length > 0 && (
            <View style={styles.membersCard}>
              <Text style={styles.sectionTitle}>👥 Team Members</Text>
              <View style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {project.directorName?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.memberName}>{project.directorName}</Text>
                  <Text style={styles.memberRole}>👑 Director</Text>
                </View>
              </View>
              {members.map((member: any) => (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.name?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberRole}>🎭 {member.role}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* MY REQUEST STATUS */}
          {myRequest && !isDirector && (
            <View style={[styles.myRequestCard, {borderColor: getStatusColor(myRequest.status)}]}>
              <Text style={styles.myRequestTitle}>Your Application</Text>
              <Text style={styles.myRequestRole}>Role: {myRequest.role}</Text>
              <View style={[styles.myRequestStatus, {backgroundColor: getStatusColor(myRequest.status) + '20'}]}>
                <Text style={[styles.myRequestStatusText, {color: getStatusColor(myRequest.status)}]}>
                  {myRequest.status === 'Pending' ? '⏳ Pending Review' :
                   myRequest.status === 'Accepted' ? '✅ Accepted!' : '❌ Rejected'}
                </Text>
              </View>
            </View>
          )}

          {/* ACTION BUTTONS */}
          {isDirector ? (
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('JoinRequests', {project})}>
                <Text style={styles.primaryBtnText}>📋 View Join Requests</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={openGroupChat}>
                <Text style={styles.secondaryBtnText}>💬 Project Group Chat</Text>
              </TouchableOpacity>
            </View>
          ) : myRequest ? (
            myRequest.status === 'Accepted' ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={openGroupChat}>
                <Text style={styles.primaryBtnText}>💬 Join Group Chat</Text>
              </TouchableOpacity>
            ) : null
          ) : openRoles.length > 0 ? (
            <View style={styles.actionSection}>
              {!showApplyForm ? (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setShowApplyForm(true)}>
                  <Text style={styles.primaryBtnText}>🙋 Request to Join</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.applyForm}>
                  <Text style={styles.applyFormTitle}>Which role are you applying for?</Text>

                  {openRoles.map((role: any, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.roleOption, selectedRole === role.role && styles.roleOptionActive]}
                      onPress={() => setSelectedRole(role.role)}>
                      <Text style={[styles.roleOptionText, selectedRole === role.role && styles.roleOptionTextActive]}>
                        {selectedRole === role.role ? '✓ ' : ''}{role.role}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <TextInput
                    style={styles.noteInput}
                    placeholder="Add a note to the director (optional)..."
                    placeholderTextColor="#A09080"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                  />

                  <View style={styles.applyFormBtns}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => {setShowApplyForm(false); setSelectedRole(''); setNote('');}}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitBtn, loading && {opacity: 0.5}]}
                      onPress={submitRequest}
                      disabled={loading}>
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Send Request</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>🔒 All roles are filled</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: {marginRight: 12},
  backText: {color: '#C9956C', fontSize: 26, fontWeight: 'bold'},
  headerTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', flex: 1},
  section: {padding: 16},

  infoCard: {
    backgroundColor: '#1C1C1C', borderRadius: 16,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  badgeRow: {flexDirection: 'row', gap: 8, marginBottom: 10},
  typeBadge: {
    backgroundColor: '#2A2A2A', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeText: {color: '#A09080', fontSize: 12},
  statusBadge: {
    backgroundColor: '#1A3020', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#4ADE80',
  },
  statusBadgeText: {color: '#4ADE80', fontSize: 12, fontWeight: '600'},
  projectTitle: {color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 12},
  metaGrid: {gap: 6, marginBottom: 12},
  metaItem: {color: '#A09080', fontSize: 14},
  description: {color: '#A09080', fontSize: 14, lineHeight: 22, marginTop: 4},

  rolesCard: {
    backgroundColor: '#1C1C1C', borderRadius: 16,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  sectionTitle: {color: '#C9956C', fontSize: 16, fontWeight: 'bold', marginBottom: 12},
  roleRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10},
  roleStatus: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#C9956C',
  },
  roleStatusFilled: {backgroundColor: '#4ADE80'},
  roleName: {color: '#FFFFFF', fontSize: 14, flex: 1},
  roleBadge: {
    backgroundColor: '#2A1500', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#C9956C',
  },
  roleBadgeFilled: {backgroundColor: '#1A3020', borderColor: '#4ADE80'},
  roleBadgeText: {color: '#C9956C', fontSize: 11, fontWeight: '700'},
  roleBadgeTextFilled: {color: '#4ADE80'},

  membersCard: {
    backgroundColor: '#1C1C1C', borderRadius: 16,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  memberRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10},
  memberAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 16},
  memberName: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  memberRole: {color: '#A09080', fontSize: 12, marginTop: 2},

  myRequestCard: {
    backgroundColor: '#1C1C1C', borderRadius: 14,
    padding: 14, marginBottom: 14,
    borderWidth: 1,
  },
  myRequestTitle: {color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', marginBottom: 4},
  myRequestRole: {color: '#A09080', fontSize: 13, marginBottom: 8},
  myRequestStatus: {borderRadius: 8, padding: 8, alignItems: 'center'},
  myRequestStatusText: {fontSize: 14, fontWeight: 'bold'},

  actionSection: {gap: 10},
  primaryBtn: {
    backgroundColor: '#C9956C', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  primaryBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
  secondaryBtn: {
    backgroundColor: '#1C1C1C', borderRadius: 14,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#C9956C',
  },
  secondaryBtnText: {color: '#C9956C', fontSize: 15, fontWeight: 'bold'},

  applyForm: {
    backgroundColor: '#1C1C1C', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#2A2A2A',
  },
  applyFormTitle: {color: '#C9956C', fontSize: 14, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase'},
  roleOption: {
    backgroundColor: '#2A2A2A', borderRadius: 10,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#333333',
  },
  roleOptionActive: {backgroundColor: '#1A3020', borderColor: '#4ADE80'},
  roleOptionText: {color: '#A09080', fontSize: 14},
  roleOptionTextActive: {color: '#4ADE80', fontWeight: 'bold'},
  noteInput: {
    backgroundColor: '#2A2A2A', borderRadius: 12,
    padding: 12, color: '#FFFFFF', fontSize: 14,
    borderWidth: 1, borderColor: '#333333',
    marginTop: 8, marginBottom: 12,
    height: 80, textAlignVertical: 'top',
  },
  applyFormBtns: {flexDirection: 'row', gap: 10},
  cancelBtn: {
    flex: 1, backgroundColor: '#2A2A2A',
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  cancelBtnText: {color: '#A09080', fontSize: 14, fontWeight: '600'},
  submitBtn: {
    flex: 1, backgroundColor: '#C9956C',
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  submitBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: 'bold'},

  fullBadge: {
    backgroundColor: '#2A0A0A', borderRadius: 14,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#DC2626',
  },
  fullBadgeText: {color: '#FCA5A5', fontSize: 14, fontWeight: 'bold'},
});