import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Image, SafeAreaView, StatusBar} from 'react-native';
import {getAuditions} from '../src/services/dataService';

export default function BrowseAuditionsScreen({navigation}: any) {
  const [auditions, setAuditions] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {(async () => {try {const r=await getAuditions(); setAuditions(r.auditions||[]);} catch{} finally{setLoading(false);}})();}, []);

  const filtered = auditions.filter(a => !search || (a.title||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <View style={{padding:16}}>
        <TextInput placeholder="🔍 Search auditions..." value={search} onChangeText={setSearch} placeholderTextColor="#6B5D52"
          style={{backgroundColor:'#1C1C1C', color:'#FFF', borderRadius:12, padding:12, borderWidth:1, borderColor:'#2A2A2A', marginBottom:12}} />
      </View>
      <FlatList data={filtered} keyExtractor={i=>i._id||i.id} contentContainerStyle={{paddingHorizontal:16}}
        ListEmptyComponent={loading ? <ActivityIndicator color="#C9956C" style={{marginTop:40}} /> : <Text style={{color:'#A09080', textAlign:'center', marginTop:40}}>No auditions found.</Text>}
        renderItem={({item}) => (
          <TouchableOpacity onPress={()=>navigation.navigate('AuditionDetail',{audition:item})}
            style={{backgroundColor:'#1C1C1C', borderRadius:16, marginBottom:12, overflow:'hidden', borderWidth:1, borderColor:'#2A2A2A'}}>
            {item.posterUrl ? <Image source={{uri:item.posterUrl}} style={{width:'100%',height:140}} /> : null}
            <View style={{padding:14}}>
              <Text style={{color:'#FFF', fontSize:16, fontWeight:'bold'}}>{item.title}</Text>
              <Text style={{color:'#A09080', fontSize:13, marginTop:4}}>🎭 {item.role || 'Any role'} · 📍 {item.location || 'Anywhere'}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
