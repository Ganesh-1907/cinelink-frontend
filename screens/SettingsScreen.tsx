import React from 'react';
import {View, Text, TouchableOpacity, ScrollView, Alert, SafeAreaView, StatusBar} from 'react-native';
import {logout} from '../src/services/authService';
import api from '../src/api/client';

export default function SettingsScreen({navigation}: any) {
  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'Are you sure? This cannot be undone.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete('/users/delete-account'); await logout(); }
        catch { Alert.alert('Error', 'Could not delete account.'); }
      }},
    ]);
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <ScrollView contentContainerStyle={{padding: 20}}>
        <Text style={{fontSize:26, fontWeight:'bold', color:'#FFF', marginBottom:24}}>⚙️ Settings</Text>
        {[
          {icon: '👤', label: 'Edit Profile', onPress: () => navigation.navigate('Profile')},
          {icon: '🔔', label: 'Notifications', onPress: () => navigation.navigate('Notifications')},
          {icon: '🎓', label: 'Industry Guide', onPress: () => navigation.navigate('IndustryGuide')},
          {icon: '📜', label: 'Privacy Policy', onPress: () => navigation.navigate('PrivacyPolicy')},
          {icon: '📋', label: 'Terms of Service', onPress: () => navigation.navigate('Terms')},
          {icon: '⭐', label: 'Rate Us', onPress: () => null},
        ].map((item, i) => (
          <TouchableOpacity key={i} onPress={item.onPress}
            style={{backgroundColor:'#1C1C1C', padding:16, borderRadius:12, flexDirection:'row', alignItems:'center', gap:12, marginBottom:8, borderWidth:1, borderColor:'#2A2A2A'}}>
            <Text style={{fontSize:20}}>{item.icon}</Text>
            <Text style={{color:'#FFF', fontSize:15, fontWeight:'600'}}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={handleDeleteAccount}
          style={{backgroundColor:'rgba(239,68,68,0.1)', padding:16, borderRadius:12, alignItems:'center', marginTop:16, borderWidth:1, borderColor:'rgba(239,68,68,0.3)'}}>
          <Text style={{color:'#EF4444', fontSize:15, fontWeight:'600'}}>🗑️ Delete Account</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={async () => { await logout(); }}
          style={{backgroundColor:'#1C1C1C', padding:16, borderRadius:12, alignItems:'center', marginTop:8, borderWidth:1, borderColor:'#2A2A2A'}}>
          <Text style={{color:'#A09080', fontSize:15}}>🚪 Logout</Text>
        </TouchableOpacity>
        <Text style={{color:'#6B5D52', fontSize:12, textAlign:'center', marginTop:32}}>CineLink v1.0.4</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
