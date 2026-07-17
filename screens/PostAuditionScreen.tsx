import React, {useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,StyleSheet,ScrollView,SafeAreaView,StatusBar,ActivityIndicator,Image,Alert,Modal} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {createAudition} from '../src/services/dataService';
import {uploadImage} from '../src/services/uploadService';

const ROLES = ['Hero','Heroine','Villain','Supporting','Child Artist','Comedian','Any Role'];
const CATEGORIES = ['Movies','Short Films','Theatre','YouTube / Web','TV / OTT'];

export default function PostAuditionScreen({navigation}: any) {
  const [title,setTitle]=useState(''); const [description,setDescription]=useState(''); const [location,setLocation]=useState('');
  const [role,setRole]=useState(''); const [gender,setGender]=useState('Any'); const [lastDate,setLastDate]=useState('');
  const [language,setLanguage]=useState(''); const [category,setCategory]=useState('Movies');
  const [poster,setPoster]=useState<any>(null); const [posterUrl,setPosterUrl]=useState('');
  const [loading,setLoading]=useState(false); const [uploading,setUploading]=useState(false);

  const uploadPoster = async (uri: string) => {
    setUploading(true);
    try { const r = await uploadImage(uri); setPosterUrl(r.secureUrl); return r.secureUrl; }
    catch {Alert.alert('Upload failed'); setPoster(null); return ''; }
    finally {setUploading(false);}
  };

  const handlePost = async () => {
    if (!title.trim()) {Alert.alert('Required','Title required.'); return;}
    setLoading(true);
    try {
      let url = posterUrl;
      if (poster?.uri && !posterUrl) url = await uploadPoster(poster.uri);
      await createAudition({title:title.trim(),description:description.trim(),location,role,gender,lastDate,language,category,posterUrl:url});
      Alert.alert('Posted!','Audition posted.'); navigation.goBack();
    } catch (e:any) {Alert.alert('Error',e.message);}
    finally {setLoading(false);}
  };

  return (
    <SafeAreaView style={{flex:1,backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{padding:20}}>
        <Text style={{fontSize:24,fontWeight:'bold',color:'#FFF',marginBottom:20}}>🎬 Post Audition</Text>
        <TouchableOpacity onPress={async()=>{const r=await launchImageLibrary({mediaType:'photo',quality:0.8}); if(r.assets?.[0]){setPoster(r.assets[0]);}}}
          style={{backgroundColor:'#1C1C1C',borderRadius:12,height:160,justifyContent:'center',alignItems:'center',marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}}>
          {poster ? <Image source={{uri:poster.uri}} style={{width:'100%',height:160,borderRadius:12}} /> : <Text style={{color:'#6B5D52'}}>📸 Add Poster</Text>}
        </TouchableOpacity>
        <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Description" value={description} onChangeText={setDescription} multiline style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,minHeight:80,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Location" value={location} onChangeText={setLocation} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
          {ROLES.map(r => <TouchableOpacity key={r} onPress={()=>setRole(r)} style={{paddingVertical:8,paddingHorizontal:16,borderRadius:20,backgroundColor:role===r?'#C9956C':'#1C1C1C',marginRight:8}}><Text style={{color:role===r?'#FFF':'#A09080',fontSize:13}}>{r}</Text></TouchableOpacity>)}
        </ScrollView>
        <View style={{flexDirection:'row',gap:12,marginBottom:12}}>
          {['Male','Female','Any'].map(g => <TouchableOpacity key={g} onPress={()=>setGender(g)} style={{flex:1,paddingVertical:12,borderRadius:12,alignItems:'center',backgroundColor:gender===g?'#C9956C':'#1C1C1C'}}><Text style={{color:gender===g?'#FFF':'#A09080'}}>{g}</Text></TouchableOpacity>)}
        </View>
        <TextInput placeholder="Last Date (e.g. 25 Dec)" value={lastDate} onChangeText={setLastDate} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Language" value={language} onChangeText={setLanguage} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:20,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TouchableOpacity onPress={handlePost} disabled={loading} style={{backgroundColor:'#C9956C',paddingVertical:16,borderRadius:12,alignItems:'center',opacity:loading?0.6:1}}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF',fontSize:16,fontWeight:'bold'}}>Post Audition</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
