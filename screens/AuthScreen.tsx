import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, StatusBar,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import {GOOGLE_WEB_CLIENT_ID} from '../src/api/config';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

// ─── Theme ────────────────────────────────────────────────────
const C = {
  background:   '#0A0A0A',
  surface:      '#141414',
  card:         '#1C1C1C',
  cardElevated: '#242424',
  border:       '#2A2A2A',
  borderLight:  '#333333',
  primary:      '#C9956C',
  primaryLight: '#E8C4A0',
  primaryFaint: 'rgba(201,149,108,0.10)',
  textPrimary:  '#FFFFFF',
  textSecondary:'#A09080',
  textTertiary: '#6B5D52',
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const {idToken} = await GoogleSignin.getTokens();
      if (!idToken) {
        Alert.alert('Error', 'Could not get Google token. Try again.');
        return;
      }
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const result = await auth().signInWithCredential(googleCredential);
      const user = result.user;
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        await firestore().collection('users').doc(user.uid).set({
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || '',
          displayName: user.displayName || '',
          name: user.displayName || '',
          photoURL: user.photoURL || '',
          photoUrl: user.photoURL || '',
          role: 'Actor',
          createdAt: firestore.FieldValue.serverTimestamp(),
          isOnline: true,
          lastSeen: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (e: any) {
      console.log('GOOGLE SIGN IN ERROR:', e);
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        // cancelled
      } else if (e.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Please wait', 'Sign in already in progress.');
      } else if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available.');
      } else {
        Alert.alert('Google Sign In Failed', e?.message || 'Could not sign in with Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email.trim(), password.trim());
    } catch (e: any) {
      Alert.alert('Login Failed', e?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const result = await auth().createUserWithEmailAndPassword(email.trim(), password.trim());
      await result.user.updateProfile({displayName: name.trim()});
      await firestore().collection('users').doc(result.user.uid).set({
        uid: result.user.uid,
        email: email.trim(),
        fullName: name.trim(),
        displayName: name.trim(),
        name: name.trim(),
        role: 'Actor',
        createdAt: firestore.FieldValue.serverTimestamp(),
        isOnline: true,
        lastSeen: firestore.FieldValue.serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert('Signup Failed', e?.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0A0A0A'}}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={C.background} />
      <ScrollView contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + 20}]} keyboardShouldPersistTaps="handled">

        {/* ── LOGO ─────────────────────────────────────────── */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>🎬</Text>
          <Text style={styles.appName}>CineLink</Text>
          <Text style={styles.tagline}>India's Cinema Network</Text>
          {/* Subtle rose gold decorative line */}
          <View style={styles.logoDivider} />
        </View>

        {/* ── GOOGLE SIGN IN ────────────────────────────────── */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleSignIn}
          disabled={googleLoading}>
          {googleLoading ? (
            <ActivityIndicator color={C.textPrimary} />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── PHONE SIGN IN ─────────────────────────────────── */}
        <TouchableOpacity
          style={styles.phoneBtn}
          onPress={() => navigation.navigate('PhoneLogin')}>
          <Text style={styles.phoneBtnText}>📱 Login with Phone Number</Text>
        </TouchableOpacity>

        {/* ── DIVIDER ───────────────────────────────────────── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── MODE TABS ─────────────────────────────────────── */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, authMode === 'login' && styles.modeTabActive]}
            onPress={() => setAuthMode('login')}>
            <Text style={[styles.modeTabText, authMode === 'login' && styles.modeTabTextActive]}>
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, authMode === 'signup' && styles.modeTabActive]}
            onPress={() => setAuthMode('signup')}>
            <Text style={[styles.modeTabText, authMode === 'signup' && styles.modeTabTextActive]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── FORM CARD ─────────────────────────────────────── */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {authMode === 'login' ? '👋 Welcome Back!' : '🚀 Create Account'}
          </Text>
          <Text style={styles.formSubtitle}>
            {authMode === 'login'
              ? 'Login to your CineLink account'
              : "Join India's cinema network"}
          </Text>

          {authMode === 'signup' && (
            <>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={C.textTertiary}
                value={name}
                onChangeText={setName}
              />
            </>
          )}

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={C.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
<View style={styles.passwordRow}>
  <TextInput
    style={styles.passwordInput}
    placeholder={authMode === 'signup' ? 'Min 6 characters' : 'Your password'}
    placeholderTextColor={C.textTertiary}
    value={password}
    onChangeText={setPassword}
    secureTextEntry={!showPassword}
  />
  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
  </TouchableOpacity>
</View>
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={authMode === 'login' ? handleEmailLogin : handleEmailSignup}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {authMode === 'login' ? 'Login →' : 'Create Account →'}
              </Text>
            )}
          </TouchableOpacity>

          {authMode === 'login' && (
            <TouchableOpacity
              onPress={() => {
                if (!email.trim()) {
                  Alert.alert('Enter Email', 'Please enter your email address first.');
                  return;
                }
                auth()
                  .sendPasswordResetEmail(email.trim())
                  .then(() => Alert.alert('Email Sent!', 'Check your inbox to reset your password.'))
                  .catch((e: any) => Alert.alert('Error', e.message));
              }}
              style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── FOOTER LEGAL ──────────────────────────────────── */}
        <Text style={styles.footerNote}>By continuing you agree to our</Text>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>•</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.footerLink}>Terms & Conditions</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ══════════════════════════════════════
   STYLES — Black & Rose Gold Theme
══════════════════════════════════════ */
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: C.background},
  scroll:    {flexGrow: 1, paddingHorizontal: 20},

  // ── Logo ────────────────────────────────────────────────────
  logoSection: {alignItems: 'center', paddingBottom: 32},
  logo:        {fontSize: 64, marginBottom: 12},
  appName:     {
    color: C.primary,
    fontSize: 38, fontWeight: 'bold',
    letterSpacing: 1,
  },
  tagline:     {color: C.textSecondary, fontSize: 15, marginTop: 6},
  logoDivider: {
    width: 48, height: 2,
    backgroundColor: C.primary,
    borderRadius: 2,
    marginTop: 20,
    opacity: 0.6,
  },

  // ── Google Button ────────────────────────────────────────────
  googleBtn: {
    backgroundColor: C.card,
    borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 16,
    flexDirection: 'row', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: C.borderLight,
  },
  googleIcon:    {color: '#4285F4', fontSize: 20, fontWeight: 'bold'},
  googleBtnText: {color: C.textPrimary, fontWeight: '600', fontSize: 16},

  // ── Phone Button ─────────────────────────────────────────────
  phoneBtn: {
    borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1.5, borderColor: C.primary,
    backgroundColor: C.primaryFaint,
  },
  phoneBtnText: {color: C.primary, fontWeight: '600', fontSize: 15},

  // ── Divider ──────────────────────────────────────────────────
  dividerRow:  {flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10},
  dividerLine: {flex: 1, height: 1, backgroundColor: C.border},
  dividerText: {color: C.textTertiary, fontSize: 13},

  // ── Mode Tabs ────────────────────────────────────────────────
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 16, padding: 4,
    marginBottom: 20,
    borderWidth: 1, borderColor: C.border,
  },
  modeTab:           {flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12},
  modeTabActive:     {backgroundColor: C.primary},
  modeTabText:       {color: C.textSecondary, fontWeight: '600', fontSize: 15},
  modeTabTextActive: {color: '#FFFFFF', fontWeight: 'bold'},

  // ── Form Card ────────────────────────────────────────────────
  formCard: {
    backgroundColor: C.card,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 20,
  },
  formTitle:    {color: C.textPrimary, fontSize: 22, fontWeight: 'bold', marginBottom: 6},
  formSubtitle: {color: C.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 20},

  // ── Inputs ───────────────────────────────────────────────────
  label: {
    color: C.primary,
    fontSize: 11, fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  input: {
    backgroundColor: C.cardElevated,
    borderRadius: 12, padding: 14,
    color: C.textPrimary, fontSize: 15,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 16,
  },

  // ── Primary Button ───────────────────────────────────────────
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  btnDisabled:    {opacity: 0.5},
  primaryBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.3},

  // ── Forgot ───────────────────────────────────────────────────
  passwordRow:   {flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardElevated, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 16},
passwordInput: {flex: 1, padding: 14, color: C.textPrimary, fontSize: 15},
eyeBtn:        {paddingHorizontal: 14},
eyeIcon:       {fontSize: 18},
forgotBtn:     {alignItems: 'center', marginTop: 14},
  forgotText: {color: C.primaryLight, fontSize: 14},

  // ── Footer ───────────────────────────────────────────────────
  footerNote:  {color: C.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 4},
  footerLinks: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8, marginTop: 6,
  },
  footerLink:  {color: C.primary, fontSize: 12, textDecorationLine: 'underline'},
  footerDot:   {color: C.textTertiary, fontSize: 12},
});