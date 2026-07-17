import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, SafeAreaView} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {createFilm} from '../src/services/dataService';
import {uploadImage, uploadVideo} from '../src/services/uploadService';

const GENRES = ['Drama','Action','Romance','Comedy','Thriller','Sci-Fi','Horror','Documentary'];

export default function UploadFilmScreen({navigation}: any) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Drama'); const [duration, setDuration] = useState('');
  const [videoLink, setVideoLink] = useState(''); const [posterUri, setPosterUri] = useState<string|null>(null);
  const [posterUrl, setPosterUrl] = useState<string|null>(null); const [loading, setLoading] = useState(false);

  const pickPoster = async () => {
    const r = await launchImageLibrary({mediaType:'photo',quality:0.8});
    if (r.assets?.[0]) {setPosterUri(r.assets[0].uri!); setLoading(true); try {const res=await uploadImage(r.assets[0].uri!); setPosterUrl(res.secureUrl);} catch{} finally{setLoading(false);}}
  };

  const upload = async () => {
    if (!title.trim() || !duration.trim()) {Alert.alert('Required', 'Title and Duration required.'); return;}
    setLoading(true);
    try {
      await createFilm({title: title.trim(), description: description.trim(), genre, duration: duration.trim(), videoLink: videoLink.trim(), posterUrl});
      Alert.alert('Uploaded!', 'Your film has been uploaded.'); navigation.goBack();
    } catch (e: any) {Alert.alert('Error', e.message);}
    finally {setLoading(false);}
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <ScrollView contentContainerStyle={{padding:20}}>
        <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:20}}>🎥 Upload Short Film</Text>
        <TouchableOpacity onPress={pickPoster} style={{backgroundColor:'#1C1C1C', borderRadius:12, height:160, justifyContent:'center', alignItems:'center', marginBottom:12, borderWidth:1, borderColor:'#2A2A2A'}}>
          {posterUrl ? <Image source={{uri:posterUrl}} style={{width:'100%',height:160,borderRadius:12}} /> : <Text style={{color:'#6B5D52'}}>📸 Tap for poster</Text>}
        </TouchableOpacity>
        <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Description" value={description} onChangeText={setDescription} multiline style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,minHeight:80,borderWidth:1,borderColor:'#2A2A2A'}} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
          {GENRES.map(g => <TouchableOpacity key={g} onPress={()=>setGenre(g)} style={{paddingVertical:8,paddingHorizontal:16,borderRadius:20,backgroundColor:genre===g?'#C9956C':'#1C1C1C',marginRight:8}}><Text style={{color:genre===g?'#FFF':'#A09080'}}>{g}</Text></TouchableOpacity>)}
        </ScrollView>
        <TextInput placeholder="Duration (e.g. 15:30)" value={duration} onChangeText={setDuration} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Video Link (YouTube/Vimeo URL)" value={videoLink} onChangeText={setVideoLink} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:20,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TouchableOpacity onPress={upload} disabled={loading} style={{backgroundColor:'#C9956C',paddingVertical:16,borderRadius:12,alignItems:'center',opacity:loading?0.6:1}}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF',fontSize:16,fontWeight:'bold'}}>Upload Film</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
