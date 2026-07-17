import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar} from 'react-native';
import {getCrewPosts} from '../src/services/dataService';

export default function CrewMarketplaceScreen({navigation}: any) {
  const [posts, setPosts] = useState<any[]>([]); const [loading, setLoading] = useState(true);

  useEffect(() => {(async () => {try {const r=await getCrewPosts(); setPosts(r.posts||[]);} catch{} finally{setLoading(false);}})();}, []);

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <FlatList data={posts} keyExtractor={i=>i._id||i.id} contentContainerStyle={{padding:20}}
        ListHeaderComponent={<><Text style={{fontSize:24,fontWeight:'bold',color:'#FFF',marginBottom:4}}>🎥 Crew Marketplace</Text><Text style={{color:'#A09080',fontSize:14,marginBottom:20}}>Find and hire crew members</Text></>}
        ListEmptyComponent={loading ? <ActivityIndicator color="#C9956C" /> : <Text style={{color:'#A09080',textAlign:'center',marginTop:40}}>No posts yet.</Text>}
        renderItem={({item}) => (
          <View style={{backgroundColor:'#1C1C1C', borderRadius:12, padding:16, marginBottom:12, borderWidth:1, borderColor:'#2A2A2A'}}>
            <Text style={{color:'#FFF', fontSize:16, fontWeight:'bold'}}>{item.title}</Text>
            {item.description ? <Text style={{color:'#A09080', fontSize:14, marginTop:4}}>{item.description}</Text> : null}
            {item.craft ? <Text style={{color:'#C9956C', fontSize:13, marginTop:4}}>{item.craft}</Text> : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
