import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Share,
  FlatList, SafeAreaView, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import PremiumBadge from '../src/components/Premium/PremiumBadge';

const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'Creator';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

// ── DiscoverCommentSheet ─────────────────────────────────────────
// Bottom-sheet modal — users/{userId}/comments subcollection, live via onSnapshot.
function DiscoverCommentSheet({userId, visible, onClose, userName}: any) {
  const currentUser = auth().currentUser;
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText]         = useState('');
  const [posting, setPosting]   = useState(false);
  const scrollRef               = useRef<any>(null);

  useEffect(() => {
    if (!visible) return;
    const unsub = firestore()
      .collection('users').doc(userId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        snap => {
          setComments(snap.docs.map(d => ({id: d.id, ...d.data()})));
          setTimeout(() => scrollRef.current?.scrollToEnd({animated: true}), 100);
        },
        () => {},
      );
    return () => unsub();
  }, [userId, visible]);

  const postComment = async () => {
    if (!text.trim() || !currentUser) return;
    setPosting(true);
    try {
      await firestore()
        .collection('users').doc(userId)
        .collection('comments')
        .add({
          text:        text.trim(),
          authorId:    currentUser.uid,
          authorName:  currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          authorPhoto: currentUser.photoURL || null,
          createdAt:   firestore.FieldValue.serverTimestamp(),
        });
      setText('');
    } catch (e) { console.log(e); }
    setPosting(false);
  };

  const deleteComment = async (commentId: string, authorId: string) => {
    if (authorId !== currentUser?.uid && currentUser?.email !== ADMIN_EMAIL) return;
    Alert.alert('Delete Comment', 'Delete this comment?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await firestore()
            .collection('users').doc(userId)
            .collection('comments').doc(commentId).delete();
        } catch (e) { console.log(e); }
      }},
    ]);
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'yesterday';
    return d.toLocaleDateString([], {day: 'numeric', month: 'short'});
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>💬 {userName}'s comments</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
              <Text style={styles.sheetCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.sheetScroll}
            contentContainerStyle={{paddingBottom: 8}}>
            {comments.length === 0 ? (
              <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
            ) : (
              comments.map(c => {
                const canDelete =
                  c.authorId === currentUser?.uid || currentUser?.email === ADMIN_EMAIL;
                return (
                  <View key={c.id} style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {c.authorName?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.commentContent}>
                      <View style={styles.commentNameRow}>
                        <Text style={styles.commentName}>{c.authorName || 'User'}</Text>
                        <Text style={styles.commentTime}>{formatTime(c.createdAt)}</Text>
                      </View>
                      <Text style={styles.commentText}>{c.text}</Text>
                    </View>
                    {canDelete && (
                      <TouchableOpacity
                        onPress={() => deleteComment(c.id, c.authorId)}
                        style={styles.deleteCommentBtn}>
                        <Text style={styles.deleteCommentText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
          <View style={styles.sheetInputRow}>
            <TextInput
              style={styles.sheetInput}
              placeholder="Write a comment..."
              placeholderTextColor="#5C5048"
              value={text}
              onChangeText={setText}
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.sheetSendBtn, (!text.trim() || posting) && {opacity: 0.4}]}
              onPress={postComment}
              disabled={!text.trim() || posting}>
              {posting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.sheetSendText}>Post</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── DiscoverEngagementBar ────────────────────────────────────────
// Targets users/{userId} with profileLikes / profileLikedBy / profileViews.
function DiscoverEngagementBar({
  userId, profileLikes = 0, profileLikedBy = [], profileViews = 0, userName,
}: any) {
  const currentUser = auth().currentUser;
  const [likes, setLikes]               = useState<number>(profileLikes);
  const [likedBy, setLikedBy]           = useState<string[]>(profileLikedBy || []);
  const [commentCount, setCommentCount] = useState(0);
  const [showSheet, setShowSheet]       = useState(false);
  const isLiked = currentUser ? likedBy.includes(currentUser.uid) : false;

  useEffect(() => {
    const unsub = firestore()
      .collection('users').doc(userId)
      .collection('comments')
      .onSnapshot(
        snap => setCommentCount(snap.size),
        err  => console.log('comment count error:', err.code),
      );
    return () => unsub();
  }, [userId, showSheet]);

  const handleLike = async () => {
    if (!currentUser) return;
    const toggled = !isLiked;
    setLikes(prev => prev + (toggled ? 1 : -1));
    setLikedBy(prev =>
      toggled ? [...prev, currentUser.uid] : prev.filter(id => id !== currentUser.uid),
    );
    try {
      await firestore().collection('users').doc(userId).update({
        profileLikes:   firestore.FieldValue.increment(toggled ? 1 : -1),
        profileLikedBy: toggled
          ? firestore.FieldValue.arrayUnion(currentUser.uid)
          : firestore.FieldValue.arrayRemove(currentUser.uid),
      });
    } catch {
      setLikes(prev => prev + (toggled ? -1 : 1));
      setLikedBy(prev =>
        toggled ? prev.filter(id => id !== currentUser.uid) : [...prev, currentUser.uid],
      );
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎭 Check out ${userName || 'this creator'} on CineLink!`,
        title: userName,
      });
    } catch {}
  };

  return (
    <>
      <View style={styles.engRow}>
        <TouchableOpacity style={styles.engBtn} onPress={handleLike} activeOpacity={0.7}>
          <Text style={[styles.engText, isLiked && styles.engLiked]}>
            {isLiked ? '❤️' : '🤍'} {likes}
          </Text>
        </TouchableOpacity>
        <View style={styles.engDivider} />
        <View style={styles.engBtn}>
          <Text style={styles.engText}>👁 {profileViews || 0}</Text>
        </View>
        <View style={styles.engDivider} />
        <TouchableOpacity style={styles.engBtn} onPress={() => setShowSheet(true)} activeOpacity={0.7}>
          <Text style={styles.engText}>💬 {commentCount}</Text>
        </TouchableOpacity>
        <View style={styles.engDivider} />
        <TouchableOpacity style={styles.engBtn} onPress={handleShare} activeOpacity={0.7}>
          <Text style={styles.engText}>↗ Share</Text>
        </TouchableOpacity>
      </View>
      <DiscoverCommentSheet
        userId={userId}
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        userName={userName}
      />
    </>
  );
}

// ── DiscoverScreen ───────────────────────────────────────────────
export default function DiscoverScreen({navigation}: any) {
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const [users, setUsers]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cardHeight, setCardHeight]   = useState(0);
  const [cursor, setCursor]           = useState<any>(null);
  const [hasMore, setHasMore]         = useState(true);

  const currentUser       = auth().currentUser;
  const viewedIds         = useRef<Set<string>>(new Set());
  const viewabilityConfig = useRef({viewAreaCoveragePercentThreshold: 75});

  useEffect(() => {
    if (!currentUser) return;
    firestore()
      .collection('users').doc(currentUser.uid)
      .collection('following')
      .get()
      .then(snap => setFollowingIds(new Set(snap.docs.map(d => d.id))))
      .catch(e => console.log(e));
  }, []);

  useEffect(() => { loadUsers(); }, []);

  // ── Follow / Unfollow ────────────────────────────────────────────
  const toggleFollow = async (targetId: string) => {
    if (!currentUser) return;
    const isF = followingIds.has(targetId);
    const currentUserName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    try {
      const followerRef = firestore()
        .collection('users').doc(targetId)
        .collection('followers').doc(currentUser.uid);
      const followingRef = firestore()
        .collection('users').doc(currentUser.uid)
        .collection('following').doc(targetId);
      if (isF) {
        await followerRef.delete();
        await followingRef.delete();
        setFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
      } else {
        await followerRef.set({
          userId: currentUser.uid, userName: currentUserName,
          email: currentUser.email, followedAt: firestore.FieldValue.serverTimestamp(),
        });
        await followingRef.set({
          userId: targetId, followedAt: firestore.FieldValue.serverTimestamp(),
        });
        setFollowingIds(prev => new Set([...prev, targetId]));
      }
    } catch (e) { console.log(e); }
  };

  // ── Pagination ───────────────────────────────────────────────────
  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await firestore().collection('users').limit(10).get();
      const data = snap.docs
        .filter(d => d.id !== currentUser?.uid && d.data().email !== ADMIN_EMAIL)
        .map(d => ({id: d.id, ...d.data()}));
      setUsers(data);
      setCursor(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === 10);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const snap = await firestore().collection('users').limit(10).startAfter(cursor).get();
      const data = snap.docs
        .filter(d => d.id !== currentUser?.uid && d.data().email !== ADMIN_EMAIL)
        .map(d => ({id: d.id, ...d.data()}));
      setUsers(prev => [...prev, ...data]);
      setCursor(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === 10);
    } catch (e) { console.log(e); }
    finally { setLoadingMore(false); }
  };

  const onViewableItemsChanged = useCallback(({viewableItems}: any) => {
    viewableItems.forEach((vi: any) => {
      if (vi.isViewable && !viewedIds.current.has(vi.item.id)) {
        viewedIds.current.add(vi.item.id);
        firestore().collection('users').doc(vi.item.id).update({
          profileViews: firestore.FieldValue.increment(1),
        }).catch(() => {});
      }
    });
  }, []);

  // ── Instagram-style card: header row → photo → info panel ─────────
  const renderCard = ({item}: any) => {
    const displayName = cleanName(item.displayName || item.fullName || item.name || item.email);
    const photoUri    = item.photoUrl || item.photoURL || item.portfolioPhotos?.[0] || null;
    const goToProfile = () => navigation.navigate('PublicProfile', {userId: item.id});

    return (
      <View style={[styles.card, {height: cardHeight}]}>

        {/* ── Header: avatar · name · role (tappable) + Follow btn ── */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.topRowLeft} onPress={goToProfile} activeOpacity={0.7}>
            {photoUri ? (
              <Image source={{uri: photoUri}} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.topMeta}>
              <View style={styles.topNameRow}>
                <Text style={styles.topName} numberOfLines={1}>{displayName}</Text>
                {item.verificationStatus === 'verified' && (
                  <Text style={{fontSize: 12, marginLeft: 4}}>✅</Text>
                )}
                <PremiumBadge
                  tier={item.premiumTier || 'none'}
                  verifiedReal={item.verifiedReal === true}
                  size="small"
                />
              </View>
              <View style={styles.topRolePill}>
                <Text style={styles.topRoleText}>🎭 {item.role || 'Creator'}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.followBtn, followingIds.has(item.id) && styles.followingBtn]}
            onPress={() => toggleFollow(item.id)}
            activeOpacity={0.7}>
            <Text style={styles.followBtnText}>
              {followingIds.has(item.id) ? '✓ Following' : '+ Follow'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Photo block ── */}
        <View style={styles.photoBlock}>
          {photoUri ? (
            <Image source={{uri: photoUri}} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.initials}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* ── Info panel: location · bio · engagement bar ── */}
        <View style={styles.contentPanel}>
          {item.location ? (
            <Text style={styles.location}>📍 {item.location}</Text>
          ) : null}
          {item.bio ? (
            <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
          ) : null}
          <DiscoverEngagementBar
            userId={item.id}
            profileLikes={item.profileLikes}
            profileLikedBy={item.profileLikedBy}
            profileViews={item.profileViews}
            userName={displayName}
          />
        </View>
      </View>
    );
  };

  // ── JSX ──────────────────────────────────────────────────────────
  if (loading || cardHeight === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={styles.loaderBox}
          onLayout={e => setCardHeight(e.nativeEvent.layout.height)}>
          <ActivityIndicator size="large" color="#C9956C" />
          <Text style={styles.loaderText}>Finding creators…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        getItemLayout={(_, index) => ({length: cardHeight, offset: cardHeight * index, index})}
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator size="small" color="#C9956C" style={{padding: 20}} />
            : !hasMore && users.length > 0
              ? (
                <View style={[styles.loaderBox, {height: cardHeight}]}>
                  <Text style={{fontSize: 48, marginBottom: 12}}>🎭</Text>
                  <Text style={styles.loaderText}>You've seen everyone!</Text>
                  <TouchableOpacity style={styles.refreshBtn} onPress={loadUsers}>
                    <Text style={styles.refreshBtnText}>Start over ↺</Text>
                  </TouchableOpacity>
                </View>
              )
              : null
        }
        ListEmptyComponent={
          <View style={[styles.loaderBox, {height: cardHeight}]}>
            <Text style={{fontSize: 48, marginBottom: 12}}>🎭</Text>
            <Text style={styles.loaderText}>No creators found yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},

  // ── loading / empty ───────────────────────────────────────────────
  loaderBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80,
  },
  loaderText:    {color: '#A09080', fontSize: 15, marginTop: 12},
  refreshBtn: {
    marginTop: 20, backgroundColor: '#C9956C', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  refreshBtnText: {color: '#FFFFFF', fontWeight: '700', fontSize: 14},

  // ── card shell ────────────────────────────────────────────────────
  card: {
    width: '100%', flexDirection: 'column', backgroundColor: '#0A0A0A',
  },

  // ── top row (avatar + name/role tappable area + follow button) ────
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#1C1C1C',
  },
  topRowLeft: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#C9956C', marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2A2A2A', borderWidth: 1.5, borderColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  avatarInitial: {color: '#C9956C', fontSize: 16, fontWeight: 'bold'},
  topMeta:    {flex: 1},
  topNameRow: {flexDirection: 'row', alignItems: 'center'},
  topName:    {color: '#FFFFFF', fontSize: 14, fontWeight: '700', flexShrink: 1},
  topRolePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,149,108,0.12)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(201,149,108,0.35)', marginTop: 3,
  },
  topRoleText: {color: '#C9956C', fontSize: 10, fontWeight: '700'},

  // ── photo block ───────────────────────────────────────────────────
  photoBlock: {
    width: '100%', flex: 1, overflow: 'hidden', backgroundColor: '#141414',
  },
  photo: {width: '100%', height: '100%'},
  photoPlaceholder: {
    flex: 1, backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center',
  },
  initials: {color: '#C9956C', fontSize: 72, fontWeight: 'bold'},

  // ── info panel (below photo) ──────────────────────────────────────
  contentPanel: {
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: '#2A2A2A',
  },
  location: {color: '#A09080', fontSize: 12, marginBottom: 4},
  bio:      {color: '#A09080', fontSize: 13, lineHeight: 18, marginBottom: 10},

  // ── follow button (compact, in top row) ───────────────────────────
  followBtn: {
    backgroundColor: '#C9956C', borderRadius: 10,
    paddingVertical: 7, paddingHorizontal: 14, alignItems: 'center',
    shadowColor: '#C9956C', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  followingBtn: {
    backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#C9956C',
    shadowOpacity: 0, elevation: 0,
  },
  followBtnText: {color: '#FFFFFF', fontWeight: '700', fontSize: 13},

  // ── engagement bar ────────────────────────────────────────────────
  engRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#2A2A2A',
    marginTop: 10, paddingTop: 10,
  },
  engBtn:     {flex: 1, alignItems: 'center', paddingVertical: 4},
  engDivider: {width: 1, height: 18, backgroundColor: '#2A2A2A'},
  engText:    {color: '#A09080', fontSize: 13, fontWeight: '600'},
  engLiked:   {color: '#C9956C'},

  // ── comment bottom sheet ──────────────────────────────────────────
  sheetOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetDismiss:   {flex: 1},
  sheetContainer: {
    backgroundColor: '#1C1C1C',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    height: '70%',
    borderTopWidth: 1, borderTopColor: '#2A2A2A',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#2A2A2A',
  },
  sheetTitle:     {color: '#FFFFFF', fontSize: 14, fontWeight: '700', flex: 1},
  sheetCloseBtn:  {padding: 4, marginLeft: 8},
  sheetCloseText: {color: '#A09080', fontSize: 16, fontWeight: 'bold'},
  sheetScroll:    {flex: 1, paddingHorizontal: 16, paddingTop: 12},
  sheetInputRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#2A2A2A', alignItems: 'flex-end',
  },
  sheetInput: {
    flex: 1, backgroundColor: '#0E0E0E', borderRadius: 12,
    padding: 10, color: '#FFFFFF', fontSize: 13,
    borderWidth: 1, borderColor: '#2A2A2A', maxHeight: 80,
  },
  sheetSendBtn: {
    backgroundColor: '#C9956C', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center',
  },
  sheetSendText:     {color: '#FFFFFF', fontWeight: 'bold', fontSize: 13},
  noCommentsText:    {color: '#5C5048', fontSize: 13, textAlign: 'center', paddingVertical: 20},
  commentItem:       {flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10},
  commentAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(201,149,108,0.10)',
    borderWidth: 1, borderColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  commentAvatarText: {color: '#C9956C', fontWeight: 'bold', fontSize: 11},
  commentContent:    {flex: 1, backgroundColor: '#1A1A1A', borderRadius: 10, padding: 8},
  commentNameRow:    {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3},
  commentName:       {color: '#C9956C', fontSize: 12, fontWeight: 'bold'},
  commentTime:       {color: '#5C5048', fontSize: 11},
  commentText:       {color: '#FFFFFF', fontSize: 13, lineHeight: 18},
  deleteCommentBtn:  {padding: 4, flexShrink: 0},
  deleteCommentText: {color: '#EF4444', fontSize: 12, fontWeight: 'bold'},
});
