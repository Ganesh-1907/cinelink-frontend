import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, SafeAreaView} from 'react-native';
import {getSuggestedUsers, followUser} from '../src/services/dataService';

export default function SuggestedFollowsScreen({navigation, route}: any) {
  const [users, setUsers] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {(async () => {try {const r=await getSuggestedUsers(); setUsers(r.users||[]);} catch{} finally{setLoading(false);}})();}, []);

  const toggleFollow = async (userId: string) => {
    try { await followUser(userId); setFollowing(prev => {const n=new Set(prev); n.has(userId)?n.delete(userId):n.add(userId); return n;}); }
    catch {}
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <View style={{padding:20}}>
        <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:8}}>🤝 Follow Creators</Text>
        <Text style={{color:'#A09080', fontSize:14, marginBottom:20}}>Follow industry professionals to discover their work.</Text>
      </View>
      <FlatList data={users} keyExtractor={i=>i._id||i.id} contentContainerStyle={{paddingHorizontal:16}}
        ListEmptyComponent={loading ? <ActivityIndicator color="#C9956C" /> : <Text style={{color:'#A09080', textAlign:'center'}}>No suggestions.</Text>}
        renderItem={({item}) => (
          <View style={{flexDirection:'row', alignItems:'center', backgroundColor:'#1C1C1C', padding:14, borderRadius:12, marginBottom:8, borderWidth:1, borderColor:'#2A2A2A'}}>
            <View style={{width:44, height:44, borderRadius:22, backgroundColor:'#C9956C', justifyContent:'center', alignItems:'center', marginRight:12}}>
              {item.photoUrl ? <Image source={{uri:item.photoUrl}} style={{width:44,height:44,borderRadius:22}} /> : <Text style={{color:'#FFF',fontSize:18,fontWeight:'bold'}}>{(item.fullName||'U').charAt(0)}</Text>}
            </View>
            <View style={{flex:1}}><Text style={{color:'#FFF', fontWeight:'600'}}>{item.fullName || item.displayName || 'Creator'}</Text><Text style={{color:'#A09080', fontSize:12}}>{item.role || 'Actor'}</Text></View>
            <TouchableOpacity onPress={()=>toggleFollow(item._id||item.id)} style={{paddingVertical:8, paddingHorizontal:20, borderRadius:20, backgroundColor:following.has(item._id||item.id)?'#1C1C1C':'#C9956C', borderWidth:1, borderColor:following.has(item._id||item.id)?'#2A2A2A':'#C9956C'}}>
              <Text style={{color:following.has(item._id||item.id)?'#A09080':'#FFF', fontSize:13, fontWeight:'600'}}>{following.has(item._id||item.id)?'Following':'Follow'}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
