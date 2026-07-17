import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Image, Linking, Alert, Share, Dimensions} from 'react-native';
import ImageViewer from 'react-native-image-viewing';
import {getUser, followUser} from '../src/services/dataService';

const SCREEN_W = Dimensions.get('window').width;

export default function PublicProfileScreen({route, navigation}: any) {
  const userId = route?.params?.userId;
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState<{uri:string}[]>([]);

  useEffect(() => { if (!userId) { navigation.goBack(); return; } loadUser(); }, [userId]);

  const loadUser = async () => {
    try { const r = await getUser(userId); setUserData(r.user); }
    catch { Alert.alert('Error', 'User not found.'); navigation.goBack(); }
    finally { setLoading(false); }
  };

  const toggleFollow = async () => {
    try { await followUser(userId); setFollowing(!following); }
    catch {}
  };

  const openImageViewer = (images: string[], index: number) => {
    setViewerImages(images.map(u=>({uri: u})));
    setViewerIndex(index);
    setViewerVisible(true);
  };

  if (loading) return <View style={{flex:1, backgroundColor:'#0A0A0A', justifyContent:'center', alignItems:'center'}}><ActivityIndicator color="#C9956C" /></View>;
  if (!userData) return null;

  const u = userData;
  const photos = u.portfolioPhotos || [];
  const media = u.portfolioMedia || [];
  const allImages = [...photos, ...media];

  return (
    <ScrollView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <View style={{alignItems:'center', padding: 20}}>
        <View style={{width:100, height:100, borderRadius:50, backgroundColor:'#1C1C1C', justifyContent:'center', alignItems:'center', marginBottom:12, borderWidth:2, borderColor:'#C9956C'}}>
          {u.photoUrl || u.photoURL ? <Image source={{uri: u.photoUrl || u.photoURL}} style={{width:100, height:100, borderRadius:50}} /> : <Text style={{fontSize:36}}>🎭</Text>}
        </View>
        <Text style={{fontSize:22, fontWeight:'bold', color:'#FFF'}}>{u.fullName || u.displayName || u.name || 'Creator'}</Text>
        <Text style={{color:'#C9956C', fontSize:15, marginTop:4}}>{u.role || 'Actor'}</Text>
        {u.location ? <Text style={{color:'#A09080', fontSize:13, marginTop:4}}>📍 {u.location}</Text> : null}
        {u.bio ? <Text style={{color:'#FFF', fontSize:14, marginTop:12, textAlign:'center', lineHeight:20, paddingHorizontal:20}}>{u.bio}</Text> : null}
        <TouchableOpacity onPress={toggleFollow} style={{marginTop:16, paddingVertical:10, paddingHorizontal:32, borderRadius:25, backgroundColor: following ? '#1C1C1C' : '#C9956C', borderWidth:1, borderColor: following ? '#2A2A2A' : '#C9956C'}}>
          <Text style={{color: following ? '#A09080' : '#FFF', fontSize:15, fontWeight:'600'}}>{following ? 'Following' : 'Follow'}</Text>
        </TouchableOpacity>
      </View>

      {photos.length > 0 ? (
        <View style={{padding: 16}}>
          <Text style={{color:'#C9956C', fontSize:16, fontWeight:'bold', marginBottom:12}}>📸 Portfolio</Text>
          <View style={{flexDirection:'row', flexWrap:'wrap', gap:2}}>
            {photos.map((url: string, i: number) => (
              <TouchableOpacity key={i} onPress={() => openImageViewer(photos, i)} style={{width: (SCREEN_W-4)/3, height: (SCREEN_W-4)/3}}>
                <Image source={{uri: url}} style={{width:'100%', height:'100%'}} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {u.introVideoLink ? (
        <TouchableOpacity onPress={() => Linking.openURL(u.introVideoLink)} style={{margin:16, padding:16, backgroundColor:'#1C1C1C', borderRadius:12, flexDirection:'row', alignItems:'center', gap:12, borderWidth:1, borderColor:'#2A2A2A'}}>
          <Text style={{fontSize:24}}>▶️</Text>
          <Text style={{color:'#FFF', fontSize:15, fontWeight:'600'}}>Watch Intro Video</Text>
        </TouchableOpacity>
      ) : null}

      <ImageViewer images={viewerImages} imageIndex={viewerIndex} visible={viewerVisible} onRequestClose={() => setViewerVisible(false)} />
    </ScrollView>
  );
}
