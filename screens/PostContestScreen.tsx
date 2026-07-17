import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, StatusBar} from 'react-native';
import {createContest} from '../src/services/dataService';

export default function PostContestScreen({navigation}: any) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [prize, setPrize] = useState(''); const [entryFee, setEntryFee] = useState('');
  const [deadline, setDeadline] = useState(''); const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {Alert.alert('Required', 'Title is required.'); return;}
    setLoading(true);
    try {
      await createContest({title: title.trim(), description: description.trim(), prize: prize.trim(), entryFee: Number(entryFee) || 0, deadline});
      Alert.alert('Created!', 'Contest created successfully.');
      navigation.goBack();
    } catch (e: any) {Alert.alert('Error', e.message);}
    finally {setLoading(false);}
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{padding:20}}>
        <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:20}}>🏆 Create Contest</Text>
        <TextInput placeholder="Contest Title" value={title} onChangeText={setTitle} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Description" value={description} onChangeText={setDescription} multiline style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,minHeight:100,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Prize (e.g. ₹10,000)" value={prize} onChangeText={setPrize} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Entry Fee (₹)" value={entryFee} onChangeText={setEntryFee} keyboardType="numeric" style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Deadline (e.g. 25 Dec 2026)" value={deadline} onChangeText={setDeadline} style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:20,borderWidth:1,borderColor:'#2A2A2A'}} />
        <TouchableOpacity onPress={handleCreate} disabled={loading} style={{backgroundColor:'#C9956C',paddingVertical:16,borderRadius:12,alignItems:'center',opacity:loading?0.6:1}}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF',fontSize:16,fontWeight:'bold'}}>Create Contest</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
