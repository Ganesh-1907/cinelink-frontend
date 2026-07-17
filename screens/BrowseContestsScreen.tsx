import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, SafeAreaView, StatusBar} from 'react-native';
import {getContests} from '../src/services/dataService';

export default function BrowseContestsScreen({navigation}: any) {
  const [contests, setContests] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {(async () => {try {const r=await getContests(); setContests(r.contests||[]);} catch{} finally{setLoading(false);}})();}, []);

  const filtered = contests.filter(c => !search || (c.title||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <View style={{padding:16}}>
        <TextInput placeholder="🔍 Search contests..." value={search} onChangeText={setSearch} placeholderTextColor="#6B5D52"
          style={{backgroundColor:'#1C1C1C', color:'#FFF', borderRadius:12, padding:12, borderWidth:1, borderColor:'#2A2A2A', marginBottom:12}} />
      </View>
      <FlatList data={filtered} keyExtractor={i=>i._id||i.id} contentContainerStyle={{paddingHorizontal:16}}
        ListEmptyComponent={loading ? <ActivityIndicator color="#C9956C" style={{marginTop:40}} /> : <Text style={{color:'#A09080', textAlign:'center', marginTop:40}}>No contests yet.</Text>}
        renderItem={({item}) => (
          <TouchableOpacity onPress={()=>navigation.navigate('ContestDetail',{contest:item})}
            style={{backgroundColor:'#1C1C1C', borderRadius:16, padding:16, marginBottom:12, borderWidth:1, borderColor:'#2A2A2A'}}>
            <Text style={{color:'#FFF', fontSize:17, fontWeight:'bold'}}>{item.title}</Text>
            <Text style={{color:'#A09080', fontSize:13, marginTop:4}}>🏆 {item.prize || 'No prize'} · 👥 {item.entriesCount||0} entries · {item.entryFee ? `₹${item.entryFee}` : 'Free'}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
