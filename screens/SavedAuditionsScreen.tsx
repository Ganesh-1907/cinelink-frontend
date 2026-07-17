import React from 'react';
import {View, Text, SafeAreaView, StatusBar} from 'react-native';

export default function SavedAuditionsScreen({navigation}: any) {
  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <View style={{flex:1, justifyContent:'center', alignItems:'center', padding:20}}>
        <Text style={{fontSize:48, marginBottom:12}}>💾</Text>
        <Text style={{color:'#FFF', fontSize:20, fontWeight:'bold', marginBottom:8}}>Saved Auditions</Text>
        <Text style={{color:'#A09080', fontSize:14, textAlign:'center'}}>Coming soon — your bookmarked auditions will appear here.</Text>
      </View>
    </SafeAreaView>
  );
}
