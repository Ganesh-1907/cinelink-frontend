import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar} from 'react-native';
import {getNotifications, markNotificationRead} from '../src/services/dataService';

export default function NotificationsScreen({navigation}: any) {
  const [notifications, setNotifications] = useState<any[]>([]); const [loading, setLoading] = useState(true);

  useEffect(() => {(async () => {try {const r=await getNotifications(); setNotifications(r.notifications||[]);} catch{} finally{setLoading(false);}})();}, []);

  const handlePress = async (item: any) => {
    await markNotificationRead(item._id||item.id).catch(()=>{});
    if (item.chatId) navigation.navigate('ChatScreen', {chat: {id: item.chatId}});
    else if (item.senderId) navigation.navigate('PublicProfile', {userId: item.senderId});
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <FlatList data={notifications} keyExtractor={i=>i._id||i.id} contentContainerStyle={{padding:16}}
        ListHeaderComponent={<Text style={{fontSize:24,fontWeight:'bold',color:'#FFF',marginBottom:16}}>🔔 Notifications</Text>}
        ListEmptyComponent={loading?<ActivityIndicator color="#C9956C" />:<Text style={{color:'#A09080',textAlign:'center',marginTop:40}}>No notifications yet.</Text>}
        renderItem={({item}) => (
          <TouchableOpacity onPress={()=>handlePress(item)}
            style={{backgroundColor:'#1C1C1C', borderRadius:12, padding:14, marginBottom:8, flexDirection:'row', gap:12, alignItems:'center', borderWidth:1, borderColor:item.read?'#1C1C1C':'#C9956C'}}>
            <Text style={{fontSize:24}}>🔔</Text>
            <View style={{flex:1}}>
              <Text style={{color:'#FFF',fontWeight:'600'}}>{item.title}</Text>
              <Text style={{color:'#A09080',fontSize:13}}>{item.message}</Text>
            </View>
            {!item.read ? <View style={{width:10,height:10,borderRadius:5,backgroundColor:'#C9956C'}} /> : null}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
