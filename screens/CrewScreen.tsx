import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, Image, SafeAreaView, StatusBar} from 'react-native';
import {searchCrew} from '../src/services/dataService';

export default function CrewScreen({navigation}: any) {
  const [users, setUsers] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(''); const [role, setRole] = useState('All');

  useEffect(() => {(async () => {try {const r=await searchCrew(); setUsers(r.users||[]);} catch{} finally{setLoading(false);}})();}, []);

  const doSearch = async (q?: string, r?: string) => {
    setLoading(true);
    try { const res = await searchCrew(q||query, r||role); setUsers(res.users||[]); }
    catch {} finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <View style={{padding:16}}>
        <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:4}}>🎥 Crew</Text>
        <Text style={{color:'#A09080', fontSize:14, marginBottom:12}}>Find and connect with industry professionals</Text>
        <TextInput placeholder="Search by name, role, or location..." value={query} onChangeText={v=>{setQuery(v);doSearch(v,role)}}
          placeholderTextColor="#6B5D52" style={{backgroundColor:'#1C1C1C', color:'#FFF', borderRadius:12, padding:12, borderWidth:1, borderColor:'#2A2A2A', marginBottom:12}} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
          {['All','Actor','Director','Writer','Editor','DOP','Producer','Crew'].map(r => (
            <TouchableOpacity key={r} onPress={()=>{setRole(r);doSearch(query,r)}} style={{paddingVertical:6,paddingHorizontal:16,borderRadius:20,backgroundColor:role===r?'#C9956C':'#1C1C1C',marginRight:8}}>
              <Text style={{color:role===r?'#FFF':'#A09080',fontSize:13}}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList data={users} keyExtractor={i=>i._id||i.id} contentContainerStyle={{paddingHorizontal:16}}
        ListEmptyComponent={loading?<ActivityIndicator color="#C9956C" />:<Text style={{color:'#A09080',textAlign:'center',marginTop:20}}>No users found.</Text>}
        renderItem={({item}) => (
          <TouchableOpacity onPress={()=>navigation.navigate('PublicProfile',{userId:item._id||item.id})}
            style={{flexDirection:'row', alignItems:'center', backgroundColor:'#1C1C1C', padding:14, borderRadius:12, marginBottom:8, borderWidth:1, borderColor:'#2A2A2A'}}>
            <View style={{width:44,height:44,borderRadius:22,backgroundColor:'#C9956C',justifyContent:'center',alignItems:'center',marginRight:12}}>
              {item.photoUrl ? <Image source={{uri:item.photoUrl}} style={{width:44,height:44,borderRadius:22}} /> : <Text style={{color:'#FFF',fontSize:18}}>{(item.fullName||'U').charAt(0)}</Text>}
            </View>
            <View style={{flex:1}}>
              <Text style={{color:'#FFF',fontWeight:'600'}}>{item.fullName||item.displayName||'Creator'}</Text>
              <Text style={{color:'#A09080',fontSize:12}}>{item.role||'Actor'} {item.location ? `· ${item.location}` : ''}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
