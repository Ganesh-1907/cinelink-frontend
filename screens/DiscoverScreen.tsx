import React, {useState, useRef, useCallback} from 'react';
import {View, Text, FlatList, Dimensions, TouchableOpacity, Image, StyleSheet, ActivityIndicator, SafeAreaView} from 'react-native';
import {getSuggestedUsers, followUser} from '../src/services/dataService';

const {height: SCREEN_H, width: SCREEN_W} = Dimensions.get('window');

export default function DiscoverScreen({navigation}: any) {
  const [users, setUsers] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  React.useEffect(() => {(async () => {try {const r=await getSuggestedUsers(); setUsers(r.users||[]);} catch{} finally{setLoading(false);}})();}, []);

  const toggleFollow = async (userId: string) => {
    try { await followUser(userId); setFollowed(p => {const n=new Set(p); n.has(userId)?n.delete(userId):n.add(userId); return n;}); }
    catch {}
  };

  const renderItem = ({item}: any) => (
    <View style={{width:SCREEN_W, height:SCREEN_H, backgroundColor:'#0A0A0A', justifyContent:'center', alignItems:'center'}}>
      <View style={{width:200, height:200, borderRadius:100, backgroundColor:'#1C1C1C', justifyContent:'center', alignItems:'center', marginBottom:20, borderWidth:3, borderColor:'#C9956C'}}>
        {item.photoUrl ? <Image source={{uri:item.photoUrl}} style={{width:200,height:200,borderRadius:100}} /> : <Text style={{fontSize:64}}>🎭</Text>}
      </View>
      <Text style={{color:'#FFF', fontSize:24, fontWeight:'bold'}}>{item.fullName || item.displayName || 'Creator'}</Text>
      <Text style={{color:'#C9956C', fontSize:16, marginTop:4}}>{item.role || 'Actor'}</Text>
      {item.bio ? <Text style={{color:'#A09080', fontSize:14, marginTop:8, paddingHorizontal:40, textAlign:'center'}}>{item.bio}</Text> : null}
      <TouchableOpacity onPress={() => toggleFollow(item._id || item.id)} style={{marginTop:20, paddingVertical:12, paddingHorizontal:40, borderRadius:25, backgroundColor: followed.has(item._id||item.id) ? '#1C1C1C' : '#C9956C', borderWidth:1, borderColor: followed.has(item._id||item.id) ? '#2A2A2A' : '#C9956C'}}>
        <Text style={{color: followed.has(item._id||item.id) ? '#A09080' : '#FFF', fontSize:16, fontWeight:'600'}}>{followed.has(item._id||item.id) ? 'Following' : 'Follow'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      {loading ? <ActivityIndicator color="#C9956C" style={{flex:1}} /> : (
        <FlatList data={users} renderItem={renderItem} keyExtractor={i=>i._id||i.id}
          pagingEnabled snapToInterval={SCREEN_H} decelerationRate="fast" showsVerticalScrollIndicator={false} />
      )}
    </SafeAreaView>
  );
}
