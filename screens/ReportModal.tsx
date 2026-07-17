import React, {useState} from 'react';
import {Modal, View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator} from 'react-native';
import {createReport} from '../src/services/dataService';

export default function ReportModal({visible, onClose, contentId, contentType, contentTitle}: any) {
  const [reason, setReason] = useState(''); const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasons = ['Fake/Scam', 'Inappropriate', 'Spam', 'Harassment', 'Misleading', 'Other'];

  const submit = async () => {
    if (!reason) {Alert.alert('Select', 'Please select a reason.'); return;}
    setSubmitting(true);
    try { await createReport({reason, message: message.trim(), reportedUserId: contentId, contentType}); Alert.alert('Reported', 'Thank you. We will review it.'); onClose(); }
    catch (e: any) {Alert.alert('Error', e.message);}
    finally {setSubmitting(false);}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end'}}>
        <View style={{backgroundColor:'#141414', borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40}}>
          <Text style={{color:'#FFF', fontSize:20, fontWeight:'bold', marginBottom:16}}>🚨 Report</Text>
          {reasons.map(r => (
            <TouchableOpacity key={r} onPress={() => setReason(r)} style={{flexDirection:'row', alignItems:'center', paddingVertical:12, gap:8}}>
              <View style={{width:22, height:22, borderRadius:11, borderWidth:2, borderColor: reason===r?'#C9956C':'#2A2A2A', justifyContent:'center', alignItems:'center'}}>
                {reason===r ? <View style={{width:12, height:12, borderRadius:6, backgroundColor:'#C9956C'}} /> : null}
              </View>
              <Text style={{color: reason===r?'#C9956C':'#FFF', fontSize:15}}>{r}</Text>
            </TouchableOpacity>
          ))}
          <TextInput placeholder="Additional details (optional)" value={message} onChangeText={setMessage} multiline
            style={{backgroundColor:'#1C1C1C', color:'#FFF', borderRadius:12, padding:14, minHeight:80, borderWidth:1, borderColor:'#2A2A2A', marginTop:12, marginBottom:16}} />
          <TouchableOpacity onPress={submit} disabled={submitting}
            style={{backgroundColor:'#EF4444', paddingVertical:14, borderRadius:12, alignItems:'center', opacity:submitting?0.6:1}}>
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF', fontSize:16, fontWeight:'600'}}>Submit Report</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
