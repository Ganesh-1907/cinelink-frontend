import React, {useState} from 'react';
import {View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView, StatusBar} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {createReel} from '../src/services/dataService';
import {uploadVideo} from '../src/services/uploadService';

export default function UploadReelsScreen({navigation}: any) {
  const [videoUri, setVideoUri] = useState<string|null>(null); const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false); const [uploading, setUploading] = useState(false);

  const pickVideo = async () => {
    const r = await launchImageLibrary({mediaType:'video', videoQuality:'medium'});
    if (r.assets?.[0]) setVideoUri(r.assets[0].uri!);
  };

  const upload = async () => {
    if (!videoUri) {Alert.alert('Select','Pick a video first.'); return;}
    setLoading(true); setUploading(true);
    try {
      const result = await uploadVideo(videoUri);
      await createReel({videoUrl: result.secureUrl, caption: caption.trim()});
      Alert.alert('Uploaded!', 'Reel uploaded successfully.'); navigation.goBack();
    } catch (e: any) {Alert.alert('Error', e.message);}
    finally {setLoading(false); setUploading(false);}
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <View style={{padding:20}}>
        <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:20}}>🎬 Upload Reel</Text>
        <TouchableOpacity onPress={pickVideo} style={{backgroundColor:'#1C1C1C', borderRadius:12, height:200, justifyContent:'center', alignItems:'center', marginBottom:16, borderWidth:1, borderColor:'#2A2A2A'}}>
          {videoUri ? <Text style={{color:'#4ADE80', fontSize:16}}>✅ Video selected</Text> : <Text style={{color:'#6B5D52', fontSize:15}}>🎥 Tap to select video</Text>}
        </TouchableOpacity>
        <TextInput placeholder="Caption (optional)" value={caption} onChangeText={setCaption} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:20,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TouchableOpacity onPress={upload} disabled={loading} style={{backgroundColor:'#C9956C',paddingVertical:16,borderRadius:12,alignItems:'center',opacity:loading?0.6:1}}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF',fontSize:16,fontWeight:'bold'}}>Upload Reel</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
