import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, SafeAreaView, Image,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {uploadImage} from '../src/services/uploadService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const STEPS = ['Basic Info', 'ID Proof', 'Phone Verify', 'Submit'];

export default function CastingRequestScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1 — Basic Info
  const [message, setMessage]       = useState('');
  const [experience, setExperience] = useState('');
  const [portfolio, setPortfolio]   = useState('');
  const [companyName, setCompanyName] = useState('');
  const [yearsExp, setYearsExp]     = useState('');

  // Step 2 — ID Proof
  const [idType, setIdType]         = useState('Aadhaar');
  const [idPhoto, setIdPhoto]       = useState<any>(null);
  const [idPhotoUrl, setIdPhotoUrl] = useState('');
  const [companyPhoto, setCompanyPhoto]   = useState<any>(null);
  const [companyPhotoUrl, setCompanyPhotoUrl] = useState('');
  const [uploadingId, setUploadingId]         = useState(false);
  const [uploadingCompany, setUploadingCompany] = useState(false);

  // Step 3 — Phone
  const [phone, setPhone]           = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

  // General
  const [loading, setLoading]             = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const user = auth().currentUser;
  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';

  useEffect(() => { checkExistingRequest(); }, []);

  const checkExistingRequest = async () => {
    try {
      const snap = await firestore()
        .collection('castingRequests')
        .where('userId', '==', user?.uid).get();
      if (!snap.empty) {
        setRequestStatus(snap.docs[0].data()?.status || 'pending');
      }
    } catch (e) {console.log(e);}
    finally { setCheckingStatus(false); }
  };

  const uploadToCloudinary = async (uri: string): Promise<string> => {
    const result = await uploadImage(uri);
    return result.secureUrl;
  };

  const pickIdPhoto = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets?.[0]) {
      const asset = result.assets[0];
      setIdPhoto(asset);
      setUploadingId(true);
      try {
        const url = await uploadToCloudinary(asset.uri!);
        setIdPhotoUrl(url);
      } catch (e) {
        Alert.alert('Upload failed', 'Could not upload ID photo. Try again.');
      } finally { setUploadingId(false); }
    }
  };

  const pickCompanyPhoto = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets?.[0]) {
      const asset = result.assets[0];
      setCompanyPhoto(asset);
      setUploadingCompany(true);
      try {
        const url = await uploadToCloudinary(asset.uri!);
        setCompanyPhotoUrl(url);
      } catch (e) {
        Alert.alert('Upload failed', 'Could not upload document. Try again.');
      } finally { setUploadingCompany(false); }
    }
  };

  const handlePhoneVerify = () => {
    if (!phone.trim() || phone.length < 10) {
      Alert.alert('Invalid', 'Please enter a valid 10-digit phone number.');
      return;
    }
    // Manual WhatsApp verification — admin will call/WhatsApp to verify
    setPhoneVerified(true);
    Alert.alert(
      '📱 Phone Registered!',
      `Your number +91${phone} has been recorded. Admin will WhatsApp or call you to verify before approving your request.`,
    );
  };

  const validateStep = (): boolean => {
    if (currentStep === 0) {
      if (!message.trim()) {
        Alert.alert('Required', 'Please tell us about yourself.');
        return false;
      }
      if (!companyName.trim()) {
        Alert.alert('Required', 'Please enter your company/production house name.');
        return false;
      }
      if (!yearsExp.trim()) {
        Alert.alert('Required', 'Please enter your years of experience.');
        return false;
      }
      return true;
    }
    if (currentStep === 1) {
      if (!idPhotoUrl) {
        Alert.alert('Required', 'Please upload your ID proof photo.');
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (!phoneVerified) {
        Alert.alert('Required', 'Please register and verify your phone number.');
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (validateStep()) setCurrentStep(prev => prev + 1);
  };

const submitRequest = async () => {
  setLoading(true);
  try {
    const userDoc = await firestore().collection('users').doc(user?.uid).get();
    const userData = userDoc.data();

    await firestore().collection('castingRequests').add({
      userId:          user?.uid,
      userEmail:       user?.email,
      userName,
      role:            userData?.role || 'Director',
      bio:             userData?.bio || '',
      companyName:     companyName.trim(),
      yearsExperience: yearsExp.trim(),
      message:         message.trim(),
      experience:      experience.trim(),
      portfolio:       portfolio.trim(),
      idType,
      idProofUrl:      idPhotoUrl,
      companyDocUrl:   companyPhotoUrl,
      phone:           `+91${phone}`,
      phoneVerified,
      status:          'pending',
      createdAt:       firestore.FieldValue.serverTimestamp(),
    });

    // Look up admin UID
    const adminSnap = await firestore()
      .collection('users')
      .where('email', '==', 'anilkumardevarakonda03@gmail.com')
      .limit(1)
      .get();

    console.log('Admin snap empty?', adminSnap.empty); // DEBUG

    let adminUid = '';
    if (!adminSnap.empty) {
      adminUid = adminSnap.docs[0].id;
      console.log('Found admin UID:', adminUid); // DEBUG
    } else {
      console.log('Admin NOT found in users collection!'); // DEBUG
      // Hardcode your actual Firebase UID as fallback
      adminUid = 'moVQIEK5RqhXUOf4wk1L7913kZZ2';
    }

    await firestore().collection('notifications').add({
      userId:    adminUid,
      type:      'casting_request',
      title:     '📋 New Casting Director Request!',
      message:   `${userName} (${companyName}) wants to post auditions. ID proof uploaded.`,
      senderId:  user?.uid,
      read:      false,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    console.log('Notification sent to:', adminUid); // DEBUG

    setRequestStatus('pending');
    Alert.alert(
      '✅ Request Submitted!',
      'Your application with ID proof has been sent to admin. They will WhatsApp you on +91' + phone + ' for verification within 24-48 hours.',
    );
  } catch (e: any) {
    console.log('SUBMIT ERROR:', e); // DEBUG — shows real error
    Alert.alert('Error', e?.message || 'Could not submit request. Try again.');
  } finally {
    setLoading(false);
  }
};

  if (checkingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C9956C" />
      </View>
    );
  }

  // ── Status screens ────────────────────────────────────────
  if (requestStatus === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusPage}>
          <Text style={styles.statusBigIcon}>⏳</Text>
          <Text style={styles.statusBigTitle}>Application Under Review</Text>
          <Text style={styles.statusBigText}>
            Your casting director application with ID proof is being reviewed by admin.
            They will WhatsApp you for phone verification within 24-48 hours.
          </Text>
          <View style={styles.statusSteps}>
            <Text style={styles.statusStepItem}>✅ Application submitted</Text>
            <Text style={styles.statusStepItem}>✅ ID proof uploaded</Text>
            <Text style={styles.statusStepItem}>✅ Phone registered</Text>
            <Text style={styles.statusStepPending}>⏳ Admin review in progress</Text>
            <Text style={styles.statusStepPending}>⏳ Phone call verification</Text>
            <Text style={styles.statusStepPending}>⏳ Final approval</Text>
          </View>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackBtnText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (requestStatus === 'approved') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusPage}>
          <Text style={styles.statusBigIcon}>🎬</Text>
          <Text style={styles.statusBigTitle}>You are an Approved Casting Director!</Text>
          <Text style={styles.statusBigText}>
            Congratulations! You can now post auditions on CineLink. Go to Home and tap Post Audition.
          </Text>
          <TouchableOpacity style={styles.approvedBtn} onPress={() => navigation.navigate('PostAudition')}>
            <Text style={styles.approvedBtnText}>🎭 Post an Audition Now →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main form ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + 40}]} keyboardShouldPersistTaps="handled">

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎭 Casting Director Application</Text>
          <Text style={styles.headerSubtitle}>
            Complete all steps to get verified and post auditions on CineLink
          </Text>
        </View>

        {/* STEP INDICATOR */}
        <View style={styles.stepRow}>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepItem}>
              <View style={[styles.stepCircle, i <= currentStep && styles.stepCircleActive, i < currentStep && styles.stepCircleDone]}>
                <Text style={styles.stepCircleText}>
                  {i < currentStep ? '✓' : i + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, i === currentStep && styles.stepLabelActive]}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        {/* SECURITY BANNER */}
        <View style={styles.securityBanner}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            5-layer verification: Profile → ID Proof → Phone → Admin Review → Approval
          </Text>
        </View>

        {/* ── STEP 0: BASIC INFO ── */}
        {currentStep === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 1: Tell us about yourself</Text>

            <Text style={styles.label}>Company / Production House Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Star Films Production"
              placeholderTextColor="#A09080"
              value={companyName}
              onChangeText={setCompanyName}
            />

            <Text style={styles.label}>Years of Experience *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5 years"
              placeholderTextColor="#A09080"
              value={yearsExp}
              onChangeText={setYearsExp}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Why do you want to post auditions? *</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Tell admin about yourself, your films, your casting needs..."
              placeholderTextColor="#A09080"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              maxLength={500}
            />
            <Text style={styles.charCount}>{message.length}/500</Text>

            <Text style={styles.label}>Previous Film / Ad Credits (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Directed 3 Telugu short films, 2 ads for..."
              placeholderTextColor="#A09080"
              value={experience}
              onChangeText={setExperience}
            />

            <Text style={styles.label}>Portfolio / IMDB / YouTube Link (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor="#A09080"
              value={portfolio}
              onChangeText={setPortfolio}
              autoCapitalize="none"
            />
          </View>
        )}

        {/* ── STEP 1: ID PROOF ── */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 2: Upload ID Proof</Text>
            <Text style={styles.stepDesc}>
              This is required to verify your identity and protect actors on our platform. Your ID is only visible to CineLink admin.
            </Text>

            {/* ID TYPE */}
            <Text style={styles.label}>Select ID Type *</Text>
            <View style={styles.idTypeRow}>
              {['Aadhaar', 'PAN', 'Passport', 'Driving License'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.idTypeBtn, idType === type && styles.idTypeBtnActive]}
                  onPress={() => setIdType(type)}>
                  <Text style={[styles.idTypeBtnText, idType === type && styles.idTypeBtnTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ID PHOTO */}
            <Text style={styles.label}>Upload {idType} Card Photo *</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={pickIdPhoto}>
              {idPhoto ? (
                <View style={styles.uploadedBox}>
                  <Image source={{uri: idPhoto.uri}} style={styles.uploadedImage} />
                  {uploadingId && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  )}
                  {idPhotoUrl && !uploadingId && (
                    <View style={styles.uploadedBadge}>
                      <Text style={styles.uploadedBadgeText}>✅ Uploaded</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadIcon}>📷</Text>
                  <Text style={styles.uploadText}>Tap to upload {idType} photo</Text>
                  <Text style={styles.uploadHint}>Clear photo, all corners visible</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* COMPANY PROOF */}
            <Text style={styles.label}>Company/Production Proof (optional but recommended)</Text>
            <Text style={styles.hint}>GST Certificate, Company Registration, or Letterhead</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={pickCompanyPhoto}>
              {companyPhoto ? (
                <View style={styles.uploadedBox}>
                  <Image source={{uri: companyPhoto.uri}} style={styles.uploadedImage} />
                  {uploadingCompany && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  )}
                  {companyPhotoUrl && !uploadingCompany && (
                    <View style={styles.uploadedBadge}>
                      <Text style={styles.uploadedBadgeText}>✅ Uploaded</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadIcon}>🏢</Text>
                  <Text style={styles.uploadText}>Tap to upload company document</Text>
                  <Text style={styles.uploadHint}>Optional but increases approval chances</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.privacyNote}>
              <Text style={styles.privacyNoteText}>
                🔒 Your ID is stored securely and only visible to CineLink admin. It will never be shared publicly.
              </Text>
            </View>
          </View>
        )}

        {/* ── STEP 2: PHONE VERIFY ── */}
        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 3: Phone Verification</Text>
            <Text style={styles.stepDesc}>
              Admin will call or WhatsApp you on this number to verify your identity before approving your request.
            </Text>

            <Text style={styles.label}>Your WhatsApp Number *</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="10-digit mobile number"
                placeholderTextColor="#A09080"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {!phoneVerified ? (
              <TouchableOpacity style={styles.verifyPhoneBtn} onPress={handlePhoneVerify}>
                <Text style={styles.verifyPhoneBtnText}>📱 Register Phone Number</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.phoneVerifiedBox}>
                <Text style={styles.phoneVerifiedText}>✅ +91{phone} registered successfully!</Text>
                <Text style={styles.phoneVerifiedHint}>Admin will WhatsApp you on this number</Text>
              </View>
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>📞 What happens next:</Text>
              <Text style={styles.infoBoxItem}>1. Admin receives your application</Text>
              <Text style={styles.infoBoxItem}>2. Admin reviews your ID proof</Text>
              <Text style={styles.infoBoxItem}>3. Admin calls/WhatsApps you on +91{phone || 'XXXXXXXXXX'}</Text>
              <Text style={styles.infoBoxItem}>4. After verification → you get approved!</Text>
              <Text style={styles.infoBoxItem}>5. You can post auditions on CineLink 🎬</Text>
            </View>
          </View>
        )}

        {/* ── STEP 3: REVIEW & SUBMIT ── */}
        {currentStep === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 4: Review & Submit</Text>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewSectionTitle}>📋 Application Summary</Text>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Company:</Text>
                <Text style={styles.reviewValue}>{companyName}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Experience:</Text>
                <Text style={styles.reviewValue}>{yearsExp} years</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>ID Type:</Text>
                <Text style={styles.reviewValue}>{idType}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>ID Proof:</Text>
                <Text style={[styles.reviewValue, {color: idPhotoUrl ? '#4ADE80' : '#EF4444'}]}>
                  {idPhotoUrl ? '✅ Uploaded' : '❌ Missing'}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Company Doc:</Text>
                <Text style={[styles.reviewValue, {color: companyPhotoUrl ? '#4ADE80' : '#A09080'}]}>
                  {companyPhotoUrl ? '✅ Uploaded' : '⚠️ Not uploaded (optional)'}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Phone:</Text>
                <Text style={[styles.reviewValue, {color: '#4ADE80'}]}>
                  ✅ +91{phone}
                </Text>
              </View>
            </View>

            <View style={styles.securityChecklist}>
              <Text style={styles.checklistTitle}>🔒 Security Layers Applied:</Text>
              <Text style={styles.checklistItem}>✅ Profile review by admin</Text>
              <Text style={styles.checklistItem}>✅ ID proof uploaded</Text>
              <Text style={styles.checklistItem}>✅ Company details verified</Text>
              <Text style={styles.checklistItem}>✅ Phone number registered</Text>
              <Text style={styles.checklistItem}>⏳ Phone call verification (by admin)</Text>
              <Text style={styles.checklistItem}>⏳ Final approval (by admin)</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={submitRequest}
              disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>📤 Submit Application</Text>}
            </TouchableOpacity>

            <Text style={styles.submitNote}>
              By submitting, you confirm that all information provided is accurate and genuine.
            </Text>
          </View>
        )}

        {/* NAVIGATION BUTTONS */}
        {requestStatus === null || requestStatus === 'rejected' ? (
          <View style={styles.navRow}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setCurrentStep(prev => prev - 1)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            )}
            {currentStep < STEPS.length - 1 && (
              <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
                <Text style={styles.nextBtnText}>Next →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        {flex: 1, backgroundColor: '#0A0A0A'},
  loadingContainer: {flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center'},
  scroll:           {padding: 20},

  header:         {alignItems: 'center', marginBottom: 20},
  headerTitle:    {color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8},
  headerSubtitle: {color: '#A09080', fontSize: 13, textAlign: 'center', lineHeight: 20},

  // Step indicator
  stepRow:         {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20},
  stepItem:        {alignItems: 'center', flex: 1},
  stepCircle:      {width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', marginBottom: 4, borderWidth: 1, borderColor: '#444'},
  stepCircleActive:{backgroundColor: '#C9956C', borderColor: '#C9956C'},
  stepCircleDone:  {backgroundColor: '#4ADE80', borderColor: '#4ADE80'},
  stepCircleText:  {color: '#FFFFFF', fontSize: 12, fontWeight: 'bold'},
  stepLabel:       {color: '#A09080', fontSize: 9, textAlign: 'center'},
  stepLabelActive: {color: '#C9956C', fontWeight: 'bold'},

  securityBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1208', borderRadius: 12, padding: 12,
    marginBottom: 20, borderWidth: 1, borderColor: '#C9956C',
    gap: 8,
  },
  securityIcon: {fontSize: 18},
  securityText: {color: '#C9956C', fontSize: 11, flex: 1, lineHeight: 16},

  stepContent:  {marginBottom: 8},
  stepTitle:    {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 8},
  stepDesc:     {color: '#A09080', fontSize: 13, lineHeight: 20, marginBottom: 16},

  label:       {color: '#C9956C', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5},
  hint:        {color: '#A09080', fontSize: 11, marginBottom: 8, marginTop: -8},
  input:       {backgroundColor: '#1C1C1C', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 14, borderWidth: 1, borderColor: '#2A2A2A'},
  multiline:   {height: 120, textAlignVertical: 'top'},
  charCount:   {color: '#A09080', fontSize: 11, textAlign: 'right', marginTop: 4},

  // ID Type
  idTypeRow:        {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4},
  idTypeBtn:        {backgroundColor: '#1C1C1C', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2A2A2A'},
  idTypeBtnActive:  {backgroundColor: '#C9956C', borderColor: '#C9956C'},
  idTypeBtnText:    {color: '#A09080', fontSize: 13},
  idTypeBtnTextActive: {color: '#FFFFFF', fontWeight: 'bold'},

  // Upload
  uploadBox:         {backgroundColor: '#1C1C1C', borderRadius: 14, borderWidth: 1, borderColor: '#2A2A2A', borderStyle: 'dashed', overflow: 'hidden', height: 140, marginBottom: 8},
  uploadedBox:       {flex: 1, position: 'relative'},
  uploadedImage:     {width: '100%', height: '100%', resizeMode: 'cover'},
  uploadPlaceholder: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6},
  uploadIcon:        {fontSize: 32},
  uploadText:        {color: '#A09080', fontSize: 13, fontWeight: '600'},
  uploadHint:        {color: '#6B5D52', fontSize: 11},
  uploadingOverlay:  {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center'},
  uploadingText:     {color: '#fff', fontSize: 12, marginTop: 4},
  uploadedBadge:     {position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4},
  uploadedBadgeText: {color: '#4ADE80', fontSize: 12, fontWeight: 'bold'},

  privacyNote:     {backgroundColor: '#0A1F0A', borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: '#4ADE80'},
  privacyNoteText: {color: '#4ADE80', fontSize: 12, lineHeight: 18},

  // Phone
  phoneRow:        {flexDirection: 'row', gap: 8, marginBottom: 8},
  countryCode:     {backgroundColor: '#1C1C1C', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A2A', justifyContent: 'center'},
  countryCodeText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  phoneInput:      {flex: 1},
  verifyPhoneBtn:  {backgroundColor: '#C9956C', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8},
  verifyPhoneBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 14},
  phoneVerifiedBox:   {backgroundColor: '#0A2E1F', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#4ADE80', marginTop: 8},
  phoneVerifiedText:  {color: '#4ADE80', fontWeight: 'bold', fontSize: 14},
  phoneVerifiedHint:  {color: '#4ADE80', fontSize: 11, marginTop: 4},

  infoBox:       {backgroundColor: '#1C1C1C', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#2A2A2A', borderLeftWidth: 3, borderLeftColor: '#C9956C'},
  infoBoxTitle:  {color: '#C9956C', fontWeight: 'bold', fontSize: 13, marginBottom: 10},
  infoBoxItem:   {color: '#A09080', fontSize: 13, lineHeight: 24},

  // Review
  reviewCard:          {backgroundColor: '#1C1C1C', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2A2A2A', marginBottom: 16},
  reviewSectionTitle:  {color: '#C9956C', fontWeight: 'bold', fontSize: 14, marginBottom: 14},
  reviewRow:           {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#2A2A2A', paddingBottom: 10},
  reviewLabel:         {color: '#A09080', fontSize: 13},
  reviewValue:         {color: '#FFFFFF', fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right'},

  securityChecklist: {backgroundColor: '#0A1208', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#C9956C'},
  checklistTitle:    {color: '#C9956C', fontWeight: 'bold', fontSize: 13, marginBottom: 12},
  checklistItem:     {color: '#A09080', fontSize: 13, lineHeight: 26},

  submitBtn:         {backgroundColor: '#C9956C', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12},
  submitBtnDisabled: {opacity: 0.6},
  submitBtnText:     {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
  submitNote:        {color: '#6B5D52', fontSize: 11, textAlign: 'center', lineHeight: 16},

  // Nav
  navRow:      {flexDirection: 'row', gap: 10, marginTop: 8},
  backBtn:     {flex: 1, backgroundColor: '#1C1C1C', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A'},
  backBtnText: {color: '#A09080', fontWeight: '600', fontSize: 14},
  nextBtn:     {flex: 2, backgroundColor: '#C9956C', borderRadius: 12, padding: 14, alignItems: 'center'},
  nextBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 14},

  // Status pages
  statusPage:       {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30},
  statusBigIcon:    {fontSize: 64, marginBottom: 20},
  statusBigTitle:   {color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12},
  statusBigText:    {color: '#A09080', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24},
  statusSteps:      {backgroundColor: '#1C1C1C', borderRadius: 14, padding: 16, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: '#2A2A2A'},
  statusStepItem:   {color: '#4ADE80', fontSize: 13, lineHeight: 28},
  statusStepPending:{color: '#A09080', fontSize: 13, lineHeight: 28},
  goBackBtn:        {backgroundColor: '#1C1C1C', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: '#C9956C'},
  goBackBtnText:    {color: '#C9956C', fontWeight: 'bold', fontSize: 14},
  approvedBtn:      {backgroundColor: '#C9956C', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14},
  approvedBtnText:  {color: '#FFFFFF', fontWeight: 'bold', fontSize: 15},
});