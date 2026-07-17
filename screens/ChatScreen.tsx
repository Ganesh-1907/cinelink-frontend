import React, {useState, useEffect, useRef} from 'react';
import {View, Text, FlatList, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {getMessages, sendMessage, deleteMessage} from '../src/services/dataService';
import {uploadImage} from '../src/services/uploadService';
import api from '../src/api/client';

export default function ChatScreen({route, navigation}: any) {
  const chat = route?.params?.chat;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!chat?.id) { navigation.goBack(); return; }
    loadMessages();
  }, [chat?.id]);

  const loadMessages = async () => {
    try { const r = await getMessages(chat.id); setMessages(r.messages || []); }
    catch {} finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await sendMessage(chat.id, text.trim());
      setMessages(prev => [...prev, {_id: r.messageId, text: text.trim(), type: 'text', createdAt: new Date().toISOString()}]);
      setText('');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSending(false); }
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.7});
    if (result.assets?.[0]?.uri) {
      try {
        const img = await uploadImage(result.assets[0].uri);
        const r = await api.post(`/chat/${chat.id}/messages`, {type: 'image', imageUrl: img.secureUrl});
        loadMessages();
      } catch (e: any) { Alert.alert('Error', e.message); }
    }
  };

  if (loading) return <View style={{flex:1, backgroundColor:'#0A0A0A', justifyContent:'center', alignItems:'center'}}><ActivityIndicator color="#C9956C" /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <FlatList ref={flatRef} data={messages} keyExtractor={i=>i._id||i.id} style={{flex:1}} contentContainerStyle={{padding:16}}
        inverted={false}
        ListEmptyComponent={<Text style={{color:'#A09080', textAlign:'center', marginTop:40}}>No messages yet. Say hello!</Text>}
        renderItem={({item}) => (
          <View style={{maxWidth:'80%', padding:12, borderRadius:16, marginBottom:8, backgroundColor: '#1C1C1C', alignSelf: 'flex-start'}}>
            {item.type === 'image' && item.imageUrl ? (
              <Image source={{uri: item.imageUrl}} style={{width:200, height:200, borderRadius:12}} />
            ) : (
              <Text style={{color: '#FFF', fontSize:15}}>{item.text}</Text>
            )}
          </View>
        )}
      />
      <View style={{flexDirection:'row', padding:12, borderTopWidth:1, borderTopColor:'#2A2A2A', gap:8, alignItems:'center'}}>
        <TouchableOpacity onPress={pickImage}><Text style={{fontSize:24}}>📷</Text></TouchableOpacity>
        <TextInput value={text} onChangeText={setText} placeholder="Type a message..." placeholderTextColor="#6B5D52"
          style={{flex:1, backgroundColor:'#1C1C1C', color:'#FFF', borderRadius:20, paddingHorizontal:16, paddingVertical:10}} />
        <TouchableOpacity onPress={handleSend} disabled={sending || !text.trim()}
          style={{backgroundColor: text.trim() ? '#C9956C' : '#2A2A2A', width:40, height:40, borderRadius:20, justifyContent:'center', alignItems:'center'}}>
          <Text style={{color:'#FFF', fontSize:18}}>{sending ? '...' : '➤'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
