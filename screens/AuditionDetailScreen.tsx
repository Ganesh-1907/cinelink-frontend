import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert, Image, Linking, TextInput} from 'react-native';
import {getAudition, likeAudition, commentOnAudition} from '../src/services/dataService';
import {startChat} from '../src/services/dataService';
import {getToken} from '../src/services/storageService';
import api from '../src/api/client';

export default function AuditionDetailScreen({route, navigation}: any) {
  const {audition: initial} = route?.params || {};
  const [audition, setAudition] = useState<any>(initial);
  const [loading, setLoading] = useState(!initial);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (initial?._id || initial?.id) loadAudition();
  }, []);

  const loadAudition = async () => {
    try { const r = await getAudition(initial?._id || initial?.id); setAudition(r.audition); }
    catch {} finally { setLoading(false); }
  };

  const toggleLike = async () => {
    if (!audition) return;
    try { const r = await likeAudition(audition._id || audition.id); setLiked(r.liked); }
    catch {}
  };

  const startChatWith = async () => {
    if (!audition?.directorId) { Alert.alert('Info', 'Cannot message the poster directly.'); return; }
    try { const r = await startChat(audition.directorId); navigation.navigate('ChatScreen', {chat: r.chat || {id: r.chatId}}); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const applyNow = async () => {
    Alert.alert('Apply', 'Your application has been submitted! (Feature coming soon)');
  };

  if (loading) return <View style={{flex:1, backgroundColor:'#0A0A0A', justifyContent:'center', alignItems:'center'}}><ActivityIndicator color="#C9956C" /></View>;
  if (!audition) return <View style={{flex:1, backgroundColor:'#0A0A0A', justifyContent:'center', alignItems:'center'}}><Text style={{color:'#A09080'}}>Audition not found.</Text></View>;

  return (
    <ScrollView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      {audition.posterUrl ? <Image source={{uri: audition.posterUrl}} style={{width:'100%', height:250}} resizeMode="cover" /> : null}
      <View style={{padding: 20}}>
        <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:8}}>{audition.title}</Text>
        <View style={{flexDirection:'row', gap:12, marginBottom:16, flexWrap:'wrap'}}>
          {audition.role ? <Text style={{color:'#C9956C', fontSize:14}}>🎭 {audition.role}</Text> : null}
          {audition.location ? <Text style={{color:'#A09080', fontSize:14}}>📍 {audition.location}</Text> : null}
          {audition.gender ? <Text style={{color:'#A09080', fontSize:14}}>{audition.gender === 'Male' ? '♂️' : audition.gender === 'Female' ? '♀️' : '⚧️'} {audition.gender}</Text> : null}
        </View>
        {audition.description ? <Text style={{color:'#FFF', fontSize:15, lineHeight:24, marginBottom:20}}>{audition.description}</Text> : null}
        <Text style={{color:'#A09080', fontSize:13, marginBottom:20}}>👁 {audition.views || 0} views · ❤️ {audition.likes || 0}</Text>

        <View style={{flexDirection:'row', gap:12, marginBottom:16}}>
          <TouchableOpacity onPress={toggleLike} style={{flex:1, paddingVertical:14, borderRadius:12, alignItems:'center', backgroundColor: liked ? 'rgba(201,149,108,0.15)' : '#1C1C1C', borderWidth:1, borderColor: liked ? '#C9956C' : '#2A2A2A'}}>
            <Text style={{color: liked ? '#C9956C' : '#FFF', fontSize:15, fontWeight:'600'}}>{liked ? '❤️ Liked' : '🤍 Like'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={startChatWith} style={{flex:1, paddingVertical:14, borderRadius:12, alignItems:'center', backgroundColor:'#1C1C1C', borderWidth:1, borderColor:'#2A2A2A'}}>
            <Text style={{color:'#FFF', fontSize:15, fontWeight:'600'}}>💬 Message</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={applyNow} style={{backgroundColor:'#C9956C', paddingVertical:16, borderRadius:12, alignItems:'center', marginBottom:24}}>
          <Text style={{color:'#FFF', fontSize:16, fontWeight:'bold'}}>📩 Apply Now</Text>
        </TouchableOpacity>

        {audition.lastDate ? <Text style={{color:'#EF4444', fontSize:13, textAlign:'center'}}>⏰ Apply before: {audition.lastDate}</Text> : null}
      </View>
    </ScrollView>
  );
}
