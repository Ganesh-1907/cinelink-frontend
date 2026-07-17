import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, StatusBar} from 'react-native';
import {getChats} from '../src/services/dataService';

export default function ChatListScreen({navigation}: any) {
  const [chats, setChats] = useState<any[]>([]); const [loading, setLoading] = useState(true);

  useEffect(() => {(async () => {try {const r=await getChats(); setChats(r.chats||[]);} catch{} finally{setLoading(false);}})();}, []);

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <FlatList data={chats} keyExtractor={i=>i._id||i.id} contentContainerStyle={{padding:16}}
        ListHeaderComponent={<Text style={{fontSize:24,fontWeight:'bold',color:'#FFF',marginBottom:16}}>💬 Messages</Text>}
        ListEmptyComponent={loading?<ActivityIndicator color="#C9956C" />:<Text style={{color:'#A09080',textAlign:'center',marginTop:40}}>No conversations yet.</Text>}
        renderItem={({item}) => (
          <TouchableOpacity onPress={()=>navigation.navigate('ChatScreen',{chat:item})}
            style={{backgroundColor:'#1C1C1C', borderRadius:12, padding:14, marginBottom:8, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#2A2A2A'}}>
            <View style={{width:48,height:48,borderRadius:24,backgroundColor:'#C9956C',justifyContent:'center',alignItems:'center',marginRight:12}}>
              <Text style={{color:'#FFF',fontSize:20}}>{(item.participantNames?.[0]||'U').charAt(0)}</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={{color:'#FFF',fontWeight:'600'}}>{item.participantNames?.[0]||'Chat'}</Text>
              <Text style={{color:'#A09080',fontSize:13, marginTop:2}}>{item.lastMessage||'Start chatting...'}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
