import React, {useState, useEffect, useRef} from 'react';
import {
  View, Text, TextInput, StyleSheet,
  ScrollView, StatusBar, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {LiquidPress} from '../components/LiquidPress';
import {sendOTP, verifyOTP, resendOTP} from '../utils/msg91';

const C = {
  background:   '#0A0A0A',
  surface:      '#141414',
  card:         '#1C1C1C',
  border:       '#2A2A2A',
  borderLight:  '#333333',
  primary:      '#C9956C',
  primaryLight: '#E8C4A0',
  primaryFaint: 'rgba(201,149,108,0.10)',
  textPrimary:  '#FFFFFF',
  textSecondary:'#A09080',
  textTertiary: '#6B5D52',
  error:        '#EF4444',
};

const RESEND_COUNTDOWN = 30;

export default function PhoneLoginScreen({navigation}: any) {
  const [phone, setPhone]             = useState('');
  const [otp, setOtp]                 = useState('');
  const [step, setStep]               = useState<'phone' | 'otp'>('phone');
  const [sendingOtp, setSendingOtp]   = useState(false);
  const [verifying, setVerifying]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [countdown, setCountdown]     = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_COUNTDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    setErrorMsg('');
    const cleaned = phone.replace(/\s/g, '');
    if (!/^\d{10}$/.test(cleaned)) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSendingOtp(true);
    const ok = await sendOTP(cleaned);
    setSendingOtp(false);
    if (ok) {
      setStep('otp');
      startCountdown();
    } else {
      setErrorMsg('Failed to send OTP. Please check your number and try again.');
    }
  };

  const handleVerifyOTP = async () => {
    setErrorMsg('');
    const cleaned = phone.replace(/\s/g, '');
    const otpCleaned = otp.replace(/\s/g, '');
    if (!/^\d{6}$/.test(otpCleaned)) {
      setErrorMsg('Please enter the 6-digit OTP sent to your number.');
      return;
    }
    setVerifying(true);
    const ok = await verifyOTP(cleaned, otpCleaned);
    if (!ok) {
      setVerifying(false);
      setErrorMsg('Incorrect OTP. Please check and try again.');
      return;
    }
    try {
      const result = await auth().signInAnonymously();
      await firestore().collection('users').doc(result.user.uid).set({
        uid:       result.user.uid,
        phone:     `+91${cleaned}`,
        role:      'Actor',
        createdAt: firestore.FieldValue.serverTimestamp(),
        isOnline:  true,
        lastSeen:  firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
    } catch (e: any) {
      setVerifying(false);
      setErrorMsg('Sign-in failed after OTP verification. Please try again.');
      return;
    }
    setVerifying(false);
    // App.tsx onAuthStateChanged will auto-route to MainStack
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setErrorMsg('');
    const cleaned = phone.replace(/\s/g, '');
    const ok = await resendOTP(cleaned);
    if (ok) {
      startCountdown();
    } else {
      setErrorMsg('Could not resend OTP. Please try again.');
    }
  };

  const handleChangeNumber = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep('phone');
    setOtp('');
    setErrorMsg('');
    setCountdown(0);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={C.background} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>📱</Text>
          <Text style={styles.headerTitle}>Phone Login</Text>
          <Text style={styles.headerSub}>
            {step === 'phone'
              ? 'Enter your 10-digit mobile number'
              : `OTP sent to +91 ${phone}`}
          </Text>
        </View>

        <View style={styles.card}>

          {step === 'phone' ? (
            <>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="10-digit number"
                  placeholderTextColor={C.textTertiary}
                  value={phone}
                  onChangeText={t => {
                    setPhone(t.replace(/[^0-9]/g, '').slice(0, 10));
                    setErrorMsg('');
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOTP}
                />
              </View>

              {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

              <LiquidPress
                style={[styles.primaryBtn, (sendingOtp || phone.length !== 10) && styles.btnDisabled]}
                onPress={handleSendOTP}
                disabled={sendingOtp || phone.length !== 10}>
                {sendingOtp ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send OTP →</Text>
                )}
              </LiquidPress>
            </>
          ) : (
            <>
              <View style={styles.sentRow}>
                <Text style={styles.sentLabel}>OTP sent to</Text>
                <Text style={styles.sentNumber}>+91 {phone}</Text>
                <TouchableOpacity onPress={handleChangeNumber}>
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Enter OTP</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="• • • • • •"
                placeholderTextColor={C.textTertiary}
                value={otp}
                onChangeText={t => {
                  setOtp(t.replace(/[^0-9]/g, '').slice(0, 6));
                  setErrorMsg('');
                }}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleVerifyOTP}
                autoFocus
              />

              {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

              <LiquidPress
                style={[styles.primaryBtn, (verifying || otp.length !== 6) && styles.btnDisabled]}
                onPress={handleVerifyOTP}
                disabled={verifying || otp.length !== 6}>
                {verifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify OTP →</Text>
                )}
              </LiquidPress>

              {/* RESEND */}
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                disabled={countdown > 0}>
                <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
                  {countdown > 0
                    ? `Resend OTP in ${countdown}s`
                    : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </>
          )}

        </View>

        {/* BACK */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: C.background},
  scroll:    {flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40},

  header: {alignItems: 'center', paddingTop: 70, paddingBottom: 32},
  headerIcon:  {fontSize: 52, marginBottom: 12},
  headerTitle: {color: C.primary, fontSize: 28, fontWeight: '800', letterSpacing: 0.5},
  headerSub:   {color: C.textSecondary, fontSize: 14, marginTop: 6, textAlign: 'center'},

  card: {
    backgroundColor: C.card,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 20,
  },

  label: {
    color: C.primary, fontSize: 11, fontWeight: '700',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8,
  },

  phoneRow: {flexDirection: 'row', gap: 10, marginBottom: 16},
  countryCode: {
    backgroundColor: '#242424',
    borderRadius: 12, paddingHorizontal: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  countryCodeText: {color: C.textPrimary, fontSize: 15, fontWeight: '600'},
  phoneInput: {
    flex: 1, backgroundColor: '#242424',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    color: C.textPrimary, fontSize: 18, letterSpacing: 2,
    borderWidth: 1, borderColor: C.border,
  },

  otpInput: {
    backgroundColor: '#242424',
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 16,
    color: C.textPrimary, fontSize: 28, letterSpacing: 10,
    borderWidth: 1, borderColor: C.primary,
    textAlign: 'center', marginBottom: 16,
  },

  sentRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 20, flexWrap: 'wrap',
  },
  sentLabel:  {color: C.textSecondary, fontSize: 13},
  sentNumber: {color: C.textPrimary,   fontSize: 13, fontWeight: '700'},
  changeLink: {color: C.primary,       fontSize: 13, fontWeight: '600', textDecorationLine: 'underline'},

  error: {color: C.error, fontSize: 13, marginBottom: 12},

  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  btnDisabled:    {opacity: 0.45},
  primaryBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.3},

  resendBtn:      {alignItems: 'center', marginTop: 16, padding: 6},
  resendText:     {color: C.primaryLight, fontSize: 14, fontWeight: '600'},
  resendDisabled: {color: C.textTertiary},

  backBtn:  {alignItems: 'center', marginTop: 8},
  backText: {color: C.textSecondary, fontSize: 14},
});
