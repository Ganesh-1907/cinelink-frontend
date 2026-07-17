import React, {useState, useRef} from 'react';
import {View, Text, TextInput, StyleSheet, ScrollView, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity, SafeAreaView, Alert} from 'react-native';
import auth from '@react-native-firebase/auth';
import api from '../src/api/client';

const C = {
  background: '#0A0A0A', surface: '#141414', card: '#1C1C1C',
  border: '#2A2A2A', borderLight: '#333333', primary: '#C9956C',
  primaryLight: '#E8C4A0', primaryFaint: 'rgba(201,149,108,0.10)',
  textPrimary: '#FFFFFF', textSecondary: '#A09080', textTertiary: '#6B5D52',
};

const RESEND_COUNTDOWN = 60;

export default function PhoneLoginScreen({navigation}: any) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = () => {
    setCountdown(RESEND_COUNTDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current!); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleSendOTP = async () => {
    setErrorMsg('');
    const cleaned = phone.replace(/\s/g, '');
    if (!/^\d{10}$/.test(cleaned)) { setErrorMsg('Enter valid 10-digit number.'); return; }
    setSendingOtp(true);
    try {
      await api.post('/otp/send', {phone: cleaned}, true);
      setStep('otp');
      startCountdown();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to send OTP');
    } finally { setSendingOtp(false); }
  };

  const handleVerifyOTP = async () => {
    setErrorMsg('');
    const cleaned = phone.replace(/\s/g, '');
    const otpCleaned = otp.replace(/\s/g, '');
    if (!/^\d{4,6}$/.test(otpCleaned)) { setErrorMsg('Enter the OTP.'); return; }
    setVerifying(true);
    try {
      const res = await api.post<{success: boolean; token?: string; uid?: string}>('/otp/verify', {phone: cleaned, otp: otpCleaned}, true);
      if (res.token) {
        await auth().signInWithCustomToken(res.token);
      } else {
        Alert.alert('Verified', 'Phone number verified successfully!');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Verification failed');
    } finally { setVerifying(false); }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    handleSendOTP();
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor: C.background}}>
      <StatusBar barStyle="light-content" backgroundColor={C.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
        <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center', padding: 24}}>
          <Text style={{fontSize: 48, textAlign: 'center', marginBottom: 8}}>📱</Text>
          <Text style={{fontSize: 24, fontWeight: 'bold', color: C.textPrimary, textAlign: 'center', marginBottom: 8}}>
            {step === 'phone' ? 'Enter Phone Number' : 'Enter OTP'}
          </Text>
          <Text style={{fontSize: 14, color: C.textSecondary, textAlign: 'center', marginBottom: 32}}>
            {step === 'phone' ? 'We will send you a one-time password' : 'Enter the 4-digit code sent to +91 {phone}'}
          </Text>

          {step === 'phone' ? (
            <>
              <View style={{backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16}}>
                <Text style={{color: C.textSecondary, fontSize: 16, marginRight: 8}}>+91</Text>
                <TextInput placeholder="9876543210" placeholderTextColor={C.textTertiary}
                  value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10}
                  style={{flex: 1, color: C.textPrimary, fontSize: 18, paddingVertical: 16}} />
              </View>
              <TouchableOpacity onPress={handleSendOTP} disabled={sendingOtp}
                style={{backgroundColor: C.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', opacity: sendingOtp ? 0.6 : 1}}>
                {sendingOtp ? <ActivityIndicator color="#FFF" /> : <Text style={{color: '#FFF', fontSize: 16, fontWeight: 'bold'}}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput placeholder="Enter OTP" placeholderTextColor={C.textTertiary}
                value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6}
                style={{backgroundColor: C.surface, color: C.textPrimary, fontSize: 24, textAlign: 'center', letterSpacing: 8, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border}} />
              
              <TouchableOpacity onPress={handleVerifyOTP} disabled={verifying}
                style={{backgroundColor: C.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16, opacity: verifying ? 0.6 : 1}}>
                {verifying ? <ActivityIndicator color="#FFF" /> : <Text style={{color: '#FFF', fontSize: 16, fontWeight: 'bold'}}>Verify OTP</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleResend} disabled={countdown > 0} style={{alignItems: 'center'}}>
                <Text style={{color: countdown > 0 ? C.textTertiary : C.primary, fontSize: 14}}>
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {errorMsg ? <Text style={{color: '#EF4444', fontSize: 13, textAlign: 'center', marginTop: 12}}>{errorMsg}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
