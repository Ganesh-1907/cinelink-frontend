import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar} from 'react-native';
import {getContests} from '../src/services/dataService';

export default function MyContestsScreen({navigation}: any) {
  const [contests, setContests] = useState<any[]>([]); const [loading, setLoading] = useState(true);

  useEffect(() => {(async () => {try {const r=await getContests(); setContests(r.contests||[]);} catch{} finally {setLoading(false);}})();}, []);

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <FlatList data={contests} keyExtractor={i=>i._id||i.id} contentContainerStyle={{padding:20}}
        ListHeaderComponent={<Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:20}}>🏆 My Contests</Text>}
        ListEmptyComponent={loading ? <ActivityIndicator color="#C9956C" /> : <Text style={{color:'#A09080', textAlign:'center', marginTop:40}}>No contests.</Text>}
        renderItem={({item}) => (
          <TouchableOpacity onPress={()=>navigation.navigate('ContestDetail',{contest:item})}
            style={{backgroundColor:'#1C1C1C', borderRadius:16, padding:16, marginBottom:12, borderWidth:1, borderColor:'#2A2A2A'}}>
            <Text style={{color:'#FFF', fontSize:16, fontWeight:'bold'}}>{item.title}</Text>
            <Text style={{color:'#A09080', fontSize:13, marginTop:4}}>🏆 {item.prize || 'No prize'} · {item.entriesCount||0} entries</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
