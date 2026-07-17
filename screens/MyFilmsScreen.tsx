import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image, SafeAreaView, StatusBar} from 'react-native';
import {getFilms, deleteFilm} from '../src/services/dataService';
import {getToken} from '../src/services/storageService';

export default function MyFilmsScreen({navigation}: any) {
  const [films, setFilms] = useState<any[]>([]); const [loading, setLoading] = useState(true);

  useEffect(() => { loadFilms(); }, []);

  const loadFilms = async () => {
    try { const res = await getFilms(); setFilms(res.films || []); }
    catch {} finally { setLoading(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Delete this film?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteFilm(id); loadFilms(); }
        catch {Alert.alert('Error', 'Could not delete');}
      }},
    ]);
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <FlatList data={films} keyExtractor={i => i._id || i.id} contentContainerStyle={{padding:20}}
        ListHeaderComponent={<Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:20}}>🎥 My Films</Text>}
        ListEmptyComponent={loading ? <ActivityIndicator color="#C9956C" /> : <Text style={{color:'#A09080', textAlign:'center', marginTop:40}}>No films uploaded yet.</Text>}
        renderItem={({item}) => (
          <View style={{backgroundColor:'#1C1C1C', borderRadius:16, marginBottom:12, overflow:'hidden', borderWidth:1, borderColor:'#2A2A2A'}}>
            {item.posterUrl ? <Image source={{uri: item.posterUrl}} style={{width:'100%', height:160}} /> : null}
            <View style={{padding:14, flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
              <View style={{flex:1}}><Text style={{color:'#FFF', fontSize:16, fontWeight:'bold'}}>{item.title}</Text></View>
              <TouchableOpacity onPress={() => handleDelete(item._id || item.id)}><Text style={{color:'#EF4444', fontSize:20}}>🗑️</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
