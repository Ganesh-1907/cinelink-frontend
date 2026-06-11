import React, {useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, Linking, Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'Creator';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const PublicProfileScreen = ({route, navigation}: any) => {
  const {userId} = route.params;
  const currentUser = auth().currentUser;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  const [userData, setUserData]           = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [isFollowing, setIsFollowing]     = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBanned, setIsBanned]           = useState(false);

  // ── Connection state ──────────────────────────────────────
  const [isConnected, setIsConnected]             = useState(false);
  const [connectRequestSent, setConnectRequestSent] = useState(false);
  const [connectLoading, setConnectLoading]       = useState(false);

  const isOwnProfile = currentUser?.uid === userId;

  useEffect(() => {
    loadUser();
    checkFollowing();
    if (!isOwnProfile) checkConnectionStatus();
  }, []);

  const loadUser = async () => {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        setUserData(data);
        setIsBanned(data?.isBanned || false);
      }
      setLoading(false);
    } catch (e) {
      console.log(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubF = firestore()
      .collection('users').doc(userId).collection('followers')
      .onSnapshot(snap => setFollowersCount(snap.size), e => console.log(e));
    const unsubFi = firestore()
      .collection('users').doc(userId).collection('following')
      .onSnapshot(snap => setFollowingCount(snap.size), e => console.log(e));
    return () => { unsubF(); unsubFi(); };
  }, [userId]);

  const checkFollowing = async () => {
    if (!currentUser) return;
    try {
      const doc = await firestore()
        .collection('users').doc(userId)
        .collection('followers').doc(currentUser.uid).get();
      setIsFollowing(doc.exists);
    } catch (e) {console.log(e);}
  };

  // ── Check if connected or request sent ───────────────────
  const checkConnectionStatus = async () => {
    if (!currentUser) return;
    try {
      // Check if connected
      const connected = await firestore()
        .collection('connections')
        .where('users', 'array-contains', currentUser.uid)
        .get();
      const found = connected.docs.some(doc =>
        doc.data().users?.includes(userId),
      );
      setIsConnected(found);

      if (!found) {
        // Check if request already sent
        const sent = await firestore()
          .collection('connectionRequests')
          .where('fromUserId', '==', currentUser.uid)
          .where('toUserId', '==', userId)
          .get();
        setConnectRequestSent(!sent.empty);
      }
    } catch (e) {console.log(e);}
  };

  const handleFollow = async () => {
    if (!currentUser) return;
    setFollowLoading(true);
    try {
      const followRef = firestore()
        .collection('users').doc(userId)
        .collection('followers').doc(currentUser.uid);
      const followDoc = await followRef.get();
      const currentUserName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';

      if (followDoc.exists) {
        await followRef.delete();
        await firestore().collection('users').doc(currentUser.uid)
          .collection('following').doc(userId).delete();
        setIsFollowing(false);
      } else {
        await followRef.set({
          userId: currentUser.uid, userName: currentUserName,
          email: currentUser.email, followedAt: firestore.FieldValue.serverTimestamp(),
        });
        await firestore().collection('users').doc(currentUser.uid)
          .collection('following').doc(userId).set({
            userId, followedAt: firestore.FieldValue.serverTimestamp(),
          });
         // Check if notification already exists
const existingNotif = await firestore()
  .collection('notifications')
  .where('userId', '==', userId)
  .where('senderId', '==', currentUser.uid)
  .where('type', '==', 'new_follower')
  .get();

if (existingNotif.empty) {
  await firestore().collection('notifications').add({
    userId, type: 'new_follower', title: '🎉 New Follower!',
    message: `${currentUserName} started following you`,
    senderId: currentUser.uid, read: false,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}
        setIsFollowing(true);
      }
    } catch (e) {console.log(e);}
    finally {setFollowLoading(false);}
  };

  // ── Send Connect Request ──────────────────────────────────
  const sendConnectRequest = async () => {
    if (!currentUser || connectLoading) return;
    setConnectLoading(true);
    setConnectRequestSent(true); // optimistic — show instantly
    try {
      const currentUserName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      const otherUserName = cleanName(userData?.displayName || userData?.fullName || userData?.name || userData?.email);

      await firestore().collection('connectionRequests').add({
        fromUserId:    currentUser.uid,
        fromUserName:  currentUserName,
        fromUserEmail: currentUser.email,
        toUserId:      userId,
        toUserName:    otherUserName,
        status:        'pending',
        createdAt:     firestore.FieldValue.serverTimestamp(),
      });

      await firestore().collection('notifications').add({
        userId,
        type:       'connect_request',
        title:      '🤝 Connection Request',
        message:    `${currentUserName} wants to connect with you`,
        senderId:   currentUser.uid,
        senderName: currentUserName,
        read:       false,
        createdAt:  firestore.FieldValue.serverTimestamp(),
      });

      setConnectRequestSent(true);
      Alert.alert('Request Sent! 🤝', `Connection request sent to ${otherUserName}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not send request.');
    } finally {
      setConnectLoading(false);
    }
  };

  // ── Start Chat (only if connected) ───────────────────────
  const startChat = async () => {
    if (!currentUser || isOwnProfile) return;
    if (!isConnected) {
      Alert.alert('Not Connected', 'Send a connect request first. Once they accept, you can message them.');
      return;
    }
    try {
      const chatId = [currentUser.uid, userId].sort().join('_');
      const chatRef = firestore().collection('chats').doc(chatId);
      const currentUserName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      const otherUserName = cleanName(userData?.displayName || userData?.fullName || userData?.name || userData?.email);

      // Use set with merge — avoids a get() call which would fail
      // if the doc doesn't exist yet (permission-denied on non-existent doc)
      await chatRef.set({
        id: chatId,
        participants: [currentUser.uid, userId],
        participantNames: [currentUserName, otherUserName],
        participantEmails: [currentUser.email || '', userData?.email || ''],
        lastMessage: '',
        lastMessageTime: null,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      // createdAt only on first write
      const chatDoc = await chatRef.get();
      if (!chatDoc.data()?.createdAt) {
        await chatRef.update({createdAt: firestore.FieldValue.serverTimestamp()});
      }

      navigation.navigate('ChatScreen', {
        chat: {
          id: chatId,
          participants: [currentUser.uid, userId],
          participantNames: [currentUserName, otherUserName],
          participantEmails: [currentUser.email || '', userData?.email || ''],
          lastMessage: '',
        },
      });
    } catch (e: any) {
      console.log('CHAT ERROR:', JSON.stringify(e));
      Alert.alert('Error', e?.message || 'Could not start chat. Try again.');
    }
  };

  /* ── ADMIN: BAN USER ── */
  const handleBan = () => {
    Alert.alert(
      isBanned ? '✅ Unban User' : '🚫 Ban User',
      isBanned
        ? `Remove ban for "${displayName}"? They can use CineLink again.`
        : `Ban "${displayName}"? They will be blocked from CineLink.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: isBanned ? 'Unban' : 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isBanned) {
                await firestore().collection('users').doc(userId).update({isBanned: false});
                await firestore().collection('bannedUsers').doc(userId).delete();
                setIsBanned(false);
                Alert.alert('✅ Unbanned', `${displayName} can now use CineLink.`);
              } else {
                await firestore().collection('users').doc(userId).update({
                  isBanned: true,
                  bannedAt: firestore.FieldValue.serverTimestamp(),
                  bannedBy: currentUser?.email,
                });
                await firestore().collection('bannedUsers').doc(userId).set({
                  userId, userEmail: userData?.email, userName: displayName,
                  bannedAt: firestore.FieldValue.serverTimestamp(),
                  bannedBy: currentUser?.email,
                });
                setIsBanned(true);
                Alert.alert('🚫 Banned', `${displayName} has been banned from CineLink.`);
              }
            } catch (e) {
              Alert.alert('Error', 'Could not update ban status.');
            }
          },
        },
      ],
    );
  };

  /* ── ADMIN: REMOVE USER ── */
  const handleRemove = () => {
    Alert.alert(
      '🗑️ Remove User',
      `Permanently delete all data for "${displayName}"?\n\nCannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const batch = firestore().batch();
              batch.delete(firestore().collection('users').doc(userId));
              const auditions = await firestore().collection('auditions').where('directorId', '==', userId).get();
              auditions.docs.forEach(doc => batch.delete(doc.ref));
              const applications = await firestore().collection('applications').where('applicantId', '==', userId).get();
              applications.docs.forEach(doc => batch.delete(doc.ref));
              const films = await firestore().collection('films').where('directorId', '==', userId).get();
              films.docs.forEach(doc => batch.delete(doc.ref));
              await batch.commit();
              Alert.alert('✅ Removed', `All data for "${displayName}" has been deleted.`);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', 'Could not remove user. Try again.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C9956C" />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  const displayName = cleanName(userData?.displayName || userData?.fullName || userData?.name || userData?.email);
  const avatarUrl   = userData?.photoUrl || userData?.photoURL || null;
  const isVerified  = userData?.verificationStatus === 'verified';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.profileSection}>

        {/* BANNED BANNER */}
        {isBanned && (
          <View style={styles.bannedBanner}>
            <Text style={styles.bannedText}>🚫 This user is banned</Text>
          </View>
        )}

        {/* AVATAR */}
        {avatarUrl ? (
          <Image source={{uri: avatarUrl}} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName?.charAt(0)?.toUpperCase()}</Text>
          </View>
        )}

        {/* VERIFIED BADGE */}
        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✅ Verified</Text>
          </View>
        )}

        <Text style={styles.name}>{displayName}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>🎭 {userData?.role || 'Creator'}</Text>
        </View>

        {userData?.bio
          ? <Text style={styles.bio}>{userData.bio}</Text>
          : <Text style={styles.bioEmpty}>No bio added yet</Text>}

        {/* STATS */}
<View style={styles.statsContainer}>
  <TouchableOpacity
    style={styles.statBox}
    onPress={() => navigation.navigate('Followers', {userId, displayName, tab: 'followers'})}>
    <Text style={styles.statNumber}>{followersCount}</Text>
    <Text style={styles.statLabel}>Followers</Text>
  </TouchableOpacity>
  <View style={styles.statDivider} />
  <TouchableOpacity
    style={styles.statBox}
    onPress={() => navigation.navigate('Followers', {userId, displayName, tab: 'following'})}>
    <Text style={styles.statNumber}>{followingCount}</Text>
    <Text style={styles.statLabel}>Following</Text>
  </TouchableOpacity>
</View>

        {/* ── ACTION BUTTONS ── */}
        {!isOwnProfile && (
          <View style={styles.actionRow}>

            {/* FOLLOW BUTTON */}
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
              disabled={followLoading}>
              {followLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.followButtonText}>
                    {isFollowing ? '✓ Following' : '+ Follow'}
                  </Text>}
            </TouchableOpacity>

            {/* CONNECT / PENDING / MESSAGE BUTTON */}
            {isConnected ? (
              // ✅ Connected — chat unlocked
              <TouchableOpacity style={styles.messageButton} onPress={startChat}>
                <Text style={styles.messageButtonText}>💬 Message</Text>
              </TouchableOpacity>
            ) : connectRequestSent ? (
              // ⏳ Request sent
              <View style={[styles.messageButton, styles.pendingButton]}>
                <Text style={[styles.messageButtonText, {color: '#A09080'}]}>⏳ Pending</Text>
              </View>
            ) : (
              // 🤝 Not connected — show Connect
              <TouchableOpacity
                style={[styles.messageButton, styles.connectButton]}
                onPress={sendConnectRequest}
                disabled={connectLoading}>
                {connectLoading
                  ? <ActivityIndicator color="#C9956C" size="small" />
                  : <Text style={styles.messageButtonText}>🤝 Connect</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Connection status hint */}
        {!isOwnProfile && !isConnected && !connectRequestSent && (
          <Text style={styles.connectHint}>
            Send a connect request to message this creator
          </Text>
        )}
        {!isOwnProfile && connectRequestSent && !isConnected && (
          <Text style={styles.connectHint}>
            Waiting for {displayName} to accept your request
          </Text>
        )}
        {!isOwnProfile && isConnected && (
          <Text style={[styles.connectHint, {color: '#4ADE80'}]}>
            ✅ You are connected with {displayName}
          </Text>
        )}

        {isOwnProfile && (
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.editProfileText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
        )}

        <View style={styles.collabBadge}>
          <Text style={styles.collabText}>🎬 Open for Collaboration</Text>
        </View>

        {/* ADMIN ACTIONS */}
        {isAdmin && !isOwnProfile && (
          <View style={styles.adminSection}>
            <Text style={styles.adminLabel}>🛡️ Admin Actions</Text>
            <View style={styles.adminRow}>
              <TouchableOpacity
                style={[styles.banBtn, isBanned && styles.unbanBtn]}
                onPress={handleBan}>
                <Text style={styles.banBtnText}>
                  {isBanned ? '✅ Unban User' : '🚫 Ban User'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
                <Text style={styles.removeBtnText}>🗑️ Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* PORTFOLIO PHOTOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Portfolio Photos</Text>
        {userData?.portfolioPhotos?.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {userData.portfolioPhotos.map((url: string, index: number) => (
              <Image key={index} source={{uri: url}} style={styles.portfolioPhoto} />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>No portfolio photos added yet</Text>
        )}
      </View>

      {/* INTRO VIDEO */}
      {userData?.introVideoLink ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intro Video</Text>
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => Linking.openURL(userData.introVideoLink)}>
            <Text style={styles.linkCardIcon}>🎥</Text>
            <View style={styles.linkCardContent}>
              <Text style={styles.linkCardTitle}>Watch Intro Reel</Text>
              <Text style={styles.linkCardUrl} numberOfLines={1}>{userData.introVideoLink}</Text>
            </View>
            <Text style={styles.linkCardArrow}>→</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* PREVIOUS WORKS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Previous Works</Text>
        {userData?.portfolio1 || userData?.portfolio2 || userData?.portfolio3 ? (
          [userData.portfolio1, userData.portfolio2, userData.portfolio3]
            .filter(Boolean)
            .map((link: string, i: number) => (
              <TouchableOpacity
                key={i}
                style={styles.linkCard}
                onPress={() => Linking.openURL(link)}>
                <Text style={styles.linkCardIcon}>🔗</Text>
                <View style={styles.linkCardContent}>
                  <Text style={styles.linkCardTitle}>Work {i + 1}</Text>
                  <Text style={styles.linkCardUrl} numberOfLines={1}>{link}</Text>
                </View>
                <Text style={styles.linkCardArrow}>→</Text>
              </TouchableOpacity>
            ))
        ) : (
          <Text style={styles.emptyText}>No previous works added yet</Text>
        )}
      </View>

      {isOwnProfile && userData?.phone ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📱</Text>
            <Text style={styles.infoText}>{userData.phone}</Text>
          </View>
        </View>
      ) : null}

      <View style={{height: 40}} />
    </ScrollView>
  );
};

export default PublicProfileScreen;

const styles = StyleSheet.create({
  container:        {flex: 1, backgroundColor: '#0A0A0A'},
  loadingContainer: {flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center'},
  errorText:        {color: '#A09080', fontSize: 16},

  profileSection: {alignItems: 'center', paddingTop: 40, paddingBottom: 30, paddingHorizontal: 20},

  bannedBanner: {
    backgroundColor: '#450A0A', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    marginBottom: 16, borderWidth: 1, borderColor: '#DC2626',
    width: '100%', alignItems: 'center',
  },
  bannedText: {color: '#FCA5A5', fontSize: 13, fontWeight: 'bold'},

  avatar: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 3, borderColor: '#FF8C5A',
  },
  avatarImage: {width: 110, height: 110, borderRadius: 55, marginBottom: 16, borderWidth: 3, borderColor: '#C9956C'},
  avatarText:  {color: '#FFFFFF', fontSize: 44, fontWeight: 'bold'},

  verifiedBadge: {backgroundColor: '#064E3B', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 10, borderWidth: 1, borderColor: '#6EE7B7'},
  verifiedText:  {color: '#6EE7B7', fontSize: 12, fontWeight: 'bold'},

  name: {color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center'},

  roleBadge: {backgroundColor: '#1C1C1C', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#C9956C'},
  roleText:  {color: '#C9956C', fontWeight: '600', fontSize: 13},

  bio:      {color: '#A09080', fontSize: 15, textAlign: 'center', paddingHorizontal: 20, marginBottom: 24, lineHeight: 22},
  bioEmpty: {color: '#A09080', fontSize: 14, textAlign: 'center', marginBottom: 24, fontStyle: 'italic'},

  statsContainer: {flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: '#1C1C1C', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, borderWidth: 1, borderColor: '#2A2A2A'},
  statBox:        {alignItems: 'center', paddingHorizontal: 20},
  statDivider:    {width: 1, height: 40, backgroundColor: '#2A2A2A'},
  statNumber:     {color: '#FFFFFF', fontSize: 28, fontWeight: 'bold'},
  statLabel:      {color: '#A09080', fontSize: 13, marginTop: 4},

  // ── Action Buttons ──────────────────────────────────────────
  actionRow:    {flexDirection: 'row', gap: 12, marginBottom: 8},
  followButton: {backgroundColor: '#C9956C', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 25, minWidth: 120, alignItems: 'center'},
  followingButton: {backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#C9956C'},
  followButtonText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 15},

  messageButton: {backgroundColor: '#1C1C1C', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, borderWidth: 1, borderColor: '#C9956C', alignItems: 'center', minWidth: 120},
  messageButtonText: {color: '#C9956C', fontWeight: 'bold', fontSize: 15},
  pendingButton: {borderColor: '#4B4B4B', opacity: 0.7},
  connectButton: {backgroundColor: 'rgba(201,149,108,0.12)'},

  connectHint: {color: '#A09080', fontSize: 12, textAlign: 'center', marginBottom: 12, marginTop: 4},

  editProfileBtn:  {backgroundColor: '#1C1C1C', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 25, borderWidth: 1, borderColor: '#C9956C', marginBottom: 16},
  editProfileText: {color: '#C9956C', fontWeight: 'bold', fontSize: 14},

  collabBadge: {backgroundColor: '#064E3B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#4ADE80', marginTop: 8},
  collabText:  {color: '#4ADE80', fontWeight: '600', fontSize: 13},

  // ── Admin ───────────────────────────────────────────────────
  adminSection: {marginTop: 20, width: '100%'},
  adminLabel:   {color: '#C9956C', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center'},
  adminRow:     {flexDirection: 'row', gap: 10},
  banBtn:       {flex: 1, backgroundColor: '#450A0A', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#DC2626'},
  unbanBtn:     {backgroundColor: '#064E3B', borderColor: '#4ADE80'},
  banBtnText:   {color: '#FCA5A5', fontSize: 13, fontWeight: 'bold'},
  removeBtn:    {flex: 1, backgroundColor: '#2A2A2A', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333333'},
  removeBtnText:{color: '#A09080', fontSize: 13, fontWeight: 'bold'},

  // ── Sections ────────────────────────────────────────────────
  section:      {paddingHorizontal: 20, marginBottom: 28},
  sectionTitle: {color: '#C9956C', fontSize: 16, fontWeight: 'bold', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5},
  emptyText:    {color: '#A09080', fontSize: 14, fontStyle: 'italic'},
  photoScroll:  {flexDirection: 'row'},
  portfolioPhoto: {width: 110, height: 110, borderRadius: 12, marginRight: 10},

  linkCard:        {backgroundColor: '#1C1C1C', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A'},
  linkCardIcon:    {fontSize: 24, marginRight: 12},
  linkCardContent: {flex: 1},
  linkCardTitle:   {color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 2},
  linkCardUrl:     {color: '#A09080', fontSize: 12},
  linkCardArrow:   {color: '#C9956C', fontSize: 18, fontWeight: 'bold', marginLeft: 8},

  infoRow:  {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1C1C1C', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A2A'},
  infoIcon: {fontSize: 20},
  infoText: {color: '#FFFFFF', fontSize: 15},
});