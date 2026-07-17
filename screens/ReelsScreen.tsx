import React, {useEffect, useState, useRef, useCallback} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions, Image, StatusBar, Platform, Share, Modal, TextInput, Alert, KeyboardAvoidingView} from 'react-native';
import Video from 'react-native-video';
import {useFocusEffect} from '@react-navigation/native';
import {getReels, likeReel} from '../src/services/dataService';
import {getToken} from '../src/services/storageService';
import api from '../src/api/client';

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');
const STATUS_BAR_HEIGHT = StatusBar.currentHeight ?? 24;

export default function ReelsScreen({navigation}: any) {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pausedMap, setPausedMap] = useState<{[key: string]: boolean}>({});
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [commentVisible, setCommentVisible] = useState(false);
  const [selectedReel, setSelectedReel] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(useCallback(() => { setIsScreenFocused(true); return () => setIsScreenFocused(false); }, []));

  useEffect(() => {
    (async () => {
      try { const r = await getReels(); setReels(r.reels || []); }
      catch {} finally { setLoading(false); }
    })();
  }, []);

  const toggleLike = async (reelId: string) => {
    const isLiked = likedReels.has(reelId);
    try {
      const r = await likeReel(reelId);
      const updated = new Set(likedReels);
      isLiked ? updated.delete(reelId) : updated.add(reelId);
      setLikedReels(updated);
    } catch {}
  };

  const openComments = async (reel: any) => {
    setSelectedReel(reel);
    setCommentVisible(true);
    try {
      const snap = await api.get(`/reels/${reel._id || reel.id}/comments`);
      setComments(snap.comments || []);
    } catch { setComments([]); }
  };

  const postComment = async () => {
    if (!commentText.trim() || !selectedReel) return;
    setPostingComment(true);
    try {
      await api.post(`/reels/${selectedReel._id || selectedReel.id}/comment`, { text: commentText.trim() });
      setCommentText('');
      setComments(prev => [{id:'new', text: commentText.trim(), userName: 'You'}, ...prev]);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setPostingComment(false); }
  };

  const shareReel = async (reel: any) => {
    try {
      await Share.share({ message: `🎬 Check out this CineReel!\n${reel.caption || ''}`, url: reel.videoUrl || '' });
    } catch {}
  };

  const viewabilityConfig = useRef({itemVisiblePercentThreshold: 60}).current;
  const onViewableItemsChanged = useCallback(({viewableItems}: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  }, []);

  const renderReel = ({item, index}: any) => {
    const isLiked = likedReels.has(item._id || item.id);
    const isActive = index === currentIndex;
    const isPaused = pausedMap[item._id || item.id] ?? false;
    const shouldPlay = isScreenFocused && isActive && !isPaused;

    return (
      <View style={[styles.reelContainer, {height: SCREEN_HEIGHT}]}>
        <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={() => setPausedMap(p => ({...p, [item._id || item.id]: !p[item._id || item.id]}))}>
          <Video source={{uri: item.videoUrl}} style={StyleSheet.absoluteFill} resizeMode="cover" paused={!shouldPlay} repeat muted={false} ignoreSilentSwitch="ignore" />
        </TouchableOpacity>
        <View pointerEvents="none" style={styles.gradientBottom} />
        <View style={styles.bottomContent} pointerEvents="box-none">
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item._id || item.id)}>
              <Text style={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</Text>
              <Text style={styles.actionCount}>{item.likes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionCount}>{item.commentsCount || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => shareReel(item)}>
              <Text style={styles.actionIcon}>↗️</Text>
              <Text style={styles.actionCount}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <View style={{flex:1, backgroundColor:'#000', justifyContent:'center', alignItems:'center'}}><ActivityIndicator size="large" color="#C9956C" /></View>;

  return (
    <View style={{flex:1, backgroundColor:'#000'}}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <FlatList ref={flatListRef} data={reels} keyExtractor={i => i._id || i.id} renderItem={renderReel}
        pagingEnabled snapToInterval={SCREEN_HEIGHT} snapToAlignment="start" decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={viewabilityConfig} />
      
      <Modal visible={commentVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
          <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.7)'}}>
            <View style={{flex:1, marginTop:100, backgroundColor:'#0A0A0A', borderTopLeftRadius:20, borderTopRightRadius:20}}>
              <View style={{flexDirection:'row', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:'#2A2A2A'}}>
                <Text style={{color:'#FFF', fontSize:18, fontWeight:'bold'}}>💬 Comments</Text>
                <TouchableOpacity onPress={() => setCommentVisible(false)}><Text style={{color:'#C9956C', fontSize:16}}>Close</Text></TouchableOpacity>
              </View>
              <FlatList data={comments} keyExtractor={i => i.id} style={{flex:1}}
                ListEmptyComponent={<Text style={{color:'#A09080', textAlign:'center', marginTop:40}}>No comments</Text>}
                renderItem={({item}) => (
                  <View style={{padding:12, flexDirection:'row', gap:10, borderBottomWidth:1, borderBottomColor:'#1C1C1C'}}>
                    <View style={{width:32,height:32,borderRadius:16,backgroundColor:'#C9956C',justifyContent:'center',alignItems:'center'}}>
                      <Text style={{color:'#FFF',fontWeight:'bold'}}>{(item.userName || 'U').charAt(0)}</Text>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={{color:'#C9956C',fontSize:13,fontWeight:'600'}}>{item.userName || 'User'}</Text>
                      <Text style={{color:'#FFF',fontSize:14,marginTop:2}}>{item.text}</Text>
                    </View>
                  </View>
                )}
              />
              <View style={{flexDirection:'row', padding:12, borderTopWidth:1, borderTopColor:'#2A2A2A', gap:8}}>
                <TextInput value={commentText} onChangeText={setCommentText} placeholder="Write a comment..." placeholderTextColor="#6B5D52"
                  style={{flex:1, backgroundColor:'#1C1C1C', color:'#FFF', borderRadius:20, paddingHorizontal:16, paddingVertical:10}} />
                <TouchableOpacity onPress={postComment} disabled={postingComment || !commentText.trim()}
                  style={{backgroundColor:commentText.trim()?'#C9956C':'#2A2A2A', borderRadius:20, paddingHorizontal:20, justifyContent:'center'}}>
                  <Text style={{color:'#FFF', fontWeight:'bold'}}>{postingComment ? '...' : 'Post'}</Text>
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
  reelContainer: { width: SCREEN_WIDTH, backgroundColor: '#000' },
  gradientBottom: { position:'absolute', bottom:0, left:0, right:0, height:200, backgroundColor:'rgba(0,0,0,0.5)' },
  bottomContent: { position:'absolute', bottom:40, right:16 },
  actions: { alignItems:'center', gap:20 },
  actionBtn: { alignItems:'center' },
  actionIcon: { fontSize:28 },
  actionCount: { color:'#FFF', fontSize:12, marginTop:2 },
});
