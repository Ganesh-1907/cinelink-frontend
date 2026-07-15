import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  StatusBar,
  Platform,
  Share,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Video from 'react-native-video';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');
const STATUS_BAR_HEIGHT = StatusBar.currentHeight ?? 24;

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'Creator';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function ReelsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const currentUser = auth().currentUser;
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pausedMap, setPausedMap] = useState<{[key: string]: boolean}>({});
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Pause all videos when navigating away
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, []),
  );

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('cinereels')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          setReels(data);
          setLoading(false);
          loadLikedStatus();
        },
        error => {
          console.log('Reels error:', error);
          setLoading(false);
        },
      );
    return unsubscribe;
  }, []);

  const loadLikedStatus = async () => {
    if (!currentUser) return;
    try {
      const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
      const likedReelIds = userDoc.data()?.likedReels || [];
      setLikedReels(new Set(likedReelIds));
    } catch (e) {console.log(e);}
  };

  const toggleLike = async (reelId: string) => {
    if (!currentUser) return;
    const isLiked = likedReels.has(reelId);
    try {
      await firestore().collection('cinereels').doc(reelId).update({
        likes: firestore.FieldValue.increment(isLiked ? -1 : 1),
      });
      await firestore().collection('users').doc(currentUser.uid).update({
        likedReels: isLiked
          ? firestore.FieldValue.arrayRemove(reelId)
          : firestore.FieldValue.arrayUnion(reelId),
      });
      const updated = new Set(likedReels);
      isLiked ? updated.delete(reelId) : updated.add(reelId);
      setLikedReels(updated);
    } catch (e) {console.log(e);}
  };

  const togglePause = (reelId: string) => {
    setPausedMap(prev => ({...prev, [reelId]: !prev[reelId]}));
  };

  const onViewableItemsChanged = useCallback(({viewableItems}: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedReel, setSelectedReel] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [postingComment, setPostingComment] = useState(false);

  const openComments = async (reel: any) => {
    setSelectedReel(reel);
    setCommentModalVisible(true);
    try {
      const snap = await firestore()
        .collection('cinereels').doc(reel.id)
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      setComments(snap.docs.map(d => ({id: d.id, ...d.data()})));
    } catch (e) { setComments([]); }
  };

  const postComment = async () => {
    if (!commentText.trim() || !selectedReel || !currentUser) return;
    setPostingComment(true);
    try {
      await firestore().collection('cinereels').doc(selectedReel.id)
        .collection('comments').add({
          text: commentText.trim(),
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          userPhoto: currentUser.photoURL || '',
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      await firestore().collection('cinereels').doc(selectedReel.id).update({
        comments: firestore.FieldValue.increment(1),
      });
      setCommentText('');
      setComments(prev => [{id: 'new', text: commentText.trim(), userName: currentUser.displayName || 'User'}, ...prev]);
      Alert.alert('Done', 'Comment posted!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setPostingComment(false); }
  };

  const shareReel = async (reel: any) => {
    try {
      await Share.share({
        message: `🎬 Check out this CineReel by ${reel.creatorName || 'Creator'}!\n\n${reel.caption || ''}\n\nWatch on CineLink 📱`,
        url: reel.videoUrl || '',
      });
    } catch (e) {}
  };

  const viewabilityConfig = useRef({itemVisiblePercentThreshold: 60}).current;

  const renderReel = ({item, index}: any) => {
    const isLiked = likedReels.has(item.id);
    const isActive = index === currentIndex;
    const isPaused = pausedMap[item.id] ?? false;
    const creatorName = cleanName(item.creatorName || item.uploaderName);
    const avatarUrl = item.creatorAvatar || item.creatorPhotoUrl || item.photoURL || item.photoUrl || null;
    const shouldPlay = isScreenFocused && isActive && !isPaused;

    return (
      <View style={styles.reelContainer}>
        {/* FULL SCREEN VIDEO */}
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={() => togglePause(item.id)}>
          <Video
            source={{uri: item.videoUrl}}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            paused={!shouldPlay}
            repeat
            muted={false}
            ignoreSilentSwitch="ignore"
          />
        </TouchableOpacity>

        {/* GRADIENT OVERLAY — bottom fade using stacked views */}
        <View pointerEvents="none" style={styles.gradientTop} />
        <View pointerEvents="none" style={styles.gradientBottom} />

        {/* PAUSE ICON */}
        {isPaused && (
          <View pointerEvents="none" style={styles.pauseOverlay}>
            <View style={styles.pauseCircle}>
              <Text style={styles.pauseIcon}>▶</Text>
            </View>
          </View>
        )}

        {/* TOP BAR — overlaid on video */}
        <View style={[styles.topBar, {top: insets.top + 8}]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>CineReels</Text>
          <TouchableOpacity
            style={styles.uploadTopBtn}
            onPress={() => navigation.navigate('UploadReels')}>
            <Text style={styles.uploadTopText}>+ Upload</Text>
          </TouchableOpacity>
        </View>

        {/* BOTTOM CONTENT */}
        <View style={styles.bottomContent} pointerEvents="box-none">

          {/* CREATOR ROW */}
          <View style={styles.creatorRow} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.creatorLeft}
              onPress={() => navigation.navigate('PublicProfile', {userId: item.creatorId})}>
              {avatarUrl ? (
                <Image source={{uri: avatarUrl}} style={styles.creatorAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {creatorName?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.creatorTextBlock}>
                <Text style={styles.creatorName}>@{creatorName}</Text>
                {item.caption ? (
                  <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>

          {/* ACTION BUTTONS — right column */}
          <View style={styles.actions}>
            {/* LIKE */}
            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item.id)}>
              <Text style={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</Text>
              <Text style={styles.actionCount}>{item.likes || 0}</Text>
            </TouchableOpacity>

            {/* COMMENT */}
            <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionCount}>{item.comments || 0}</Text>
            </TouchableOpacity>

            {/* SHARE */}
            <TouchableOpacity style={styles.actionBtn} onPress={() => shareReel(item)}>
              <Text style={styles.actionIcon}>↗️</Text>
              <Text style={styles.actionCount}>Share</Text>
            </TouchableOpacity>

            {/* CREATOR AVATAR (Instagram-style bottom right) */}
            <TouchableOpacity
              onPress={() => navigation.navigate('PublicProfile', {userId: item.creatorId})}>
              {avatarUrl ? (
                <Image source={{uri: avatarUrl}} style={styles.sideAvatar} />
              ) : (
                <View style={[styles.sideAvatar, styles.sideAvatarPlaceholder]}>
                  <Text style={styles.sideAvatarText}>
                    {creatorName?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
        <ActivityIndicator size="large" color="#C9956C" />
      </View>
    );
  }

  if (reels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
        <Text style={styles.emptyIcon}>🎬</Text>
        <Text style={styles.emptyText}>No reels yet</Text>
        <Text style={styles.emptySubText}>Be the first to upload!</Text>
        <TouchableOpacity
          style={styles.emptyUploadBtn}
          onPress={() => navigation.navigate('UploadReels')}>
          <Text style={styles.emptyUploadText}>+ Upload Reel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.emptyBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.emptyBackText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={item => item.id}
        renderItem={renderReel}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />

      {/* ── Comment Modal ── */}
      <Modal visible={commentModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
          <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.7)'}}>
            <View style={{flex: 1, marginTop: 100, backgroundColor: '#0A0A0A', borderTopLeftRadius: 20, borderTopRightRadius: 20}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2A2A2A'}}>
                <Text style={{color: '#FFF', fontSize: 18, fontWeight: 'bold'}}>💬 Comments</Text>
                <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                  <Text style={{color: '#C9956C', fontSize: 16}}>Close</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={comments}
                keyExtractor={item => item.id}
                style={{flex: 1}}
                ListEmptyComponent={<Text style={{color: '#A09080', textAlign: 'center', marginTop: 40, fontSize: 14}}>No comments yet</Text>}
                renderItem={({item}: any) => (
                  <View style={{padding: 12, borderBottomWidth: 1, borderBottomColor: '#1C1C1C', flexDirection: 'row', gap: 10}}>
                    <View style={{width: 32, height: 32, borderRadius: 16, backgroundColor: '#C9956C', justifyContent: 'center', alignItems: 'center'}}>
                      <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 14}}>{(item.userName || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={{color: '#C9956C', fontSize: 13, fontWeight: '600'}}>{item.userName || 'User'}</Text>
                      <Text style={{color: '#FFF', fontSize: 14, marginTop: 2}}>{item.text}</Text>
                    </View>
                  </View>
                )}
              />

              <View style={{flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#2A2A2A', gap: 8}}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Write a comment..."
                  placeholderTextColor="#6B5D52"
                  style={{flex: 1, backgroundColor: '#1C1C1C', color: '#FFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10}}
                />
                <TouchableOpacity
                  onPress={postComment}
                  disabled={postingComment || !commentText.trim()}
                  style={{backgroundColor: commentText.trim() ? '#C9956C' : '#2A2A2A', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center'}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold'}}>{postingComment ? '...' : 'Post'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  /* Each full-screen reel */
  reelContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },

  /* Gradient fades — top dark for readability, bottom dark for UI */
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.38,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  /* Pause indicator */
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIcon: {
    fontSize: 28,
    color: '#fff',
    marginLeft: 4,
  },

  /* Top bar — floating over video */
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? STATUS_BAR_HEIGHT + 8 : 54,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: -2,
  },

  topTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },

  uploadTopBtn: {
    backgroundColor: '#C9956C',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  uploadTopText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Bottom content area */
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 28,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  /* Creator info — left side */
  creatorRow: {
    flex: 1,
    marginRight: 12,
  },
  creatorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C9956C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  creatorTextBlock: {
    flex: 1,
  },
  creatorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  caption: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },

  /* Action buttons — right column */
  actions: {
    alignItems: 'center',
    gap: 20,
    paddingBottom: 4,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 30,
    marginBottom: 2,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },

  /* Side avatar (Instagram style) */
  sideAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#C9956C',
  },
  sideAvatarPlaceholder: {
    backgroundColor: '#C9956C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  /* States */
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {fontSize: 70, marginBottom: 20},
  emptyText: {color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8},
  emptySubText: {color: '#A09080', fontSize: 14, textAlign: 'center', marginBottom: 28},
  emptyUploadBtn: {
    backgroundColor: '#C9956C',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginBottom: 12,
  },
  emptyUploadText: {color: '#fff', fontWeight: 'bold', fontSize: 15},
  emptyBackBtn: {marginTop: 8},
  emptyBackText: {color: '#C9956C', fontSize: 15, fontWeight: '600'},
});