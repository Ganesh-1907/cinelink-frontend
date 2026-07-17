import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, StatusBar} from 'react-native';
import {createProject} from '../src/services/dataService';

export default function CreateProjectScreen({navigation}: any) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [type, setType] = useState('Short Film'); const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {Alert.alert('Required', 'Title required.'); return;}
    setLoading(true);
    try { await createProject({title: title.trim(), description: description.trim(), type}); Alert.alert('Created','Project created!'); navigation.goBack(); }
    catch (e: any) {Alert.alert('Error', e.message);}
    finally {setLoading(false);}
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{padding:20}}>
        <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:20}}>🎬 Create Project</Text>
        <TextInput placeholder="Project Title" value={title} onChangeText={setTitle} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Description" value={description} onChangeText={setDescription} multiline style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,minHeight:100,borderWidth:1,borderColor:'#2A2A2A'}} />
        <View style={{flexDirection:'row', gap:8, marginBottom:20}}>
          {['Short Film','Feature Film','Web Series','Documentary'].map(t => (
            <TouchableOpacity key={t} onPress={()=>setType(t)} style={{paddingVertical:8,paddingHorizontal:16,borderRadius:20,backgroundColor:type===t?'#C9956C':'#1C1C1C'}}>
              <Text style={{color:type===t?'#FFF':'#A09080'}}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={handleCreate} disabled={loading} style={{backgroundColor:'#C9956C',paddingVertical:16,borderRadius:12,alignItems:'center'}}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF',fontSize:16,fontWeight:'bold'}}>Create Project</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
