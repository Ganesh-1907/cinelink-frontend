import React, {useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, Linking, Alert, Animated, Share, Dimensions,
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {LiquidPress} from '../components/LiquidPress';
import {RippleIcon} from '../components/RippleIcon';
import PremiumBadge from '../src/components/Premium/PremiumBadge';

const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com';
const ADMIN_UID   = 'moVQIEK5RqhXUOf4wk1L7913kZZ2';

const SCREEN_W  = Dimensions.get('window').width;
const GRID_GAP  = 2;
const CELL_SIZE = Math.floor((SCREEN_W - GRID_GAP * 2) / 3);

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'Creator';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const PublicProfileScreen = ({route, navigation}: any) => {
  const {userId} = route.params;
  const currentUser = auth().currentUser;
  const isAdmin     = currentUser?.email === ADMIN_EMAIL || currentUser?.uid === ADMIN_UID;

  const [userData, setUserData]             = useState<any>(null);
  const [loading, setLoading]               = useState(true);
  const [isFollowing, setIsFollowing]       = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading]   = useState(false);
  const [isBanned, setIsBanned]             = useState(false);

  // ── Connection state ──────────────────────────────────────
  const [isConnected, setIsConnected]               = useState(false);
  const [connectRequestSent, setConnectRequestSent] = useState(false);
  const [connectLoading, setConnectLoading]         = useState(false);

  // ── Image viewer state ────────────────────────────────────
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex]     = useState(0);
  const [viewerImages, setViewerImages]   = useState<{uri: string}[]>([]);

  // ── Toast state ───────────────────────────────────────────
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useState(new Animated.Value(0))[0];
  const skeletonOpacity = useState(new Animated.Value(0.3))[0];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {toValue: 0.7, duration: 800, useNativeDriver: true}),
        Animated.timing(skeletonOpacity, {toValue: 0.3, duration: 800, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const showToast = () => {
    setToastVisible(true);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, {toValue: 1, duration: 200, useNativeDriver: true}),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {toValue: 0, duration: 600, useNativeDriver: true}),
    ]).start(() => setToastVisible(false));
  };

  const isOwnProfile = currentUser?.uid === userId;

  useEffect(() => {
    setLoading(true);
    setUserData(null);
    setIsFollowing(false);
    setIsConnected(false);
    setConnectRequestSent(false);
    loadUser();
    checkFollowing();
    if (!isOwnProfile) checkConnectionStatus();
  }, [userId]);

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
    const unsubF  = firestore()
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
      const connected = await firestore()
        .collection('connections')
        .where('users', 'array-contains', currentUser.uid)
        .get();
      const found = connected.docs.some(doc => doc.data().users?.includes(userId));
      setIsConnected(found);

      if (!found) {
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
    setConnectRequestSent(true);
    try {
      const currentUserName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      const otherUserName   = cleanName(userData?.displayName || userData?.fullName || userData?.name || userData?.email);

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

      showToast();
    } catch (e: any) {
      setConnectRequestSent(false);
      Alert.alert('Error', e?.message || 'Could not send request.');
    } finally {
      setConnectLoading(false);
    }
  };

  // ── Start Chat ────────────────────────────────────────────
  // Admin (by UID) can message anyone without needing a connection
  const startChat = async () => {
    if (!currentUser || isOwnProfile) return;
    if (!isConnected && !isAdmin) {
      Alert.alert('Not Connected', 'Send a connect request first. Once they accept, you can message them.');
      return;
    }
    try {
      const chatId          = [currentUser.uid, userId].sort().join('_');
      const chatRef         = firestore().collection('chats').doc(chatId);
      const currentUserName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      const otherUserName   = cleanName(userData?.displayName || userData?.fullName || userData?.name || userData?.email);

      await chatRef.set({
        id: chatId,
        participants:      [currentUser.uid, userId],
        participantNames:  [currentUserName, otherUserName],
        participantEmails: [currentUser.email || '', userData?.email || ''],
        lastMessage: '',
        lastMessageTime: null,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }, {merge: true});

      const chatDoc = await chatRef.get();
      if (!chatDoc.data()?.createdAt) {
        await chatRef.update({createdAt: firestore.FieldValue.serverTimestamp()});
      }

      navigation.navigate('ChatScreen', {
        chat: {
          id: chatId,
          participants:     [currentUser.uid, userId],
          participantNames: [currentUserName, otherUserName],
          participantEmails:[currentUser.email || '', userData?.email || ''],
          lastMessage: '',
        },
      });
    } catch (e: any) {
      console.log('CHAT ERROR:', JSON.stringify(e));
      Alert.alert('Error', e?.message || 'Could not start chat. Try again.');
    }
  };

  // ── Image viewer helpers ──────────────────────────────────
  const openViewer = (startIndex: number, images: {uri: string}[]) => {
    setViewerImages(images);
    setViewerIndex(startIndex);
    setViewerVisible(true);
  };

  const buildViewerImages = (data: any): {uri: string}[] => {
    const imgs: {uri: string}[] = [];
    const avatar = data?.photoUrl || data?.photoURL;
    if (avatar) imgs.push({uri: avatar});
    if (Array.isArray(data?.portfolioPhotos)) {
      data.portfolioPhotos.forEach((url: string) => { if (url) imgs.push({uri: url}); });
    }
    return imgs;
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
              const auditions    = await firestore().collection('auditions').where('directorId', '==', userId).get();
              const applications = await firestore().collection('applications').where('applicantId', '==', userId).get();
              const films        = await firestore().collection('films').where('directorId', '==', userId).get();
              auditions.docs.forEach(doc => batch.delete(doc.ref));
              applications.docs.forEach(doc => batch.delete(doc.ref));
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

  const handleShare = async () => {
    const shareName = cleanName(userData?.displayName || userData?.fullName || userData?.name || userData?.email);
    const shareRole = userData?.role || 'Creator';
    try {
      await Share.share({
        message:
          `Check out ${shareName}'s profile on CineLink!\n\n` +
          `They're a ${shareRole} on CineLink — India's casting & film collaboration platform.\n\n` +
          `Download CineLink to view their full profile and connect! 🎬`,
      });
    } catch (_) {}
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.skeletonAvatar, {opacity: skeletonOpacity}]} />
        <View style={{marginTop: 20, width: '70%', gap: 12}}>
          <Animated.View style={[styles.skeletonLine, {width: '60%', height: 20}, {opacity: skeletonOpacity}]} />
          <Animated.View style={[styles.skeletonLine, {width: '40%', height: 14}, {opacity: skeletonOpacity}]} />
          <Animated.View style={[styles.skeletonLine, {width: '80%', height: 14}, {opacity: skeletonOpacity}]} />
        </View>
        <View style={{flexDirection: 'row', gap: 16, marginTop: 24}}>
          <Animated.View style={[styles.skeletonStatBox, {opacity: skeletonOpacity}]} />
          <Animated.View style={[styles.skeletonStatBox, {opacity: skeletonOpacity}]} />
        </View>
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
  const allImages   = buildViewerImages(userData);
  // Portfolio images start at index 1 if there's an avatar, else 0
  const portfolioOffset = avatarUrl ? 1 : 0;

  // Admin can always message; others need connection
  const canMessage = isConnected || isAdmin;

  return (
    <>
      {toastVisible && (
        <Animated.View style={[styles.toastBanner, {opacity: toastOpacity}]}>
          <Text style={styles.toastText}>Request sent! ✅ You'll be notified when they accept</Text>
        </Animated.View>
      )}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.profileSection}>

          {/* BANNED BANNER */}
          {isBanned && (
            <View style={styles.bannedBanner}>
              <Text style={styles.bannedText}>🚫 This user is banned</Text>
            </View>
          )}

          {/* AVATAR — tappable to open fullscreen */}
          {avatarUrl ? (
            <RippleIcon size={110} color="#C9956C" onPress={() => openViewer(0, allImages)}>
              <Image source={{uri: avatarUrl}} style={styles.avatarImage} />
            </RippleIcon>
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

          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            <PremiumBadge
              tier={userData?.premiumTier || 'none'}
              verifiedReal={userData?.verifiedReal === true}
              size="large"
            />
          </View>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>🎭 {userData?.role || 'Creator'}</Text>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>↗ Share Profile</Text>
          </TouchableOpacity>

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
              <LiquidPress
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
                disabled={followLoading}>
                {followLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.followButtonText}>
                      {isFollowing ? '✓ Following' : '+ Follow'}
                    </Text>}
              </LiquidPress>

              {/* MESSAGE / CONNECT / PENDING */}
              {canMessage ? (
                <LiquidPress style={styles.messageButton} onPress={startChat}>
                  <Text style={styles.messageButtonText}>💬 Message</Text>
                </LiquidPress>
              ) : connectRequestSent ? (
                <View style={[styles.messageButton, styles.pendingButton]}>
                  <Text style={[styles.messageButtonText, {color: '#A09080'}]}>⏳ Pending</Text>
                </View>
              ) : (
                <LiquidPress
                  style={[styles.messageButton, styles.connectButton]}
                  onPress={sendConnectRequest}
                  disabled={connectLoading}>
                  {connectLoading
                    ? <ActivityIndicator color="#C9956C" size="small" />
                    : <Text style={styles.messageButtonText}>🤝 Connect</Text>}
                </LiquidPress>
              )}
            </View>
          )}

          {/* Connection status hint */}
          {!isOwnProfile && !canMessage && !connectRequestSent && (
            <Text style={styles.connectHint}>
              Send a connect request to message this creator
            </Text>
          )}
          {!isOwnProfile && !isConnected && connectRequestSent && !isAdmin && (
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
              {(userData.portfolioPhotos as string[]).map((url: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.85}
                  onPress={() => openViewer(portfolioOffset + index, allImages)}>
                  <Image source={{uri: url}} style={styles.portfolioPhoto} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No portfolio photos added yet</Text>
          )}
        </View>

        {/* PORTFOLIO GALLERY */}
        {userData?.portfolioMedia?.length > 0 && (
          <View style={styles.gallerySection}>
            <Text style={styles.gallerySectionTitle}>Portfolio Gallery</Text>
            <View style={styles.mediaGrid}>
              {(userData.portfolioMedia as string[]).map((url: string, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={styles.mediaCell}
                  activeOpacity={0.85}
                  onPress={() => openViewer(i, (userData.portfolioMedia as string[]).map((u: string) => ({uri: u})))}>
                  <Image source={{uri: url}} style={styles.mediaCellImg} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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

        {/* ── CASTING PROFILE ── */}
        {(userData?.availabilityStatus || userData?.lookingFor ||
          userData?.profileTags?.length > 0 ||
          userData?.ageRange || userData?.height || userData?.bodyType) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Casting Profile</Text>

            {/* Availability badge */}
            {userData?.availabilityStatus ? (() => {
              const s = userData.availabilityStatus;
              const color = s === 'Available Now' ? '#4ADE80' : s === 'Booked' ? '#FBBF24' : '#A09080';
              const bg    = s === 'Available Now' ? 'rgba(74,222,128,0.12)' : s === 'Booked' ? 'rgba(251,191,36,0.12)' : 'rgba(160,144,128,0.12)';
              const dot   = s === 'Available Now' ? '🟢' : s === 'Booked' ? '🟡' : '🔴';
              return (
                <View style={[styles.availBadge, {backgroundColor: bg, borderColor: color}]}>
                  <Text style={[styles.availBadgeText, {color}]}>{dot} {s}</Text>
                </View>
              );
            })() : null}

            {/* Looking For */}
            {userData?.lookingFor ? (
              <View style={styles.castingBlock}>
                <Text style={styles.castingLabel}>Looking For</Text>
                <Text style={styles.castingValue}>{userData.lookingFor}</Text>
              </View>
            ) : null}

            {/* Profile type tags */}
            {userData?.profileTags?.length > 0 && (
              <View style={styles.castingTagRow}>
                {(userData.profileTags as string[]).map((tag: string) => (
                  <View key={tag} style={styles.castingTag}>
                    <Text style={styles.castingTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Physical info chips */}
            {(userData?.ageRange || userData?.height || userData?.bodyType) && (
              <View style={styles.physicalRow}>
                {userData?.ageRange ? (
                  <View style={styles.physicalChip}>
                    <Text style={styles.physicalChipIcon}>🎂</Text>
                    <Text style={styles.physicalChipText}>{userData.ageRange} yrs</Text>
                  </View>
                ) : null}
                {userData?.height ? (
                  <View style={styles.physicalChip}>
                    <Text style={styles.physicalChipIcon}>📏</Text>
                    <Text style={styles.physicalChipText}>{userData.height}</Text>
                  </View>
                ) : null}
                {userData?.bodyType ? (
                  <View style={styles.physicalChip}>
                    <Text style={styles.physicalChipIcon}>💪</Text>
                    <Text style={styles.physicalChipText}>{userData.bodyType}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* ── SOCIAL LINKS ── */}
        {(userData?.instagramLink || userData?.youtubeLink) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social</Text>
            {userData?.instagramLink ? (
              <TouchableOpacity
                style={[styles.socialCard, styles.socialCardIG]}
                onPress={() => Linking.openURL(userData.instagramLink)}>
                <Text style={styles.socialCardIcon}>📸</Text>
                <View style={styles.socialCardContent}>
                  <Text style={styles.socialCardPlatform}>Instagram</Text>
                  <Text style={styles.socialCardUrl} numberOfLines={1}>
                    {userData.instagramLink.replace(/^https?:\/\/(www\.)?/, '')}
                  </Text>
                </View>
                <Text style={styles.socialCardArrow}>→</Text>
              </TouchableOpacity>
            ) : null}
            {userData?.youtubeLink ? (
              <TouchableOpacity
                style={[styles.socialCard, styles.socialCardYT]}
                onPress={() => Linking.openURL(userData.youtubeLink)}>
                <Text style={styles.socialCardIcon}>▶️</Text>
                <View style={styles.socialCardContent}>
                  <Text style={styles.socialCardPlatform}>YouTube</Text>
                  <Text style={styles.socialCardUrl} numberOfLines={1}>
                    {userData.youtubeLink.replace(/^https?:\/\/(www\.)?/, '')}
                  </Text>
                </View>
                <Text style={styles.socialCardArrow}>→</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

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

      {/* FULLSCREEN IMAGE VIEWER */}
      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        backgroundColor="black"
      />
    </>
  );
};

export default PublicProfileScreen;

const styles = StyleSheet.create({
  container:        {flex: 1, backgroundColor: '#0A0A0A'},
  loadingContainer: {flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center'},
  errorText:        {color: '#A09080', fontSize: 16},

  profileSection: {alignItems: 'center', paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20},

  bannedBanner: {
    backgroundColor: '#450A0A', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    marginBottom: 16, borderWidth: 1, borderColor: '#DC2626',
    width: '100%', alignItems: 'center',
  },
  bannedText: {color: '#FCA5A5', fontSize: 13, fontWeight: 'bold'},

  avatar: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 2.5, borderColor: '#C9956C',
    shadowColor: '#C9956C', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  avatarImage: {width: 110, height: 110, borderRadius: 55, marginBottom: 16, borderWidth: 2.5, borderColor: '#C9956C', shadowColor: '#C9956C', shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6},
  avatarText:  {color: '#FFFFFF', fontSize: 44, fontWeight: 'bold'},

  verifiedBadge: {backgroundColor: '#064E3B', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 10, borderWidth: 1, borderColor: '#6EE7B7'},
  verifiedText:  {color: '#6EE7B7', fontSize: 12, fontWeight: 'bold'},

  nameRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10},
  name: {color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', textAlign: 'center'},

  roleBadge: {backgroundColor: '#1C1C1C', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#C9956C'},
  roleText:  {color: '#C9956C', fontWeight: '600', fontSize: 13},

  bio:      {color: '#A09080', fontSize: 15, textAlign: 'center', paddingHorizontal: 20, marginBottom: 24, lineHeight: 22},
  bioEmpty: {color: '#A09080', fontSize: 14, textAlign: 'center', marginBottom: 24, fontStyle: 'italic'},

  statsContainer: {flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: '#141414', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, borderTopWidth: 2, borderTopColor: '#C9956C44', borderWidth: 1, borderColor: '#2A2A2A', borderBottomWidth: 3, borderBottomColor: '#C9956C22', borderRightWidth: 2, borderRightColor: '#1A1A1A', shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.6, shadowRadius: 24, elevation: 8},
  statBox:        {alignItems: 'center', paddingHorizontal: 20},
  statDivider:    {width: 1, height: 40, backgroundColor: '#2A2A2A'},
  statNumber:     {color: '#FFFFFF', fontSize: 28, fontWeight: 'bold'},
  statLabel:      {color: '#A09080', fontSize: 13, marginTop: 4},

  actionRow:        {flexDirection: 'row', gap: 12, marginBottom: 8},
  followButton:     {backgroundColor: '#C9956C', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 25, minWidth: 120, alignItems: 'center', borderWidth: 1, borderTopColor: '#E8C4A0', borderBottomColor: '#7A5535', borderLeftColor: 'rgba(232,196,160,0.45)', borderRightColor: 'rgba(122,85,53,0.45)', shadowColor: '#C9956C', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8},
  followingButton:  {backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#C9956C'},
  followButtonText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 15},

  messageButton:     {backgroundColor: 'rgba(201,149,108,0.08)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, borderWidth: 0.5, borderColor: 'rgba(201,149,108,0.3)', alignItems: 'center', minWidth: 120, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4},
  messageButtonText: {color: '#C9956C', fontWeight: 'bold', fontSize: 15},
  pendingButton:     {borderColor: '#4B4B4B', opacity: 0.7},
  connectButton:     {backgroundColor: 'rgba(201,149,108,0.08)', borderWidth: 0.5, borderColor: 'rgba(201,149,108,0.3)', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4},

  connectHint: {color: '#A09080', fontSize: 12, textAlign: 'center', marginBottom: 12, marginTop: 4},

  editProfileBtn:  {backgroundColor: '#1C1C1C', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 25, borderWidth: 1, borderColor: '#C9956C', marginBottom: 16},
  editProfileText: {color: '#C9956C', fontWeight: 'bold', fontSize: 14},

  collabBadge: {backgroundColor: '#064E3B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#4ADE80', marginTop: 8},
  collabText:  {color: '#4ADE80', fontWeight: '600', fontSize: 13},

  adminSection: {marginTop: 20, width: '100%'},
  adminLabel:   {color: '#C9956C', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center'},
  adminRow:     {flexDirection: 'row', gap: 10},
  banBtn:       {flex: 1, backgroundColor: '#450A0A', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#DC2626'},
  unbanBtn:     {backgroundColor: '#064E3B', borderColor: '#4ADE80'},
  banBtnText:   {color: '#FCA5A5', fontSize: 13, fontWeight: 'bold'},
  removeBtn:    {flex: 1, backgroundColor: '#2A2A2A', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333333'},
  removeBtnText:{color: '#A09080', fontSize: 13, fontWeight: 'bold'},

  section:        {paddingHorizontal: 20, marginBottom: 28},
  sectionTitle:   {color: '#C9956C', fontSize: 16, fontWeight: 'bold', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5},
  emptyText:      {color: '#A09080', fontSize: 14, fontStyle: 'italic'},
  photoScroll:    {flexDirection: 'row'},
  portfolioPhoto: {width: 110, height: 110, borderRadius: 12, marginRight: 10},

  linkCard:        {backgroundColor: '#141414', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderTopWidth: 2, borderTopColor: '#C9956C44', borderWidth: 1, borderColor: '#2A2A2A', borderBottomWidth: 3, borderBottomColor: '#C9956C22', borderRightWidth: 2, borderRightColor: '#1A1A1A', shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.6, shadowRadius: 24, elevation: 8},
  linkCardIcon:    {fontSize: 24, marginRight: 12},
  linkCardContent: {flex: 1},
  linkCardTitle:   {color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 2},
  linkCardUrl:     {color: '#A09080', fontSize: 12},
  linkCardArrow:   {color: '#C9956C', fontSize: 18, fontWeight: 'bold', marginLeft: 8},

  infoRow:  {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#141414', borderRadius: 12, padding: 14, borderTopWidth: 2, borderTopColor: '#C9956C44', borderWidth: 1, borderColor: '#2A2A2A', borderBottomWidth: 3, borderBottomColor: '#C9956C22', borderRightWidth: 2, borderRightColor: '#1A1A1A', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8},
  infoIcon: {fontSize: 20},
  infoText: {color: '#FFFFFF', fontSize: 15},

  skeletonAvatar:  {width: 110, height: 110, borderRadius: 55, backgroundColor: '#1C1C1C'},
  skeletonLine:    {backgroundColor: '#1C1C1C', borderRadius: 8},
  skeletonStatBox: {width: 80, height: 60, backgroundColor: '#1C1C1C', borderRadius: 12},

  shareBtn: {
    marginTop: 10, marginBottom: 4, paddingVertical: 8, paddingHorizontal: 22,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(201,149,108,0.4)',
  },
  shareBtnText: {color: '#C9956C', fontSize: 13, fontWeight: '600'},

  toastBanner: {
    position: 'absolute', top: 60, left: 20, right: 20,
    backgroundColor: '#064E3B', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#4ADE80', zIndex: 100,
  },
  toastText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center'},

  // ── Portfolio Gallery ─────────────────────────────────────
  gallerySection:      {marginBottom: 28},
  gallerySectionTitle: {color: '#C9956C', fontSize: 16, fontWeight: 'bold', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 20},
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  mediaCell:    {width: CELL_SIZE, height: CELL_SIZE},
  mediaCellImg: {width: '100%', height: '100%'},

  // ── Casting Profile ──────────────────────────────────────
  availBadge: {
    alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 7, marginBottom: 14,
  },
  availBadgeText: {fontSize: 13, fontWeight: '700'},

  castingBlock:  {marginBottom: 14},
  castingLabel:  {color: '#A09080', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4},
  castingValue:  {color: '#FFFFFF', fontSize: 14, lineHeight: 20},

  castingTagRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14},
  castingTag:    {backgroundColor: 'rgba(201,149,108,0.12)', borderRadius: 14, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(201,149,108,0.3)'},
  castingTagText:{color: '#C9956C', fontSize: 12, fontWeight: '600'},

  physicalRow:      {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  physicalChip:     {flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#141414', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#2A2A2A'},
  physicalChipIcon: {fontSize: 14},
  physicalChipText: {color: '#A09080', fontSize: 13},

  // ── Social cards ─────────────────────────────────────────
  socialCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 1,
  },
  socialCardIG:      {backgroundColor: 'rgba(193,53,132,0.08)', borderColor: 'rgba(193,53,132,0.3)'},
  socialCardYT:      {backgroundColor: 'rgba(255,0,0,0.06)',    borderColor: 'rgba(255,0,0,0.25)'},
  socialCardIcon:    {fontSize: 22, marginRight: 12},
  socialCardContent: {flex: 1},
  socialCardPlatform:{color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 2},
  socialCardUrl:     {color: '#A09080', fontSize: 12},
  socialCardArrow:   {color: '#A09080', fontSize: 16, marginLeft: 8},
});
