import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import {createOrder, savePayment, checkDuplicatePayment} from '../src/services/dataService';
import {getToken} from '../src/services/storageService';

export default function PaymentScreen({route, navigation}: any) {
  const {amount, purpose, itemId, itemTitle, videoLink} = route?.params || {};
  const [loading, setLoading] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => { checkDuplicate(); }, []);

  const checkDuplicate = async () => {
    try {
      if (itemId && purpose) {
        const result = await checkDuplicatePayment(itemId, purpose);
        if (result.alreadyPaid) setAlreadyPaid(true);
      }
    } catch {} finally { setChecking(false); }
  };

  const processPayment = async () => {
    if (alreadyPaid) { Alert.alert('Already Paid'); return; }
    setLoading(true);
    try {
      const orderResult = await createOrder(amount, {purpose, itemId, itemTitle, videoLink: videoLink || ''});
      const options = {
        description: (itemTitle || 'Payment').substring(0, 255),
        image: 'https://res.cloudinary.com/dipwobgzb/image/upload/v1/logo.png',
        currency: 'INR',
        key: orderResult.keyId,
        amount: orderResult.amount,
        name: 'CineLink',
        order_id: orderResult.orderId,
        prefill: { contact: '', email: '' },
        theme: { color: '#C9956C' },
      };

      const razorpayResult = await RazorpayCheckout.open(options);
      await savePayment({
        razorpay_order_id: orderResult.orderId,
        razorpay_payment_id: razorpayResult.razorpay_payment_id,
        razorpay_signature: razorpayResult.razorpay_signature,
        amount: amount * 100, purpose, itemId, itemTitle, videoLink: videoLink || '',
      });
      Alert.alert('Payment Successful', 'Transaction completed!');
      navigation.goBack();
    } catch (e: any) {
      if (e?.description !== 'Payment cancelled') {
        Alert.alert('Payment Failed', e?.description || e.message || 'Something went wrong');
      }
    } finally { setLoading(false); }
  };

  if (checking) return <View style={{flex:1, backgroundColor:'#0A0A0A', justifyContent:'center', alignItems:'center'}}><ActivityIndicator color="#C9956C" /></View>;

  return (
    <ScrollView style={{flex:1, backgroundColor:'#0A0A0A', padding: 24}}>
      <Text style={{fontSize:28, fontWeight:'bold', color:'#FFF', textAlign:'center', marginBottom:8}}>💳 Payment</Text>
      <Text style={{fontSize:14, color:'#A09080', textAlign:'center', marginBottom:32}}>Complete your payment securely via Razorpay</Text>
      <View style={{backgroundColor:'#1C1C1C', borderRadius:16, padding:20, borderWidth:1, borderColor:'#2A2A2A', marginBottom:24}}>
        <Text style={{color:'#A09080', fontSize:13, marginBottom:4}}>Amount to Pay</Text>
        <Text style={{color:'#FFF', fontSize:36, fontWeight:'bold'}}>₹{amount || 0}</Text>
        {itemTitle ? <Text style={{color:'#A09080', fontSize:13, marginTop:8}}>For: {itemTitle}</Text> : null}
      </View>
      {alreadyPaid ? (
        <View style={{backgroundColor:'rgba(74,222,128,0.1)', borderRadius:12, padding:16, alignItems:'center', borderWidth:1, borderColor:'#4ADE80'}}>
          <Text style={{color:'#4ADE80', fontSize:16, fontWeight:'bold'}}>✅ Already Paid</Text>
          <Text style={{color:'#A09080', fontSize:13, marginTop:4}}>You have already paid for this item.</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={processPayment} disabled={loading}
          style={{backgroundColor:'#C9956C', paddingVertical:18, borderRadius:12, alignItems:'center', opacity: loading?0.6:1}}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF', fontSize:17, fontWeight:'bold'}}>Pay ₹{amount || 0}</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
