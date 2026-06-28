import React, {useEffect, useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, StatusBar, ActivityIndicator,
  Image, Alert, Modal,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const CLOUD_NAME    = 'dipwobgzb';
const UPLOAD_PRESET = 'cinelink_upload';
const ADMIN_EMAIL   = 'anilkumardevarakonda03@gmail.com';

const ROLES       = ['Hero', 'Heroine', 'Villain', 'Supporting', 'Child Artist', 'Comedian', 'Any Role'];
const CATEGORIES  = ['Movies', 'Short Films', 'Theatre', 'YouTube / Web', 'TV / OTT'];

export default function PostAuditionScreen({navigation}: any) {
  const [title,               setTitle]               = useState('');
  const [description,         setDescription]         = useState('');
  const [location,            setLocation]            = useState('');
  const [role,                setRole]                = useState('');
  const [ageMin,              setAgeMin]              = useState('');
  const [ageMax,              setAgeMax]              = useState('');
  const [gender,              setGender]              = useState('Any');
  const [lastDate,            setLastDate]            = useState('');
  const [language,            setLanguage]            = useState('');
  const [contactLink,         setContactLink]         = useState('');
  const [poster,              setPoster]              = useState<any>(null);
  const [posterUrl,           setPosterUrl]           = useState('');
  const [loading,             setLoading]             = useState(false);
  const [uploading,           setUploading]           = useState(false);
  const [accessChecked,       setAccessChecked]       = useState(false);
  const [hasAccess,           setHasAccess]           = useState(false);
  const [agreedToGuidelines,  setAgreedToGuidelines]  = useState(false);
  const [showFullscreen,      setShowFullscreen]      = useState(false);
  const [category,            setCategory]            = useState('Movies');
  const [budget,              setBudget]              = useState('');
  const [positions,           setPositions]           = useState('');

  const user         = auth().currentUser;
  const isAdmin      = user?.email === ADMIN_EMAIL;
  const directorName = user?.displayName || user?.email?.split('@')[0] || 'Director';
  const pendingUploadRef = React.useRef<Promise<string> | null>(null);

  useEffect(() => { checkAccess(); }, []);

  const checkAccess = async () => {
    try {
      if (isAdmin) {
        setHasAccess(true);
        setAccessChecked(true);
        return;
      }
      const userDoc  = await firestore().collection('users').doc(user?.uid).get();
      const userData = userDoc.data();
      setHasAccess(userData?.isApprovedDirector === true);
    } catch (e) {
      console.log(e);
      setHasAccess(false);
    } finally {
      setAccessChecked(true);
    }
  };

  // ── Poster: tap shows options if poster exists, else open gallery ──
  const pickPoster = () => {
    if (poster) {
      Alert.alert('🖼️ Poster Options', 'What would you like to do?', [
        {text: '🔄 Replace Photo',  onPress: () => openGallery()},
        {text: '🗑️ Remove Photo', style: 'destructive', onPress: () => { setPoster(null); setPosterUrl(''); }},
        {text: 'Cancel', style: 'cancel'},
      ]);
    } else {
      openGallery();
    }
  };

  const openGallery = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets?.[0]) {
      setPoster(result.assets[0]);
      pendingUploadRef.current = uploadPoster(result.assets[0].uri!);
    }
  };

  const uploadPoster = async (uri: string): Promise<string> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {uri, type: 'image/jpeg', name: 'poster.jpg'} as any);
      formData.append('upload_preset', UPLOAD_PRESET);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {method: 'POST', body: formData},
      );
      const data = await response.json();
      setPosterUrl(data.secure_url);
      return data.secure_url;
    } catch (e) {
      Alert.alert('Upload failed', 'Could not upload poster.');
      setPoster(null);
      setPosterUrl('');
      return '';
    } finally {
      setUploading(false);
      pendingUploadRef.current = null;
    }
  };

  const postAudition = async () => {
    if (!agreedToGuidelines) {
      Alert.alert('Required', 'Please confirm you agree to the posting guidelines.');
      return;
    }
    if (!title.trim() || !description.trim() || !location.trim()) {
      Alert.alert('Missing Info', 'Please fill Title, Description and Location.');
      return;
    }
    let resolvedPosterUrl = posterUrl;
    if (pendingUploadRef.current) {
      resolvedPosterUrl = await pendingUploadRef.current;
      if (!resolvedPosterUrl) return;
    }
    setLoading(true);
    try {
      const auditionRef = await firestore().collection('auditions').add({
  title:       title.trim(),
  description: description.trim(),
  location:    location.trim(),
  role:        role.trim(),
  ageRange:    ageMin && ageMax ? `${ageMin}-${ageMax}` : '',
  gender,
  lastDate:    lastDate.trim(),
  language:    language.trim(),
  contactLink: contactLink.trim(),
  posterUrl:   resolvedPosterUrl,
  directorId:    user?.uid,
  directorEmail: user?.email,
  directorName,
  isAdminPost:   isAdmin,
  status:        'Open',
  isActive:      true,
  applicants:    [],
  likes:         0,
  likedBy:       [],
  views:         0,
  category:      category,
  budget:        budget.trim(),
  positions:     positions.trim(),
  createdAt:     firestore.FieldValue.serverTimestamp(),
});

await firestore().collection('feedPosts').add({
  tab:          'auditions',
  text:         title.trim(),
  description:  description.trim(),
  posterUrl:    resolvedPosterUrl || '',
  location:     location.trim(),
  role:         role.trim(),
  auditionId:   auditionRef.id,
  directorId:    user?.uid,
  directorEmail: user?.email,
  directorName,
  createdAt:    firestore.FieldValue.serverTimestamp(),
});

      Alert.alert('Success! 🎬', 'Your audition is now live!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading state ──
  if (!accessChecked) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#C9956C" />
        <Text style={styles.checkingText}>Checking access...</Text>
      </View>
    );
  }

  // ── No Access ──
  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.noAccessContainer}>
          <Text style={styles.noAccessIcon}>🎭</Text>
          <Text style={styles.noAccessTitle}>Casting Director Access Required</Text>
          <Text style={styles.noAccessText}>
            Only verified casting directors can post auditions on CineLink. This ensures actors are protected from fake auditions.
          </Text>
          <View style={styles.securityList}>
            <Text style={styles.securityTitle}>🔒 Our 5-Layer Verification:</Text>
            <Text style={styles.securityItem}>✅ Profile review</Text>
            <Text style={styles.securityItem}>✅ Government ID proof</Text>
            <Text style={styles.securityItem}>✅ Company documents</Text>
            <Text style={styles.securityItem}>✅ Phone verification</Text>
            <Text style={styles.securityItem}>✅ Admin approval call</Text>
          </View>
          <TouchableOpacity style={styles.applyBtn} onPress={() => navigation.navigate('CastingRequest')}>
            <Text style={styles.applyBtnText}>📋 Apply for Casting Director Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Has Access — Post Form ──
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* ── FULLSCREEN POSTER MODAL ── */}
      <Modal
        visible={showFullscreen && poster !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullscreen(false)}>
        <TouchableOpacity
          style={styles.fullscreenBg}
          onPress={() => setShowFullscreen(false)}
          activeOpacity={1}>
          {poster?.uri ? (
            <Image
              source={{uri: poster.uri}}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}
          <Text style={styles.fullscreenHint}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

        {/* ACCESS BADGE */}
        <View style={styles.accessBadge}>
          <Text style={styles.accessBadgeText}>
            {isAdmin ? '🛡️ Admin — Posting Audition' : '✅ Verified Casting Director'}
          </Text>
        </View>

        <View style={styles.section}>

          {/* ── POSTER PICKER ── */}
          <TouchableOpacity
            style={styles.posterPicker}
            onPress={() => { if (poster) setShowFullscreen(true); else openGallery(); }}
            activeOpacity={0.9}>

            {poster?.uri ? (
              <>
                <Image source={{uri: poster.uri}} style={styles.posterImage} />

                {/* Edit button */}
                <TouchableOpacity style={styles.editPosterBtn} onPress={pickPoster}>
                  <Text style={styles.editPosterText}>✏️ Edit</Text>
                </TouchableOpacity>

                {/* Uploading overlay */}
                {uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                )}

                {/* Uploaded badge */}
                {posterUrl && !uploading && (
                  <View style={styles.uploadedBadge}>
                    <Text style={styles.uploadedText}>✅ Uploaded</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.posterPlaceholder}>
                <Text style={styles.posterIcon}>🎭</Text>
                <Text style={styles.posterText}>Tap to add poster</Text>
                <Text style={styles.posterSub}>Optional — portrait format recommended</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── FORM FIELDS ── */}
          <Text style={styles.label}>Audition Title *</Text>
          <TextInput style={styles.input} placeholder="e.g. Hero Role — Telugu Action Film" placeholderTextColor="#A09080" value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Description *</Text>
          <TextInput style={[styles.input, styles.multiline]} placeholder="Describe the role, storyline, requirements..." placeholderTextColor="#A09080" value={description} onChangeText={setDescription} multiline numberOfLines={4} />

          <Text style={styles.label}>Location *</Text>
          <TextInput style={styles.input} placeholder="e.g. Hyderabad, Telangana" placeholderTextColor="#A09080" value={location} onChangeText={setLocation} />

          <Text style={styles.label}>Role Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
            {ROLES.map(r => (
              <TouchableOpacity key={r} style={[styles.chip, role === r && styles.chipActive]} onPress={() => setRole(r)}>
                <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Category / Medium</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {['Male', 'Female', 'Any'].map(g => (
              <TouchableOpacity key={g} style={[styles.genderBtn, gender === g && styles.genderBtnActive]} onPress={() => setGender(g)}>
                <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Age Range</Text>
          <View style={styles.ageRow}>
            <TextInput style={[styles.input, {flex: 1}]} placeholder="Min age" placeholderTextColor="#A09080" value={ageMin} onChangeText={setAgeMin} keyboardType="numeric" />
            <Text style={styles.ageTo}>to</Text>
            <TextInput style={[styles.input, {flex: 1}]} placeholder="Max age" placeholderTextColor="#A09080" value={ageMax} onChangeText={setAgeMax} keyboardType="numeric" />
          </View>

          <Text style={styles.label}>Language</Text>
          <TextInput style={styles.input} placeholder="e.g. Telugu, Hindi, Tamil" placeholderTextColor="#A09080" value={language} onChangeText={setLanguage} />

          <Text style={styles.label}>Budget / Pay</Text>
          <TextInput style={styles.input} placeholder="e.g. ₹5,000/day or Negotiable" placeholderTextColor="#A09080" value={budget} onChangeText={setBudget} />

          <Text style={styles.label}>Positions Available</Text>
          <TextInput style={styles.input} placeholder="e.g. 2 Males, 1 Female" placeholderTextColor="#A09080" value={positions} onChangeText={setPositions} />

          <Text style={styles.label}>Last Date to Apply</Text>
          <TextInput style={styles.input} placeholder="e.g. June 30, 2026" placeholderTextColor="#A09080" value={lastDate} onChangeText={setLastDate} />

          <Text style={styles.label}>Contact / Apply Link</Text>
          <TextInput style={styles.input} placeholder="WhatsApp / Google Form / Instagram link" placeholderTextColor="#A09080" value={contactLink} onChangeText={setContactLink} autoCapitalize="none" />
          <Text style={styles.hint}>Actors will be redirected here when they tap Apply</Text>

          {/* GUIDELINES */}
          <View style={styles.guidelineBox}>
            <Text style={styles.guidelineTitle}>⚠️ Posting Guidelines</Text>
            <Text style={styles.guidelineItem}>✅ Only post real, genuine auditions</Text>
            <Text style={styles.guidelineItem}>✅ Contact link must be working</Text>
            <Text style={styles.guidelineItem}>✅ Role and location must be accurate</Text>
            <Text style={styles.guidelineItem}>❌ No money collection from actors</Text>
            <Text style={styles.guidelineItem}>❌ No fake or expired auditions</Text>
            <Text style={styles.guidelineItem}>❌ No duplicate posts</Text>
            <Text style={styles.guidelineWarning}>
              Violation = immediate access revocation and permanent ban
            </Text>
          </View>

          {/* AGREEMENT */}
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreedToGuidelines(!agreedToGuidelines)}>
            <View style={[styles.checkbox, agreedToGuidelines && styles.checkboxChecked]}>
              {agreedToGuidelines && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm this is a genuine audition and I agree to CineLink posting guidelines
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.postBtn, (loading || uploading || !agreedToGuidelines) && styles.postBtnDisabled]}
            onPress={postAudition}
            disabled={loading || uploading || !agreedToGuidelines}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.postBtnText}>🎭 Post Audition</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         {flex: 1, backgroundColor: '#0A0A0A'},
  container:    {flex: 1, backgroundColor: '#0A0A0A'},
  centerBox:    {flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', gap: 12},
  checkingText: {color: '#A09080', fontSize: 14},

  // No access
  noAccessContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30},
  noAccessIcon:      {fontSize: 64, marginBottom: 16},
  noAccessTitle:     {color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12},
  noAccessText:      {color: '#A09080', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24},
  securityList:      {backgroundColor: '#1C1C1C', borderRadius: 14, padding: 16, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: '#C9956C'},
  securityTitle:     {color: '#C9956C', fontWeight: 'bold', fontSize: 14, marginBottom: 10},
  securityItem:      {color: '#A09080', fontSize: 13, lineHeight: 28},
  applyBtn:          {backgroundColor: '#C9956C', borderRadius: 14, padding: 16, width: '100%', alignItems: 'center', marginBottom: 12},
  applyBtnText:      {color: '#FFFFFF', fontWeight: 'bold', fontSize: 15},
  backBtn:           {backgroundColor: '#1C1C1C', borderRadius: 14, padding: 14, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A'},
  backBtnText:       {color: '#A09080', fontWeight: '600', fontSize: 14},

  // Fullscreen modal
  fullscreenBg:    {flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center'},
  fullscreenImage: {width: '100%', height: '90%'},
  fullscreenHint:  {color: '#A09080', fontSize: 13, marginTop: 12},

  accessBadge:     {backgroundColor: '#0A2E1F', marginHorizontal: 20, marginTop: 10, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#4ADE80'},
  accessBadgeText: {color: '#4ADE80', fontWeight: 'bold', fontSize: 13},

  section: {padding: 20, paddingBottom: 48},

  // Poster
  posterPicker:      {width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 8, borderWidth: 1.5, borderColor: '#2A2A2A', borderStyle: 'dashed'},
  posterImage:       {width: '100%', aspectRatio: 3 / 4, resizeMode: 'cover', backgroundColor: '#1C1C1C'},
  posterPlaceholder: {height: 180, backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center', gap: 6},
  posterIcon:        {fontSize: 40},
  posterText:        {color: '#A09080', fontSize: 14, fontWeight: '600'},
  posterSub:         {color: '#A09080', fontSize: 12},
  uploadingOverlay:  {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', gap: 8},
  uploadingText:     {color: '#fff', fontSize: 13},
  uploadedBadge:     {position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4},
  uploadedText:      {color: '#4ADE80', fontSize: 12, fontWeight: 'bold'},
  editPosterBtn:     {position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, zIndex: 10},
  editPosterText:    {color: '#FFFFFF', fontSize: 12, fontWeight: 'bold'},

  label:    {color: '#C9956C', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 18, textTransform: 'uppercase', letterSpacing: 0.5},
  input:    {backgroundColor: '#1C1C1C', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2A2A2A'},
  multiline:{height: 100, textAlignVertical: 'top'},
  hint:     {color: '#A09080', fontSize: 12, marginTop: 6},

  chip:           {backgroundColor: '#1C1C1C', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8, borderWidth: 1, borderColor: '#2A2A2A'},
  chipActive:     {backgroundColor: '#C9956C', borderColor: '#C9956C'},
  chipText:       {color: '#A09080', fontSize: 13},
  chipTextActive: {color: '#FFFFFF', fontWeight: 'bold'},

  genderRow:           {flexDirection: 'row', gap: 8},
  genderBtn:           {flex: 1, backgroundColor: '#1C1C1C', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A'},
  genderBtnActive:     {backgroundColor: '#C9956C', borderColor: '#C9956C'},
  genderBtnText:       {color: '#A09080', fontSize: 13, fontWeight: '500'},
  genderBtnTextActive: {color: '#FFFFFF', fontWeight: 'bold'},

  ageRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  ageTo:  {color: '#A09080', fontSize: 14},

  postBtn:         {backgroundColor: '#C9956C', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32},
  postBtnDisabled: {opacity: 0.5},
  postBtnText:     {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},

  guidelineBox:     {backgroundColor: '#1A0A0A', borderRadius: 14, padding: 16, marginTop: 24, marginBottom: 8, borderWidth: 1, borderColor: '#DC2626'},
  guidelineTitle:   {color: '#FCA5A5', fontSize: 14, fontWeight: 'bold', marginBottom: 10},
  guidelineItem:    {color: '#A09080', fontSize: 13, lineHeight: 26},
  guidelineWarning: {color: '#EF4444', fontSize: 12, fontWeight: 'bold', marginTop: 10, textAlign: 'center'},

  checkboxRow:     {flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, marginBottom: 8},
  checkbox:        {width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#C9956C', justifyContent: 'center', alignItems: 'center', marginTop: 2},
  checkboxChecked: {backgroundColor: '#C9956C'},
  checkmark:       {color: '#FFFFFF', fontSize: 14, fontWeight: 'bold'},
  checkboxLabel:   {color: '#A09080', fontSize: 12, flex: 1, lineHeight: 18},
});