import React, {useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Linking, TextInput, Share,
  SafeAreaView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'Creator';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function FilmDetailScreen({route, navigation}: any) {
  const {film} = route.params;
  const currentUser = auth().currentUser;
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(film.likes || 0);

  useEffect(() => {
    loadComments();
    if (film.likedBy?.includes(currentUser?.uid)) setLiked(true);
  }, []);

  const loadComments = async () => {
    try {
      const snapshot = await firestore()
        .collection('films').doc(film.id)
        .collection('comments').orderBy('createdAt', 'desc').get();
      setComments(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    } catch (e) {console.log(e);}
  };

  const handleLike = async () => {
    if (!currentUser) return;
    try {
      await firestore().collection('films').doc(film.id).update({
        likes: firestore.FieldValue.increment(liked ? -1 : 1),
        likedBy: liked
          ? firestore.FieldValue.arrayRemove(currentUser.uid)
          : firestore.FieldValue.arrayUnion(currentUser.uid),
      });
      setLiked(!liked);
      setLikesCount((prev: number) => liked ? prev - 1 : prev + 1);
    } catch (e) {console.log(e);}
  };

  const addComment = async () => {
    if (!commentText) return;
    const currentUserName =
      currentUser?.displayName ||
      currentUser?.email?.split('@')[0] ||
      'User';
    try {
      await firestore().collection('films').doc(film.id).collection('comments').add({
        text: commentText,
        userId: currentUser?.uid,
        userName: currentUserName,
        userEmail: currentUser?.email,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      setCommentText('');
      loadComments();
    } catch (e) {console.log(e);}
  };

  const shareFilm = async () => {
    try {
      const link = film.videoUrl || film.videoLink || '';
      await Share.share({message: `🎬 Watch "${film.title}" on CineLink!\n\n${link}`});
    } catch (e) {console.log(e);}
  };

  const watchFilm = () => {
    const link = film.videoUrl || film.videoLink;
    if (link) Linking.openURL(link);
  };

  // FIX: resolve director name
  const directorName = cleanName(
    film.directorName || film.directorEmail,
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0A0A0A'}}>
    <ScrollView style={styles.container}>

      {/* POSTER */}
      {film.posterUrl ? (
        <Image source={{uri: film.posterUrl}} style={styles.poster} />
      ) : (
        <View style={styles.posterPlaceholder}>
          <Text style={styles.posterEmoji}>🎬</Text>
        </View>
      )}

      <View style={styles.content}>

        {/* TITLE */}
        <Text style={styles.title}>{film.title}</Text>

        {/* META */}
        <View style={styles.metaRow}>
          {film.genre ? <Text style={styles.metaText}>🎭 {film.genre}</Text> : null}
          {film.duration ? <Text style={styles.metaText}>⏱ {film.duration} min</Text> : null}
          <Text style={styles.metaText}>👁 {film.views || 0} views</Text>
        </View>

        {/* CREATOR */}
        <TouchableOpacity
          style={styles.creatorBox}
          onPress={() => navigation.navigate('PublicProfile', {userId: film.directorId})}>
          <View style={styles.creatorAvatar}>
            <Text style={styles.creatorAvatarText}>
              {directorName?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.creatorTitle}>Director</Text>
            {/* FIX: shows name not email */}
            <Text style={styles.creatorName}>{directorName}</Text>
          </View>
          <Text style={styles.visitText}>Visit →</Text>
        </TouchableOpacity>

        {/* DESCRIPTION */}
        {film.description ? (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{film.description}</Text>
          </>
        ) : null}

        {/* ACTIONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.watchBtn} onPress={watchFilm}>
            <Text style={styles.watchBtnText}>▶ Watch Film</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={shareFilm}>
            <Text style={styles.shareBtnText}>🔗 Share</Text>
          </TouchableOpacity>
        </View>

        {/* ENGAGEMENT */}
        <View style={styles.engagementRow}>
          <TouchableOpacity onPress={handleLike}>
            <Text style={styles.engagementText}>{liked ? '❤️' : '🤍'} {likesCount}</Text>
          </TouchableOpacity>
          <Text style={styles.engagementText}>💬 {comments.length}</Text>
          <Text style={styles.engagementText}>👁 {film.views || 0}</Text>
        </View>

        {/* COMMENTS */}
        <Text style={styles.sectionTitle}>Comments</Text>

        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor="#A09080"
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={addComment}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>

        {comments.length === 0 ? (
          <Text style={styles.emptyText}>No comments yet</Text>
        ) : (
          comments.map((item: any) => (
            <View key={item.id} style={styles.commentCard}>
              {/* FIX: shows name not email */}
              <Text style={styles.commentName}>
                {cleanName(item.userName || item.userEmail)}
              </Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
          ))
        )}

      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  poster: {width: '100%', height: 300},
  posterPlaceholder: {
    width: '100%', height: 300, backgroundColor: '#1C1C1C',
    justifyContent: 'center', alignItems: 'center',
  },
  posterEmoji: {fontSize: 70},
  content: {padding: 20},
  title: {color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 10},
  metaRow: {flexDirection: 'row', marginBottom: 20, gap: 16, flexWrap: 'wrap'},
  metaText: {color: '#A09080', fontSize: 14},
  creatorBox: {
    backgroundColor: '#1C1C1C', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  creatorAvatar: {
    width: 55, height: 55, borderRadius: 28, backgroundColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  creatorAvatarText: {color: '#FFFFFF', fontSize: 22, fontWeight: 'bold'},
  creatorTitle: {color: '#A09080', fontSize: 12},
  creatorName: {color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginTop: 2},
  visitText: {color: '#C9956C', fontWeight: 'bold'},
  sectionTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12},
  description: {color: '#A09080', lineHeight: 24, marginBottom: 24, fontSize: 15},
  actionRow: {flexDirection: 'row', gap: 12, marginBottom: 24},
  watchBtn: {flex: 1, backgroundColor: '#C9956C', borderRadius: 14, padding: 16, alignItems: 'center'},
  watchBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 16},
  shareBtn: {
    backgroundColor: '#1C1C1C', borderRadius: 14, paddingHorizontal: 20,
    justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A2A',
  },
  shareBtnText: {color: '#FFFFFF', fontWeight: '600'},
  engagementRow: {
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: 30,
    backgroundColor: '#1C1C1C', borderRadius: 14, paddingVertical: 16,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  engagementText: {color: '#FFFFFF', fontSize: 18, fontWeight: '600'},
  commentInputRow: {flexDirection: 'row', marginBottom: 20, gap: 10},
  commentInput: {
    flex: 1, backgroundColor: '#1C1C1C', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, color: '#FFFFFF',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  sendBtn: {
    backgroundColor: '#C9956C', borderRadius: 14,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  sendBtnText: {color: '#FFFFFF', fontWeight: 'bold'},
  emptyText: {color: '#A09080', textAlign: 'center', marginTop: 10},
  commentCard: {
    backgroundColor: '#1C1C1C', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A',
  },
  commentName: {color: '#C9956C', fontWeight: 'bold', marginBottom: 6},
  commentText: {color: '#FFFFFF', lineHeight: 22},
});