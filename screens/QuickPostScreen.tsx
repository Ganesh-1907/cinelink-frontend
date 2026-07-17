import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Image, Alert, SafeAreaView} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {createAudition} from '../src/services/dataService';
import {uploadImage} from '../src/services/uploadService';

export default function QuickPostScreen({navigation}: any) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [poster, setPoster] = useState<any>(null); const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(''); const [location, setLocation] = useState('');

  const pickPoster = async () => {
    const r = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (r.assets?.[0]) setPoster(r.assets[0]);
  };

  const handlePost = async () => {
    if (!title.trim()) {Alert.alert('Required', 'Title is required.'); return;}
    setLoading(true);
    try {
      let posterUrl = '';
      if (poster?.uri) posterUrl = (await uploadImage(poster.uri)).secureUrl;
      await createAudition({title: title.trim(), description: description.trim(), role, location, posterUrl});
      Alert.alert('Posted!', 'Audition posted successfully.');
      navigation.goBack();
    } catch (e: any) {Alert.alert('Error', e.message);}
    finally {setLoading(false);}
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{padding: 20}}>
        <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:20}}>⚡ Quick Post Audition</Text>
        <TouchableOpacity onPress={pickPoster} style={{backgroundColor:'#1C1C1C', borderRadius:12, height:160, justifyContent:'center', alignItems:'center', marginBottom:16, borderWidth:1, borderColor:'#2A2A2A'}}>
          {poster ? <Image source={{uri: poster.uri}} style={{width:'100%', height:160, borderRadius:12}} /> : <Text style={{color:'#6B5D52', fontSize:15}}>📸 Tap to add poster</Text>}
        </TouchableOpacity>
        <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={{backgroundColor:'#141414', color:'#FFF', borderRadius:12, padding:16, marginBottom:12, borderWidth:1, borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Role" value={role} onChangeText={setRole} style={{backgroundColor:'#141414', color:'#FFF', borderRadius:12, padding:16, marginBottom:12, borderWidth:1, borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Location" value={location} onChangeText={setLocation} style={{backgroundColor:'#141414', color:'#FFF', borderRadius:12, padding:16, marginBottom:12, borderWidth:1, borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Description" value={description} onChangeText={setDescription} multiline style={{backgroundColor:'#141414', color:'#FFF', borderRadius:12, padding:16, marginBottom:20, minHeight:100, borderWidth:1, borderColor:'#2A2A2A'}} />
        <TouchableOpacity onPress={handlePost} disabled={loading} style={{backgroundColor:'#C9956C', paddingVertical:16, borderRadius:12, alignItems:'center', opacity:loading?0.6:1}}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF', fontSize:16, fontWeight:'bold'}}>Post Audition</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
