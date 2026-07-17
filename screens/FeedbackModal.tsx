import React, {useState} from 'react';
import {Modal, View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator} from 'react-native';
import api from '../src/api/client';

export default function FeedbackModal({visible, onClose}: {visible: boolean; onClose: () => void}) {
  const [rating, setRating] = useState(0); const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false); const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {Alert.alert('Please rate', 'Tap a star first!'); return;}
    setSubmitting(true);
    try { await api.post('/feedback', {rating, message: message.trim(), screenName: 'general'}); setSubmitted(true); }
    catch {Alert.alert('Error', 'Could not submit.');}
    finally {setSubmitting(false);}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end'}}>
        <View style={{backgroundColor:'#141414', borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40}}>
          {submitted ? (
            <>
              <Text style={{fontSize:48, textAlign:'center', marginBottom:12}}>❤️</Text>
              <Text style={{color:'#FFF', fontSize:20, fontWeight:'bold', textAlign:'center', marginBottom:16}}>Thank You!</Text>
              <TouchableOpacity onPress={onClose} style={{backgroundColor:'#C9956C', paddingVertical:14, borderRadius:12, alignItems:'center'}}>
                <Text style={{color:'#FFF', fontSize:16, fontWeight:'600'}}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{color:'#FFF', fontSize:20, fontWeight:'bold', textAlign:'center', marginBottom:16}}>Rate your experience</Text>
              <View style={{flexDirection:'row', justifyContent:'center', gap:8, marginBottom:20}}>
                {[1,2,3,4,5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Text style={{fontSize:36, color: s <= rating ? '#FBBF24' : '#2A2A2A'}}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput placeholder="Any suggestions? (optional)" value={message} onChangeText={setMessage} multiline
                style={{backgroundColor:'#1C1C1C', color:'#FFF', borderRadius:12, padding:14, minHeight:80, borderWidth:1, borderColor:'#2A2A2A', marginBottom:20}} />
              <TouchableOpacity onPress={handleSubmit} disabled={submitting}
                style={{backgroundColor:'#C9956C', paddingVertical:14, borderRadius:12, alignItems:'center', opacity:submitting?0.6:1}}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF', fontSize:16, fontWeight:'600'}}>Send Feedback</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
