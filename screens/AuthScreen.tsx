import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, StatusBar,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GOOGLE_WEB_CLIENT_ID} from '../src/api/config';
import {signup, login, googleSignIn} from '../src/services/authService';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

const C = {
  background: '#0A0A0A', surface: '#141414', card: '#1C1C1C',
  cardElevated: '#242424', border: '#2A2A2A', borderLight: '#333333',
  primary: '#C9956C', primaryLight: '#E8C4A0',
  primaryFaint: 'rgba(201,149,108,0.10)',
  textPrimary: '#FFFFFF', textSecondary: '#A09080', textTertiary: '#6B5D52',
};

type AuthMode = 'login' | 'signup';

export default function AuthScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Email and password are required.'); return;
    }
    setLoading(true);
    try {
      if (authMode === 'signup') {
        await signup(email.trim(), password, name.trim() || undefined);
      } else {
        await login(email.trim(), password);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const {idToken} = await GoogleSignin.getTokens();
      if (!idToken) { Alert.alert('Error', 'No Google token.'); return; }
      await googleSignIn(idToken);
    } catch (e: any) {
      if (e.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Google Sign-In Error', e.message);
      }
    } finally { setGoogleLoading(false); }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) { Alert.alert('Required', 'Enter your email first.'); return; }
    try {
      await auth().sendPasswordResetEmail(email.trim());
      Alert.alert('Sent', 'Password reset email sent.');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: C.background}}>
      <StatusBar barStyle="light-content" backgroundColor={C.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: insets.top + 20}}>
          <Text style={{fontSize: 36, textAlign: 'center', marginBottom: 4}}>🎬</Text>
          <Text style={{fontSize: 32, fontWeight: 'bold', color: C.textPrimary, textAlign: 'center', marginBottom: 4}}>CineLink</Text>
          <Text style={{fontSize: 14, color: C.textSecondary, textAlign: 'center', marginBottom: 32}}>India's Cinema Network</Text>

          {authMode === 'signup' && (
            <TextInput placeholder="Full Name" placeholderTextColor={C.textTertiary}
              value={name} onChangeText={setName}
              style={{backgroundColor: C.surface, color: C.textPrimary, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border}} />
          )}

          <TextInput placeholder="Email" placeholderTextColor={C.textTertiary}
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
            style={{backgroundColor: C.surface, color: C.textPrimary, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border}} />

          <View style={{position: 'relative', marginBottom: 12}}>
            <TextInput placeholder="Password" placeholderTextColor={C.textTertiary}
              value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
              style={{backgroundColor: C.surface, color: C.textPrimary, borderRadius: 12, padding: 16, paddingRight: 50, borderWidth: 1, borderColor: C.border}} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}
              style={{position: 'absolute', right: 16, top: 14}}>
              <Text style={{fontSize: 18}}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleEmailAuth} disabled={loading}
            style={{backgroundColor: C.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, opacity: loading ? 0.6 : 1}}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color: '#FFF', fontSize: 16, fontWeight: 'bold'}}>{authMode === 'signup' ? 'Create Account' : 'Login'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePasswordReset} style={{marginBottom: 16, alignItems: 'center'}}>
            <Text style={{color: C.primary, fontSize: 13}}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
            <View style={{flex: 1, height: 1, backgroundColor: C.border}} />
            <Text style={{marginHorizontal: 12, color: C.textTertiary, fontSize: 13}}>OR</Text>
            <View style={{flex: 1, height: 1, backgroundColor: C.border}} />
          </View>

          <TouchableOpacity onPress={handleGoogleSignIn} disabled={googleLoading}
            style={{backgroundColor: C.surface, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: C.border, flexDirection: 'row', justifyContent: 'center', gap: 10}}>
            {googleLoading ? <ActivityIndicator color="#FFF" /> : <>
              <Text style={{fontSize: 20}}>G</Text>
              <Text style={{color: C.textPrimary, fontSize: 15, fontWeight: '600'}}>Continue with Google</Text>
            </>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('PhoneLogin')}
            style={{backgroundColor: C.surface, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 24}}>
            <Text style={{color: C.textPrimary, fontSize: 15}}>📱 Login with Phone</Text>
          </TouchableOpacity>

          <View style={{flexDirection: 'row', justifyContent: 'center'}}>
            <Text style={{color: C.textSecondary, fontSize: 14}}>{authMode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}>
              <Text style={{color: C.primary, fontSize: 14, fontWeight: '600'}}>{authMode === 'signup' ? 'Login' : 'Sign Up'}</Text>
            </TouchableOpacity>
          </View>

          <View style={{flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 16}}>
            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}><Text style={{color: C.textTertiary, fontSize: 12}}>Privacy Policy</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}><Text style={{color: C.textTertiary, fontSize: 12}}>Terms of Service</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
