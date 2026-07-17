import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, StatusBar} from 'react-native';
import {getContest, enterContest} from '../src/services/dataService';

export default function ContestDetailScreen({route, navigation}: any) {
  const {contest: initialContest} = route?.params || {};
  const contestId = route?.params?.contestId || initialContest?._id || initialContest?.id;
  const [contest, setContest] = useState<any>(initialContest);
  const [loading, setLoading] = useState(!initialContest);
  const [entering, setEntering] = useState(false);

  useEffect(() => { if (contestId && !initialContest) loadContest(); }, [contestId]);

  const loadContest = async () => {
    try { const r = await getContest(contestId); setContest(r.contest); }
    catch {} finally { setLoading(false); }
  };

  const handleEnter = async () => {
    setEntering(true);
    try {
      if (contest?.entryFee > 0) {
        navigation.navigate('Payment', {amount: contest.entryFee, purpose: 'contest_entry', itemId: contestId, itemTitle: contest?.title});
      } else {
        await enterContest(contestId, {});
        Alert.alert('Entered!', 'You have entered the contest.'); navigation.goBack();
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setEntering(false); }
  };

  if (loading) return <SafeAreaView style={{flex:1,backgroundColor:'#0A0A0A',justifyContent:'center',alignItems:'center'}}><ActivityIndicator color="#C9956C" /></SafeAreaView>;

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{padding:20}}>
        {contest ? (
          <>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
              <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', flex:1}}>{contest.title}</Text>
              {contest.entryFee > 0 ? <Text style={{color:'#FBBF24', fontSize:18, fontWeight:'bold'}}>₹{contest.entryFee}</Text> : <Text style={{color:'#4ADE80', fontSize:14, fontWeight:'bold'}}>FREE</Text>}
            </View>
            {contest.prize ? <Text style={{color:'#FBBF24', fontSize:16, marginBottom:8}}>🏆 Prize: {contest.prize}</Text> : null}
            <Text style={{color:'#A09080', fontSize:13, marginBottom:16}}>👥 {contest.entriesCount || 0} entries · 📅 {contest.deadline || 'No deadline'}</Text>
            {contest.description ? <Text style={{color:'#FFF', fontSize:15, lineHeight:24, marginBottom:24}}>{contest.description}</Text> : null}
            <TouchableOpacity onPress={handleEnter} disabled={entering} style={{backgroundColor:'#C9956C',paddingVertical:16,borderRadius:12,alignItems:'center',opacity:entering?0.6:1}}>
              {entering ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF',fontSize:16,fontWeight:'bold'}}>{contest?.entryFee > 0 ? 'Pay & Enter' : 'Enter Free'}</Text>}
            </TouchableOpacity>
          </>
        ) : <Text style={{color:'#A09080', textAlign:'center'}}>Contest not found.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
