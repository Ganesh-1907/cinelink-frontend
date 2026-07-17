import React from 'react';
import {View, Text, SafeAreaView, StatusBar} from 'react-native';

export default function FollowersScreen({route}: any) {
  const userId = route?.params?.userId;
  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <View style={{flex:1, justifyContent:'center', alignItems:'center', padding:20}}>
        <Text style={{fontSize:48, marginBottom:12}}>👥</Text>
        <Text style={{color:'#A09080', fontSize:15, textAlign:'center'}}>Followers feature coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}
