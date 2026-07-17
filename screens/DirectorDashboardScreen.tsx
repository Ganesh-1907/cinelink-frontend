import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, StatusBar} from 'react-native';
import {getAuditions} from '../src/services/dataService';
import api from '../src/api/client';

export default function DirectorDashboardScreen({navigation}: any) {
  const [auditions, setAuditions] = useState<any[]>([]); const [loading, setLoading] = useState(true);

  useEffect(() => {(async () => {try {const r=await getAuditions(); setAuditions(r.auditions?.filter((a:any)=>a.directorId)||[]);} catch{} finally{setLoading(false);}})();}, []);

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <FlatList data={auditions} keyExtractor={i=>i._id||i.id} contentContainerStyle={{padding:20}}
        ListHeaderComponent={<><Text style={{fontSize:24,fontWeight:'bold',color:'#FFF',marginBottom:4}}>📊 Director Dashboard</Text><Text style={{color:'#A09080',fontSize:14,marginBottom:20}}>Manage your auditions</Text></>}
        ListEmptyComponent={loading?<ActivityIndicator color="#C9956C" />:<Text style={{color:'#A09080',textAlign:'center',marginTop:20}}>No auditions posted.</Text>}
        renderItem={({item}) => (
          <View style={{backgroundColor:'#1C1C1C', borderRadius:12, padding:16, marginBottom:8, borderWidth:1, borderColor:'#2A2A2A'}}>
            <Text style={{color:'#FFF', fontWeight:'bold', fontSize:16}}>{item.title}</Text>
            <Text style={{color:'#A09080', fontSize:13, marginTop:4}}>👥 {item.applicationsCount||0} applications · 👁 {item.views||0} views</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
