import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView, Image} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadImage} from '../src/services/uploadService';
import {getToken} from '../src/services/storageService';
import api from '../src/api/client';

export default function CastingRequestScreen({navigation}: any) {
  const [message, setMessage] = useState('');
  const [experience, setExperience] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!message.trim()) {Alert.alert('Required', 'Please describe your request.'); return;}
    setLoading(true);
    try {
      await api.post('/casting-requests', {message: message.trim(), experience: experience.trim(), phone});
      Alert.alert('Submitted', 'Your request has been submitted for review.');
      navigation.goBack();
    } catch (e: any) {Alert.alert('Error', e.message);}
    finally {setLoading(false);}
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <ScrollView contentContainerStyle={{padding:20}}>
        <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:8}}>📋 Request to Post Auditions</Text>
        <Text style={{color:'#A09080', fontSize:14, marginBottom:24}}>Directors and verified professionals can post auditions.</Text>

        <TextInput placeholder="Describe your production / why you need audition access" value={message} onChangeText={setMessage} multiline
          style={{backgroundColor:'#141414', color:'#FFF', borderRadius:12, padding:16, marginBottom:12, minHeight:120, borderWidth:1, borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Years of experience / past work" value={experience} onChangeText={setExperience}
          style={{backgroundColor:'#141414', color:'#FFF', borderRadius:12, padding:16, marginBottom:12, borderWidth:1, borderColor:'#2A2A2A'}} />
        <TextInput placeholder="Contact phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad"
          style={{backgroundColor:'#141414', color:'#FFF', borderRadius:12, padding:16, marginBottom:20, borderWidth:1, borderColor:'#2A2A2A'}} />

        <TouchableOpacity onPress={submit} disabled={loading}
          style={{backgroundColor:'#C9956C', paddingVertical:16, borderRadius:12, alignItems:'center', opacity:loading?0.6:1}}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF', fontSize:16, fontWeight:'bold'}}>Submit Request</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
