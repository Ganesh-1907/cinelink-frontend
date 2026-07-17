import React, {useState} from 'react';
import {View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Linking, SafeAreaView, StatusBar} from 'react-native';
import {likeFilm} from '../src/services/dataService';

export default function FilmDetailScreen({route, navigation}: any) {
  const {film} = route?.params || {};
  const [liked, setLiked] = useState(false); const [likes, setLikes] = useState(film?.likes || 0);

  const toggleLike = async () => {
    if (!film?._id && !film?.id) return;
    try { const r = await likeFilm(film._id || film.id); setLiked(r.liked); setLikes(r.likes); }
    catch {}
  };

  if (!film) return <SafeAreaView style={{flex:1,backgroundColor:'#0A0A0A',justifyContent:'center',alignItems:'center'}}><Text style={{color:'#A09080'}}>No film data</Text></SafeAreaView>;

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        {film.posterUrl ? <Image source={{uri:film.posterUrl}} style={{width:'100%',height:250}} /> : null}
        <View style={{padding:20}}>
          <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:8}}>{film.title}</Text>
          {film.genre ? <Text style={{color:'#C9956C', fontSize:14, marginBottom:4}}>{film.genre}</Text> : null}
          {film.duration ? <Text style={{color:'#A09080', fontSize:14, marginBottom:12}}>⏱ {film.duration}</Text> : null}
          {film.description ? <Text style={{color:'#FFF', fontSize:15, lineHeight:24, marginBottom:16}}>{film.description}</Text> : null}
          <View style={{flexDirection:'row', gap:16}}>
            <TouchableOpacity onPress={toggleLike} style={{paddingVertical:10, paddingHorizontal:20, borderRadius:12, backgroundColor:'#1C1C1C', borderWidth:1, borderColor:'#2A2A2A', flexDirection:'row', gap:6}}>
              <Text>{liked ? '❤️' : '🤍'}</Text><Text style={{color:'#FFF'}}>{likes}</Text>
            </TouchableOpacity>
            {film.videoLink ? <TouchableOpacity onPress={()=>Linking.openURL(film.videoLink)} style={{paddingVertical:10, paddingHorizontal:20, borderRadius:12, backgroundColor:'#C9956C', flexDirection:'row', gap:6}}>
              <Text>▶️</Text><Text style={{color:'#FFF', fontWeight:'600'}}>Watch</Text>
            </TouchableOpacity> : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
