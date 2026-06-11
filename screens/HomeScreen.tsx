import React, {useEffect, useState, useCallback} from 'react';

import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Linking,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {launchImageLibrary} from 'react-native-image-picker';

import ReportModal from './ReportModal';

const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com';
const CLOUD_NAME = 'dipwobgzb';
const UPLOAD_PRESET = 'cinelink_upload';

const C = {
  background:    '#0A0A0A',
  surface:       '#111111',
  card:          '#181818',
  cardElevated:  '#202020',
  inputBg:       '#161616',
  border:        '#242424',
  borderLight:   '#2E2E2E',
  roseGold:      '#C9956C',
  roseGoldLight: '#E8C4A0',
  roseGoldDark:  '#A3734E',
  roseGoldFaint: 'rgba(201,149,108,0.10)',
  roseGoldGlow:  'rgba(201,149,108,0.18)',
  primary:       '#C9956C',
  primaryLight:  '#E8C4A0',
  primaryDark:   '#A3734E',
  primaryFaint:  'rgba(201,149,108,0.10)',
  textPrimary:   '#F5F0EB',
  textSecondary: '#9A8A7A',
  textTertiary:  '#5C5048',
  success:       '#4ADE80',
  successFaint:  'rgba(74,222,128,0.12)',
  successBorder: 'rgba(74,222,128,0.30)',
  error:         '#EF4444',
  errorFaint:    'rgba(239,68,68,0.12)',
  errorBorder:   'rgba(239,68,68,0.30)',
  warning:       '#FBBF24',
  warningFaint:  'rgba(251,191,36,0.10)',
  warningBorder: 'rgba(251,191,36,0.30)',
};

function SkeletonBlock({width, height, style}: any) {
  const shimmer = useState(new Animated.Value(0.25))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {toValue: 0.6, duration: 900, useNativeDriver: true}),
        Animated.timing(shimmer, {toValue: 0.25, duration: 900, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[{width: width || '100%', height: height || 20, backgroundColor: C.card, borderRadius: 8, opacity: shimmer}, style]}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonHeader}>
        <SkeletonBlock width={52} height={52} style={{borderRadius: 26}} />
        <View style={{flex: 1, marginLeft: 12, gap: 8}}>
          <SkeletonBlock width="60%" height={16} />
          <SkeletonBlock width="40%" height={13} />
        </View>
      </View>
      <SkeletonBlock height={180} style={{borderRadius: 14, marginVertical: 14}} />
      <SkeletonBlock height={44} style={{borderRadius: 12}} />
    </View>
  );
}

function EmptyState({icon, title, subtitle}: any) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

function PhoneText({text, textStyle}: {text: string; textStyle: any}) {
  const parts = text.split(/(\+?[\d][\d\s\-]{8,13}[\d])/g);
  return (
    <Text style={textStyle}>
      {parts.map((part, i) => {
        const cleaned = part.replace(/[\s\-]/g, '');
        const isPhone = /^\+?\d{10,13}$/.test(cleaned);
        if (isPhone) {
          return (
            <Text
              key={i}
              style={[textStyle, {color: '#25D366', fontWeight: 'bold'}]}
              onPress={() => {
                const url = `whatsapp://send?phone=${cleaned}`;
                Linking.openURL(url).catch(() =>
                  Alert.alert('WhatsApp not found', 'Please install WhatsApp to contact.'),
                );
              }}>
              {'📱 '}{part}
            </Text>
          );
        }
        return <Text key={i} style={textStyle}>{part}</Text>;
      })}
    </Text>
  );
}

function AvatarRing({photoUrl, name, size = 52, ringColor = C.roseGold, verified = false}: any) {
  return (
    <View style={{width: size + 4, height: size + 4, position: 'relative'}}>
      <View
        style={{
          width: size + 4,
          height: size + 4,
          borderRadius: (size + 4) / 2,
          borderWidth: 2,
          borderColor: ringColor,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: C.cardElevated,
        }}>
        {photoUrl ? (
          <Image
            source={{uri: photoUrl}}
            style={{width: size, height: size, borderRadius: size / 2}}
          />
        ) : (
          <View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: C.roseGoldFaint,
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Text style={{color: C.roseGold, fontSize: size * 0.4, fontWeight: 'bold'}}>
              {name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
      </View>
      {verified && (
        <View style={styles.verifiedDot}>
          <Text style={{fontSize: 9}}>✓</Text>
        </View>
      )}
    </View>
  );
}

const FILTER_TAGS = ['All', 'Actor', 'Director', 'Writer', 'Mumbai', 'Delhi', 'Bollywood'];

function FilterPills({active, onSelect}: {active: string; onSelect: (t: string) => void}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.pillsScroll}
      contentContainerStyle={styles.pillsContent}>
      {FILTER_TAGS.map(tag => (
        <TouchableOpacity
          key={tag}
          style={[styles.pill, active === tag && styles.pillActive]}
          onPress={() => onSelect(tag)}>
          <Text style={[styles.pillText, active === tag && styles.pillTextActive]}>
            {tag}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function ProfileCard({item, navigation}: any) {
  const currentUser = auth().currentUser;
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    if (!currentUser) return;
    try {
      const currentUserName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      await firestore().collection('connectionRequests').add({
        fromUserId:   currentUser.uid,
        fromUserName: currentUserName,
        toUserId:     item.id,
        toUserName:   item.displayName || item.name || 'User',
        status:       'pending',
        createdAt:    firestore.FieldValue.serverTimestamp(),
      });
      await firestore().collection('notifications').add({
        userId:     item.id,
        type:       'connect_request',
        title:      '🤝 Connection Request',
        message:    `${currentUserName} wants to connect with you`,
        senderId:   currentUser.uid,
        senderName: currentUserName,
        read:       false,
        createdAt:  firestore.FieldValue.serverTimestamp(),
      });
      setConnected(true);
    } catch (e) {
      console.log('CONNECT ERROR:', e);
    }
  };

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileCardInner}>
        <AvatarRing
          photoUrl={item.photoUrl}
          name={item.displayName || item.name}
          size={52}
          verified={item.verified}
        />
        <View style={styles.profileInfo}>
          <View style={styles.profileNameRow}>
            <Text style={styles.profileName} numberOfLines={1}>
              {item.displayName || item.name || 'Unknown'}
            </Text>
            {item.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
              </View>
            )}
          </View>
          <Text style={styles.profileMeta} numberOfLines={1}>
            {[item.role, item.city].filter(Boolean).join(' · ') || 'CineLink Member'}
          </Text>
        </View>
        <View style={styles.profileActions}>
          {connected ? (
            <View style={styles.connectedChip}>
              <Text style={styles.connectedChipText}>✓ Connected</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
              <Text style={styles.connectBtnText}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.viewProfileBtn}
        onPress={() => navigation.navigate('PublicProfile', {userId: item.id})}>
        <Text style={styles.viewProfileText}>View Profile →</Text>
      </TouchableOpacity>
    </View>
  );
}

function PostBubble({item, isAdmin, onDelete, navigation}: any) {
  const currentUser = auth().currentUser;
  const currentUserName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const [postComments, setPostComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    const unsub = firestore()
      .collection('feedPosts')
      .doc(item.id)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .limit(10)
      .onSnapshot(
        snap => setPostComments(snap.docs.map(d => ({id: d.id, ...d.data()}))),
        err => console.log('FEED COMMENTS ERROR:', err),
      );
    return () => unsub();
  }, [item.id]);

  const postComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      await firestore()
        .collection('feedPosts')
        .doc(item.id)
        .collection('comments')
        .add({
          text: commentText.trim(),
          userId: currentUser?.uid,
          userName: currentUserName,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      setCommentText('');
      setShowComments(false);
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Could not post comment.');
    }
    setPostingComment(false);
  };

  const deleteComment = async (commentId: string, commentUserId: string) => {
    if (commentUserId !== currentUser?.uid && !isAdmin) return;
    Alert.alert('Delete Comment', 'Delete this comment?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await firestore()
              .collection('feedPosts').doc(item.id)
              .collection('comments').doc(commentId).delete();
          } catch (e) {console.log(e);}
        },
      },
    ]);
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'yesterday';
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString([], {day: 'numeric', month: 'short'});
  };

  const confirmDelete = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id)},
    ]);
  };

  return (
    <View style={styles.bubble}>
      <View style={styles.bubbleHeader}>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>🛡️ CineLink Admin</Text>
        </View>
        <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
      </View>

      {item.imageUrl ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ImageViewer', {imageUrl: item.imageUrl})}>
          <Image source={{uri: item.imageUrl}} style={styles.bubbleImage} resizeMode="cover" />
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>🔍 Tap to view fullscreen</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {item.text ? <PhoneText text={item.text} textStyle={styles.bubbleText} /> : null}

      <View style={styles.bubbleActions}>
        <TouchableOpacity
          style={styles.commentToggleBtn}
          onPress={() => setShowComments(!showComments)}>
          <Text style={styles.commentToggleText}>
            💬 {postComments.length > 0 ? `${postComments.length} Comment${postComments.length > 1 ? 's' : ''}` : 'Comment'}
          </Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity onPress={confirmDelete}>
            <Text style={styles.bubbleDeleteText}>🗑 Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {showComments && (
        <View style={styles.commentsBox}>
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={C.textTertiary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.commentSendBtn, (!commentText.trim() || postingComment) && {opacity: 0.4}]}
              onPress={postComment}
              disabled={!commentText.trim() || postingComment}>
              {postingComment ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.commentSendText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
          {postComments.length === 0 ? (
            <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
          ) : (
            postComments.map(comment => {
              const canDelete = comment.userId === currentUser?.uid || isAdmin;
              return (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {comment.userName?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentNameRow}>
                      <Text style={styles.commentName}>{comment.userName}</Text>
                      <Text style={styles.commentTime}>{formatTime(comment.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                  {canDelete && (
                    <TouchableOpacity
                      onPress={() => deleteComment(comment.id, comment.userId)}
                      style={styles.deleteCommentBtn}>
                      <Text style={styles.deleteCommentText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen({navigation}: any) {
  const [selectedTab, setSelectedTab] = useState('Auditions');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [auditionPosts, setAuditionPosts] = useState<any[]>([]);
  const [generalPosts, setGeneralPosts] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [films, setFilms] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [comments, setComments] = useState<any>({});
  const [filmsLoading, setFilmsLoading] = useState(true);
  const [contestsLoading, setContestsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    auth().currentUser?.photoURL || null,
  );

  const currentUser = auth().currentUser;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!currentUser) return;
    const unsub = firestore()
      .collection('notifications')
      .where('userId', '==', currentUser.uid)
      .where('read', '==', false)
      .onSnapshot(snap => setUnreadCount(snap.size));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = firestore()
      .collection('users')
      .doc(currentUser.uid)
      .onSnapshot(doc => {
        const data = doc.data();
        if (data?.photoUrl) setProfilePhoto(data.photoUrl);
        else if (data?.photoURL) setProfilePhoto(data.photoURL);
      });
    return () => unsub();
  }, []);

  useEffect(() => {
    setFeedLoading(true);
    const unsubAuditions = firestore()
      .collection('feedPosts')
      .where('tab', '==', 'auditions')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          setAuditionPosts(snap.docs.map(d => ({id: d.id, ...d.data()})));
          setFeedLoading(false);
        },
        err => {console.log('AUDITIONS ERROR:', err); setFeedLoading(false);},
      );
    const unsubGeneral = firestore()
      .collection('feedPosts')
      .where('tab', '==', 'general')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => setGeneralPosts(snap.docs.map(d => ({id: d.id, ...d.data()}))),
        err => console.log('GENERAL ERROR:', err),
      );
    return () => { unsubAuditions(); unsubGeneral(); };
  }, []);

  useEffect(() => {
    setFilmsLoading(true);
    const unsub = firestore()
      .collection('films')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          setFilms(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
          setFilmsLoading(false);
        },
        err => { console.log('FILMS ERROR:', err); setFilmsLoading(false); },
      );
    return () => unsub();
  }, []);

  useEffect(() => {
    setContestsLoading(true);
    const unsub = firestore()
      .collection('contests')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          setContests(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
          setContestsLoading(false);
        },
        err => { console.log('CONTESTS ERROR:', err); setContestsLoading(false); },
      );
    return () => unsub();
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (text.trim().length > 1) {
      const q = text.toLowerCase();
      // Search across auditions, films and contests
      const auditionMatches = auditionPosts
        .filter(p => p.text?.toLowerCase().includes(q))
        .slice(0, 3)
        .map(p => ({id: p.id, label: p.text?.substring(0, 60), type: '🎭'}));
      const filmMatches = films
        .filter(f => f.title?.toLowerCase().includes(q) || f.genre?.toLowerCase().includes(q))
        .slice(0, 2)
        .map(f => ({id: f.id, label: f.title, type: '🎬'}));
      const contestMatches = contests
        .filter(c => c.title?.toLowerCase().includes(q))
        .slice(0, 2)
        .map(c => ({id: c.id, label: c.title, type: '🏆'}));
      setSuggestions([...auditionMatches, ...filmMatches, ...contestMatches].slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const loadComments = async (filmId: string) => {
    try {
      const snap = await firestore()
        .collection('films').doc(filmId)
        .collection('comments').orderBy('createdAt', 'desc').get();
      setComments((prev: any) => ({
        ...prev,
        [filmId]: snap.docs.map(doc => ({id: doc.id, ...doc.data()})),
      }));
    } catch (e) {console.log('LOAD COMMENTS ERROR:', e);}
  };

  const sendPost = async (tab: 'auditions' | 'general') => {
    if (!postText.trim() && !postImage) {
      Alert.alert('Empty Post', 'Please write something or attach an image.');
      return;
    }
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only admin can post.');
      return;
    }
    setPosting(true);
    try {
      let imageUrl = '';
      if (postImage) {
        const formData = new FormData();
        formData.append('file', {uri: postImage, type: 'image/jpeg', name: 'post.jpg'} as any);
        formData.append('upload_preset', UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {method: 'POST', body: formData});
        const data = await res.json();
        if (!data.secure_url) throw new Error('Cloudinary upload failed');
        imageUrl = data.secure_url;
      }
      await firestore().collection('feedPosts').add({
        tab, text: postText.trim(), imageUrl,
        createdAt: firestore.FieldValue.serverTimestamp(),
        postedBy: currentUser?.email, postedById: currentUser?.uid,
      });

      // Also save to auditions collection so Browse Auditions can find it
      if (tab === 'auditions') {
        await firestore().collection('auditions').add({
          title: postText.trim(),
          description: postText.trim(),
          imageUrl,
          isActive: true,
          status: 'Open',
          createdAt: firestore.FieldValue.serverTimestamp(),
          directorId: currentUser?.uid,
          directorEmail: currentUser?.email,
          directorName: currentUser?.displayName || currentUser?.email?.split('@')[0],
        });
      }

      setPostText('');
      setPostImage(null);
      Alert.alert('✅ Posted!', 'Your post is now live.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not post. Try again.');
    } finally {setPosting(false);}
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets && result.assets[0]?.uri) setPostImage(result.assets[0].uri);
  };

  const deletePost = async (postId: string) => {
    try {
      await firestore().collection('feedPosts').doc(postId).delete();
    } catch (error: any) {
      Alert.alert('Delete Error', error?.message || 'Could not delete post.');
    }
  };

  const handleLike = async (filmId: string, likedBy: string[] = []) => {
    if (!currentUser) return;
    const alreadyLiked = likedBy.includes(currentUser.uid);
    try {
      await firestore().collection('films').doc(filmId).update({
        likes: firestore.FieldValue.increment(alreadyLiked ? -1 : 1),
        likedBy: alreadyLiked
          ? firestore.FieldValue.arrayRemove(currentUser.uid)
          : firestore.FieldValue.arrayUnion(currentUser.uid),
      });
    } catch (e) {console.log('LIKE ERROR:', e);}
  };

  const deleteFilm = (filmId: string) => {
    Alert.alert('Delete Film', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await firestore().collection('films').doc(filmId).delete();
        } catch (e) {console.log(e);}
      }},
    ]);
  };

  const openReport = (id: string, type: string, title: string) => {
    setReportTarget({id, type, title});
    setReportModalVisible(true);
  };

  const filteredFilms = films.filter(item => {
    const text = searchText.toLowerCase();
    return item.title?.toLowerCase().includes(text) || item.genre?.toLowerCase().includes(text);
  });

  const filteredContests = contests.filter(item => {
    const text = searchText.toLowerCase();
    return item.title?.toLowerCase().includes(text) || item.category?.toLowerCase().includes(text);
  });

  const renderComposer = (tab: 'auditions' | 'general') => {
    if (!isAdmin) return null;
    return (
      <View style={styles.composer}>
        {postImage && (
          <View style={styles.imagePreviewRow}>
            <Image source={{uri: postImage}} style={styles.imagePreview} />
            <TouchableOpacity onPress={() => setPostImage(null)} style={styles.removeImageBtn}>
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composerRow}>
          <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.composerInput}
            placeholder={tab === 'auditions' ? 'Post an audition...' : 'Post an update...'}
            placeholderTextColor={C.textTertiary}
            value={postText}
            onChangeText={setPostText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!postText.trim() && !postImage) && styles.sendBtnDisabled]}
            onPress={() => sendPost(tab)}
            disabled={posting || (!postText.trim() && !postImage)}>
            {posting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendBtnText}>Send</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFeed = (tab: 'auditions' | 'general') => {
    const allPosts = tab === 'auditions' ? auditionPosts : generalPosts;
    const posts = searchText.trim()
      ? allPosts.filter(p =>
          p.text?.toLowerCase().includes(searchText.toLowerCase()) ||
          p.title?.toLowerCase().includes(searchText.toLowerCase()),
        )
      : activeFilter !== 'All'
      ? allPosts.filter(p => p.text?.toLowerCase().includes(activeFilter.toLowerCase()))
      : allPosts;

    return (
      <View>
        {tab === 'auditions' && (
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('BrowseAuditions')}>
            <Text style={styles.browseBtnText}>🎭 Browse All Auditions →</Text>
          </TouchableOpacity>
        )}
        <FilterPills active={activeFilter} onSelect={setActiveFilter} />
        {renderComposer(tab)}
        {feedLoading ? (
          <ActivityIndicator color={C.primary} style={{marginTop: 40}} />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={tab === 'auditions' ? '🎭' : '📢'}
            title={tab === 'auditions' ? 'No auditions found' : 'No posts found'}
            subtitle={searchText ? 'Try a different search term' : 'Admin will post updates here'}
          />
        ) : (
          posts.map(post => (
            <PostBubble
              key={post.id}
              item={post}
              isAdmin={isAdmin}
              onDelete={deletePost}
              navigation={navigation}
            />
          ))
        )}
      </View>
    );
  };

  const renderFilms = () => {
    if (filmsLoading) return [1, 2, 3].map(i => <SkeletonCard key={i} />);
    if (filteredFilms.length === 0) {
      return <EmptyState icon="🎬" title="No short films yet" subtitle="Be the first to upload a short film on CineLink" />;
    }
    return filteredFilms.map(item => {
      const isLiked = item.likedBy?.includes(currentUser?.uid);
      const isOwner = item.directorId === currentUser?.uid;
      return (
        <View key={item.id} style={styles.card}>
          <View style={styles.filmCardHeader}>
            <AvatarRing
              name={item.directorName || item.directorEmail}
              size={40}
              verified={item.verified}
            />
            <View style={{flex: 1, marginLeft: 10}}>
              <Text style={styles.filmDirectorName} numberOfLines={1}>
                {item.directorName || item.directorEmail?.split('@')[0] || 'Director'}
              </Text>
              <Text style={styles.filmDirectorMeta}>Director · {item.genre || 'Film'}</Text>
            </View>
            <View style={styles.viewsChip}>
              <Text style={styles.viewsChipText}>👁 {item.views || 0}</Text>
            </View>
          </View>

          {item.posterUrl ? (
            <Image source={{uri: item.posterUrl}} style={styles.poster} />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Text style={styles.posterPlaceholderText}>🎬</Text>
            </View>
          )}

          <Text style={styles.cardTitle}>{item.title}</Text>

          <View style={styles.badgeRow}>
            {item.genre ? <View style={styles.badge}><Text style={styles.badgeText}>{item.genre}</Text></View> : null}
            {item.duration ? <View style={styles.badge}><Text style={styles.badgeText}>⏱ {item.duration} min</Text></View> : null}
            <View style={[styles.badge, styles.badgeSuccess]}>
              <Text style={[styles.badgeText, {color: C.success}]}>{item.status || 'Screening'}</Text>
            </View>
          </View>

          {item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}

          <View style={styles.socialRow}>
            <TouchableOpacity onPress={() => handleLike(item.id, item.likedBy)} style={styles.socialBtn}>
              <Text style={styles.likeText}>{isLiked ? '❤️' : '🤍'} {item.likes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Text style={styles.commentIcon}>💬 {comments[item.id]?.length || 0}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.watchBtn}
              onPress={() => navigation.navigate('FilmDetail', {film: item})}>
              <Text style={styles.watchBtnText}>🎬 Watch Film</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity style={styles.deleteFilmBtn} onPress={() => deleteFilm(item.id)}>
                <Text style={styles.deleteFilmText}>🗑</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.reportBtn} onPress={() => openReport(item.id, 'film', item.title)}>
            <Text style={styles.reportBtnText}>🚩 Report</Text>
          </TouchableOpacity>
        </View>
      );
    });
  };

  const renderContests = () => {
    if (contestsLoading) return [1, 2].map(i => <SkeletonCard key={i} />);
    if (filteredContests.length === 0) {
      return <EmptyState icon="🏆" title="No contests yet" subtitle="Check back soon for exciting cinema contests" />;
    }
    return filteredContests.map(item => (
      <View key={item.id} style={styles.card}>
        <View style={styles.contestBanner}>
          <Text style={styles.contestBannerText}>🏆 Contest</Text>
          {item.prize ? (
            <View style={styles.prizeBadge}>
              <Text style={styles.prizeText}>💰 {item.prize}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.badgeRow}>
          {item.category ? <View style={styles.badge}><Text style={styles.badgeText}>🎭 {item.category}</Text></View> : null}
          {item.entryFee !== undefined ? (
            <View style={[styles.badge, item.entryFee === 0 && styles.badgeSuccess]}>
              <Text style={[styles.badgeText, item.entryFee === 0 && {color: C.success}]}>
                {item.entryFee === 0 ? '✅ Free Entry' : `₹${item.entryFee} Entry`}
              </Text>
            </View>
          ) : null}
        </View>
        {item.description ? <Text style={styles.description} numberOfLines={3}>{item.description}</Text> : null}
        {item.deadline ? <Text style={styles.metaText}>⏰ Deadline: {item.deadline}</Text> : null}
        <TouchableOpacity style={styles.watchBtn} onPress={() => navigation.navigate('ContestDetail', {contest: item})}>
          <Text style={styles.watchBtnText}>Enter Contest →</Text>
        </TouchableOpacity>
      </View>
    ));
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
              progressBackgroundColor={C.card}
            />
          }>

          {/* ── HEADER ── */}
          <View style={styles.headerContainer}>
            <View style={{flex: 1}}>
              <Text style={styles.logo}>CineLink</Text>
              <Text style={styles.welcome}>Welcome back 👋</Text>
              <Text style={styles.userHandle}>
                {auth().currentUser?.displayName || auth().currentUser?.email?.split('@')[0] || 'Creator'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.notificationBtn}
                onPress={() => navigation.navigate('Notifications')}>
                <Text style={styles.notificationIcon}>🔔</Text>
                {unreadCount > 0 && (
                  <View style={styles.notifDot} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => navigation.navigate('Profile')}>
                {profilePhoto ? (
                  <Image source={{uri: profilePhoto}} style={styles.profileImage} />
                ) : (
                  <Text style={styles.profileLetter}>
                    {auth().currentUser?.displayName?.charAt(0)?.toUpperCase() ||
                      auth().currentUser?.email?.charAt(0)?.toUpperCase() || 'C'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SEARCH BAR ── */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              placeholder="Search auditions, films, contests..."
              placeholderTextColor={C.textTertiary}
              value={searchText}
              onChangeText={handleSearchChange}
              style={styles.searchInput}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchText(''); setSuggestions([]); }}>
                <Text style={{color: C.textTertiary, fontSize: 18, fontWeight: 'bold', paddingHorizontal: 6}}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── LIVE SUGGESTIONS DROPDOWN ── */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {suggestions.map((s, i) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.suggestionItem,
                    i < suggestions.length - 1 && styles.suggestionBorder,
                  ]}
                  onPress={() => {
                    setSearchText(s.label || '');
                    setSuggestions([]);
                  }}>
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {s.type} {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── TABS ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsContent}>
            {['Auditions', 'General', 'Short Films', 'Contests'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, selectedTab === tab && styles.activeTab]}
                onPress={() => setSelectedTab(tab)}>
                <Text style={[styles.tabText, selectedTab === tab && styles.activeText]}>
                  {tab === 'Auditions' ? '🎭 ' : tab === 'General' ? '📢 ' : tab === 'Short Films' ? '🎬 ' : '🏆 '}
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── ADMIN QUICK ACTIONS ── */}
          {isAdmin && selectedTab === 'Short Films' && (
            <View style={styles.aiButtonsContainer}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AIAssistant')}>
                <Text style={styles.actionBtnIcon}>🤖</Text>
                <Text style={styles.actionBtnText}>AI Assistant</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.quickPostBtn]} onPress={() => navigation.navigate('QuickPost')}>
                <Text style={styles.actionBtnIcon}>⚡</Text>
                <Text style={styles.actionBtnText}>Quick Post</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{paddingBottom: 100}}>
            {selectedTab === 'Auditions' && renderFeed('auditions')}
            {selectedTab === 'General' && renderFeed('general')}
            {selectedTab === 'Short Films' && renderFilms()}
            {selectedTab === 'Contests' && renderContests()}
          </View>
        </ScrollView>
      </SafeAreaView>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => {setReportModalVisible(false); setReportTarget(null);}}
        contentId={reportTarget?.id || ''}
        contentType={reportTarget?.type || 'audition'}
        contentTitle={reportTarget?.title || ''}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container:       {flex: 1, backgroundColor: C.background},
  headerContainer: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, marginBottom: 16},
  headerRight:  {flexDirection: 'row', alignItems: 'center', gap: 10},
  logo:         {color: C.roseGold, fontSize: 30, fontWeight: '800', letterSpacing: 0.4},
  welcome:      {color: C.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 4},
  userHandle:   {color: C.textSecondary, fontSize: 13, marginTop: 2},
  notificationBtn: {width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border},
  notifDot: {position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30'},
  notificationIcon:{fontSize: 17},
  profileButton:   {width: 52, height: 52, borderRadius: 26, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: C.roseGold, overflow: 'hidden'},
  profileImage:    {width: 52, height: 52, borderRadius: 26},
  profileLetter:   {color: C.roseGold, fontSize: 20, fontWeight: 'bold'},
  searchContainer: {flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, marginHorizontal: 18, marginBottom: 4, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 0, height: 48},
  searchIcon:  {fontSize: 15, marginRight: 8, color: C.textTertiary},
  searchInput: {flex: 1, color: C.textPrimary, fontSize: 14, height: 48},

  // ── Suggestions ──
  suggestionsBox: {
    backgroundColor: C.card,
    marginHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  suggestionText: {
    color: C.textPrimary,
    fontSize: 13,
  },

  tabsScroll:   {marginBottom: 14},
  tabsContent:  {paddingHorizontal: 18, gap: 8},
  tabBtn:       {paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border},
  activeTab:    {backgroundColor: C.roseGold, borderColor: C.roseGold},
  tabText:      {color: C.textSecondary, fontWeight: '600', fontSize: 13},
  activeText:   {color: '#FFFFFF', fontWeight: '700'},
  pillsScroll:   {marginBottom: 14},
  pillsContent:  {paddingHorizontal: 18, gap: 8},
  pill:          {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border},
  pillActive:    {borderColor: C.roseGold, backgroundColor: C.roseGoldFaint},
  pillText:      {color: C.textSecondary, fontSize: 12, fontWeight: '600'},
  pillTextActive:{color: C.roseGold, fontWeight: '700'},
  ctaBannerRow: {flexDirection: 'row', marginHorizontal: 18, marginBottom: 16, gap: 10},
  ctaBannerPrimary: {flex: 1, backgroundColor: C.roseGold, borderRadius: 14, paddingVertical: 14, alignItems: 'center'},
  ctaBannerPrimaryText: {color: '#fff', fontWeight: '700', fontSize: 14},
  ctaBannerSecondary: {flex: 1, backgroundColor: 'transparent', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.roseGold},
  ctaBannerSecondaryText: {color: C.roseGold, fontWeight: '700', fontSize: 14},
  browseBtn:     {backgroundColor: C.roseGoldFaint, marginHorizontal: 18, marginBottom: 12, borderRadius: 14, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: C.roseGold},
  browseBtnText: {color: C.roseGold, fontWeight: '700', fontSize: 14},
  aiButtonsContainer: {flexDirection: 'row', gap: 10, marginBottom: 16, paddingHorizontal: 18},
  actionBtn:     {flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border},
  quickPostBtn:  {borderColor: C.roseGold, backgroundColor: C.roseGoldFaint},
  actionBtnIcon: {fontSize: 18, marginBottom: 4},
  actionBtnText: {color: C.textPrimary, fontSize: 11, fontWeight: '600'},
  composer:        {backgroundColor: C.card, marginHorizontal: 18, marginBottom: 16, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.border},
  imagePreviewRow: {marginBottom: 8, alignSelf: 'flex-start', position: 'relative'},
  imagePreview:    {width: 120, height: 120, borderRadius: 10},
  removeImageBtn:  {position: 'absolute', top: -6, right: -6, backgroundColor: C.error, borderRadius: 10, width: 22, height: 22, justifyContent: 'center', alignItems: 'center'},
  removeImageText: {color: '#fff', fontSize: 12, fontWeight: 'bold'},
  composerRow:     {flexDirection: 'row', alignItems: 'flex-end', gap: 8},
  attachBtn:       {width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardElevated, justifyContent: 'center', alignItems: 'center'},
  attachIcon:      {fontSize: 20},
  composerInput:   {flex: 1, backgroundColor: C.cardElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: C.textPrimary, fontSize: 14, maxHeight: 100},
  sendBtn:         {backgroundColor: C.roseGold, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10},
  sendBtnDisabled: {opacity: 0.35},
  sendBtnText:     {color: '#fff', fontWeight: 'bold', fontSize: 14},
  bubble: {backgroundColor: C.card, marginHorizontal: 18, marginBottom: 12, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.border},
  bubbleHeader:   {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  adminBadge:     {backgroundColor: C.roseGoldFaint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.roseGold},
  adminBadgeText: {color: C.roseGold, fontSize: 11, fontWeight: '700'},
  bubbleTime:     {color: C.textTertiary, fontSize: 11},
  bubbleImage:    {width: '100%', height: 220, borderRadius: 14, marginBottom: 4},
  tapHint:        {paddingVertical: 4, alignItems: 'center', marginBottom: 8},
  tapHintText:    {color: C.textTertiary, fontSize: 11},
  bubbleText:     {color: C.textPrimary, fontSize: 15, lineHeight: 22},
  bubbleActions:  {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border},
  commentToggleBtn:  {flexDirection: 'row', alignItems: 'center'},
  commentToggleText: {color: C.roseGoldLight, fontSize: 13, fontWeight: '600'},
  bubbleDeleteText:  {color: C.error, fontSize: 12, fontWeight: '600'},
  commentsBox:     {marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10},
  commentInputRow: {flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-end'},
  commentInput:    {flex: 1, backgroundColor: C.cardElevated, borderRadius: 12, padding: 10, color: C.textPrimary, fontSize: 13, borderWidth: 1, borderColor: C.borderLight, maxHeight: 80},
  commentSendBtn:    {backgroundColor: C.roseGold, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10},
  commentSendText:   {color: '#FFFFFF', fontWeight: 'bold', fontSize: 13},
  noCommentsText:    {color: C.textTertiary, fontSize: 13, textAlign: 'center', paddingVertical: 8},
  commentItem:       {flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10},
  commentAvatar:     {width: 28, height: 28, borderRadius: 14, backgroundColor: C.roseGoldFaint, borderWidth: 1, borderColor: C.roseGold, justifyContent: 'center', alignItems: 'center', flexShrink: 0},
  commentAvatarText: {color: C.roseGold, fontWeight: 'bold', fontSize: 11},
  commentContent:    {flex: 1, backgroundColor: C.cardElevated, borderRadius: 10, padding: 8},
  commentNameRow:    {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3},
  commentName:       {color: C.roseGold, fontSize: 12, fontWeight: 'bold'},
  commentTime:       {color: C.textTertiary, fontSize: 11},
  commentText:       {color: C.textPrimary, fontSize: 13, lineHeight: 18},
  deleteCommentBtn:  {padding: 4, flexShrink: 0},
  deleteCommentText: {color: C.error, fontSize: 12, fontWeight: 'bold'},
  profileCard:      {backgroundColor: C.card, borderRadius: 18, marginHorizontal: 18, marginBottom: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden'},
  profileCardInner: {flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12},
  profileInfo:      {flex: 1},
  profileNameRow:   {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3},
  profileName:      {color: C.textPrimary, fontSize: 16, fontWeight: '700', flexShrink: 1},
  profileMeta:      {color: C.textSecondary, fontSize: 12},
  profileActions:   {},
  verifiedBadge:     {backgroundColor: C.roseGoldFaint, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.roseGold},
  verifiedBadgeText: {color: C.roseGold, fontSize: 9, fontWeight: '800', letterSpacing: 0.5},
  verifiedDot:       {position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: C.roseGold, borderWidth: 1.5, borderColor: C.card, justifyContent: 'center', alignItems: 'center'},
  connectBtn:         {backgroundColor: C.roseGold, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8},
  connectBtnText:     {color: '#fff', fontSize: 13, fontWeight: '700'},
  connectedChip:      {backgroundColor: C.roseGoldFaint, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.roseGold},
  connectedChipText:  {color: C.roseGold, fontSize: 12, fontWeight: '600'},
  viewProfileBtn:     {borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 11, alignItems: 'center'},
  viewProfileText:    {color: C.roseGold, fontSize: 13, fontWeight: '600'},
  card: {backgroundColor: C.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border, marginHorizontal: 18},
  skeletonHeader:     {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  filmCardHeader:     {flexDirection: 'row', alignItems: 'center', marginBottom: 14},
  filmDirectorName:   {color: C.textPrimary, fontSize: 14, fontWeight: '700'},
  filmDirectorMeta:   {color: C.textSecondary, fontSize: 12, marginTop: 2},
  viewsChip:          {backgroundColor: C.cardElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.border},
  viewsChipText:      {color: C.textSecondary, fontSize: 11},
  poster:                {width: '100%', height: 195, borderRadius: 14, marginBottom: 14},
  posterPlaceholder:     {width: '100%', height: 140, borderRadius: 14, marginBottom: 14, backgroundColor: C.cardElevated, justifyContent: 'center', alignItems: 'center'},
  posterPlaceholderText: {fontSize: 48},
  cardTitle:             {color: C.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 10, letterSpacing: 0.2},
  badgeRow:    {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10},
  badge:       {backgroundColor: C.cardElevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.border},
  badgeSuccess:{backgroundColor: C.successFaint, borderColor: C.successBorder},
  badgeText:   {color: C.textSecondary, fontSize: 12},
  description: {color: C.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 12},
  metaText:    {color: C.textSecondary, fontSize: 13, marginBottom: 12},
  socialRow: {flexDirection: 'row', gap: 16, paddingVertical: 10, marginBottom: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border},
  socialBtn:   {flexDirection: 'row', alignItems: 'center'},
  likeText:    {color: '#FB7185', fontWeight: '700', fontSize: 14},
  commentIcon: {color: C.roseGoldLight, fontWeight: '700', fontSize: 14},
  ctaRow:       {flexDirection: 'row', gap: 10, alignItems: 'center'},
  watchBtn:     {flex: 1, backgroundColor: C.roseGold, borderRadius: 14, paddingVertical: 14, alignItems: 'center'},
  watchBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},
  deleteFilmBtn:  {width: 48, height: 48, backgroundColor: C.errorFaint, borderWidth: 1, borderColor: C.errorBorder, borderRadius: 14, justifyContent: 'center', alignItems: 'center'},
  deleteFilmText: {color: C.error, fontSize: 18},
  reportBtn:     {marginTop: 12, paddingTop: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border},
  reportBtnText: {color: C.textTertiary, fontSize: 12, fontWeight: '500'},
  contestBanner:     {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  contestBannerText: {color: C.warning, fontWeight: '700', fontSize: 13},
  prizeBadge:        {backgroundColor: C.warningFaint, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: C.warningBorder},
  prizeText:         {color: C.warning, fontSize: 11, fontWeight: 'bold'},
  emptyState:    {alignItems: 'center', paddingVertical: 60},
  emptyIcon:     {fontSize: 48, marginBottom: 14},
  emptyTitle:    {color: C.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 6},
  emptySubtitle: {color: C.textSecondary, fontSize: 14},
  chipApproved: {backgroundColor: C.successFaint, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: C.successBorder, alignItems: 'center'},
  chipRejected: {backgroundColor: C.errorFaint, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: C.errorBorder, alignItems: 'center'},
  chipPending: {backgroundColor: C.warningFaint, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: C.warningBorder, alignItems: 'center'},
  chipTextApproved: {color: C.success, fontWeight: '700', fontSize: 13},
  chipTextRejected: {color: C.error, fontWeight: '700', fontSize: 13},
  chipTextPending:  {color: C.warning, fontWeight: '700', fontSize: 13},
});