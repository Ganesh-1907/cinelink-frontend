import React from 'react';
import {View, Text, SafeAreaView} from 'react-native';

export default function JoinRequestsScreen({route}: any) {
  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <View style={{flex:1, justifyContent:'center', alignItems:'center', padding:20}}>
        <Text style={{fontSize:48, marginBottom:12}}>📋</Text>
        <Text style={{color:'#A09080', fontSize:15, textAlign:'center'}}>Join requests coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}
