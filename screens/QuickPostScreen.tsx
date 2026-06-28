import React, {useState} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, TextInput, Image, SafeAreaView, StatusBar,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const GEMINI_API_KEY = 'AIzaSyAIAb0bUWvHZHR1YE6_pVKI45JQJ5owA4g';
const GEMINI_VISION_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

type AuditionForm = {
  title: string; role: string; location: string; lastDate: string;
  description: string; requirements: string; contactInfo: string;
  gender: string; ageRange: string; language: string;
};

const EMPTY_FORM: AuditionForm = {
  title: '', role: '', location: '', lastDate: '',
  description: '', requirements: '', contactInfo: '',
  gender: '', ageRange: '', language: '',
};

const FIELDS: {key: keyof AuditionForm; label: string; multiline?: boolean}[] = [
  {key: 'title',        label: '🎬 Film / Project Title'},
  {key: 'role',         label: '🎭 Role'},
  {key: 'language',     label: '🗣️ Language'},
  {key: 'location',     label: '📍 Location'},
  {key: 'lastDate',     label: '📅 Last Date / Audition Date'},
  {key: 'gender',       label: '👤 Gender'},
  {key: 'ageRange',     label: '🔢 Age Range'},
  {key: 'requirements', label: '📋 Requirements', multiline: true},
  {key: 'description',  label: '📝 Description',  multiline: true},
  {key: 'contactInfo',  label: '📞 Contact Info'},
];

/* ── safe error message helper ── */
const getErrorMessage = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Unknown error occurred';
};

export default function QuickPostScreen({navigation}: any) {
  const [imageUri,    setImageUri]    = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [form,        setForm]        = useState<AuditionForm>(EMPTY_FORM);
  const [scanning,    setScanning]    = useState(false);
  const [posting,     setPosting]     = useState(false);
  const [aiDone,      setAiDone]      = useState(false);

  const user = auth().currentUser;
  const directorName =
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Admin';

  /* ── PICK IMAGE ── */
  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.8,
      });
      if (result.didCancel || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setImageUri(asset.uri || null);
      setImageBase64(asset.base64 || null);
      setAiDone(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      console.log('Image pick error:', e);
    }
  };

  /* ── SCAN WITH AI ── */
  const scanWithAI = async () => {
    if (!imageBase64) {
      Alert.alert('No Image', 'Please pick an audition poster first.');
      return;
    }

    setScanning(true);

    try {
      const prompt = `You are analyzing an Indian cinema audition poster.
Extract ALL visible information and return ONLY a valid JSON object with these exact keys:
{"title":"","role":"","location":"","lastDate":"","description":"","requirements":"","contactInfo":"","gender":"","ageRange":"","language":""}
Rules: No markdown, no explanation, no code blocks. Only the JSON object. If a field is not visible, use empty string.`;

      const requestBody = {
        contents: [{
          parts: [
            {inline_data: {mime_type: 'image/jpeg', data: imageBase64}},
            {text: prompt},
          ],
        }],
        generationConfig: {temperature: 0.1, maxOutputTokens: 500},
      };

      /* ── safe fetch ── */
      let responseText = '';
      try {
        const response = await fetch(GEMINI_VISION_URL, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(requestBody),
        });

        const responseData = await response.json();

        if (!response.ok) {
          const errMsg =
            responseData?.error?.message ||
            responseData?.message ||
            `API Error ${response.status}`;
          throw new Error(errMsg);
        }

        responseText =
          responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (fetchErr) {
        throw new Error(`Network error: ${getErrorMessage(fetchErr)}`);
      }

      if (!responseText) {
        throw new Error('AI returned empty response. Try again.');
      }

      /* ── safe JSON parse ── */
      let parsed: any = {};
      try {
        const cleaned = responseText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error('AI could not read the poster clearly. Try a clearer image.');
      }

      setForm({
        title:        String(parsed.title        || ''),
        role:         String(parsed.role         || ''),
        location:     String(parsed.location     || ''),
        lastDate:     String(parsed.lastDate     || ''),
        description:  String(parsed.description  || ''),
        requirements: String(parsed.requirements || ''),
        contactInfo:  String(parsed.contactInfo  || ''),
        gender:       String(parsed.gender       || ''),
        ageRange:     String(parsed.ageRange     || ''),
        language:     String(parsed.language     || ''),
      });

      setAiDone(true);

    } catch (e) {
      console.log('AI Scan error:', e);
      Alert.alert(
        '❌ AI Scan Failed',
        getErrorMessage(e) ||
        'Could not read the poster. Please try a clearer image or fill the form manually.',
      );
    } finally {
      setScanning(false);
    }
  };

  /* ── POST AUDITION ── */
  const postAudition = async () => {
    if (!form.title || !form.role || !form.location) {
      Alert.alert('Missing Fields', 'Please fill at least Title, Role and Location.');
      return;
    }

    setPosting(true);

    try {
      await firestore().collection('auditions').add({
        ...form,
        directorId:    user?.uid,
        directorEmail: user?.email,
        directorName,
        status:        'Open',
        posterImage:   imageUri || null,
        isActive:      true,
        applicants:    [],
        createdAt:     firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('✅ Posted!', 'Audition posted successfully!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e) {
      console.log('Post audition error:', e);
      Alert.alert('Error', 'Failed to post audition. Check your connection and try again.');
    } finally {
      setPosting(false);
    }
  };

  const updateField = (key: keyof AuditionForm, value: string) =>
    setForm(prev => ({...prev, [key]: value}));

  /* ── RENDER ── */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">

        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>⚡ Quick Post</Text>
          <Text style={styles.pageSubtitle}>
            Upload an audition poster — AI will auto-fill the form
          </Text>
        </View>

        {/* IMAGE PICKER */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{uri: imageUri}} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.imagePickerContent}>
              <Text style={styles.imagePickerIcon}>🖼️</Text>
              <Text style={styles.imagePickerText}>Tap to upload audition poster</Text>
              <Text style={styles.imagePickerHint}>JPG, PNG supported</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* SCAN BUTTON */}
        {imageUri && !aiDone && (
          <TouchableOpacity
            style={[styles.scanBtn, scanning && styles.disabledBtn]}
            onPress={scanWithAI}
            disabled={scanning}>
            {scanning ? (
              <View style={styles.row}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.scanBtnText}> AI is reading the poster...</Text>
              </View>
            ) : (
              <Text style={styles.scanBtnText}>✨ Scan with AI</Text>
            )}
          </TouchableOpacity>
        )}

        {/* MANUAL FILL OPTION */}
        {imageUri && !aiDone && !scanning && (
          <TouchableOpacity
            style={styles.manualBtn}
            onPress={() => setAiDone(true)}>
            <Text style={styles.manualBtnText}>✏️ Fill manually instead</Text>
          </TouchableOpacity>
        )}

        {/* SUCCESS BANNER */}
        {aiDone && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>
              ✅ AI filled the form! Review and edit below before posting.
            </Text>
          </View>
        )}

        {/* FORM */}
        {(aiDone || imageUri) && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>
              {aiDone ? '📋 Review & Edit' : '📋 Fill Manually'}
            </Text>

            {FIELDS.map(field => (
              <View key={field.key} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={[styles.fieldInput, field.multiline && styles.multilineInput]}
                  value={form[field.key]}
                  onChangeText={v => updateField(field.key, v)}
                  placeholder={`Enter ${field.label.replace(/.*\s/, '')}`}
                  placeholderTextColor="#A09080"
                  multiline={field.multiline}
                  textAlignVertical={field.multiline ? 'top' : 'center'}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.postBtn, posting && styles.disabledBtn]}
              onPress={postAudition}
              disabled={posting}>
              {posting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.postBtnText}>🚀 Post Audition</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  scroll: {padding: 16, paddingBottom: 40},
  row: {flexDirection: 'row', alignItems: 'center'},

  headerSection: {marginBottom: 20},
  pageTitle: {color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: 0.5},
  pageSubtitle: {color: '#A09080', fontSize: 14, marginTop: 4},

  imagePicker: {
    backgroundColor: '#1C1C1C', borderRadius: 16, borderWidth: 2,
    borderColor: '#2A2A2A', borderStyle: 'dashed', height: 220,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', marginBottom: 16,
  },
  imagePickerContent: {alignItems: 'center', gap: 8},
  imagePickerIcon: {fontSize: 40},
  imagePickerText: {color: '#A09080', fontSize: 15, fontWeight: '600'},
  imagePickerHint: {color: '#A09080', fontSize: 12},
  previewImage: {width: '100%', height: '100%'},

  scanBtn: {
    backgroundColor: '#C9956C', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
  },
  scanBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},

  manualBtn: {
    backgroundColor: '#1C1C1C', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  manualBtnText: {color: '#A09080', fontSize: 14},

  disabledBtn: {opacity: 0.6},

  successBanner: {
    backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#16A34A', marginBottom: 16,
  },
  successText: {color: '#22C55E', fontSize: 13, fontWeight: '600'},

  formSection: {
    backgroundColor: '#1C1C1C', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#2A2A2A',
  },
  sectionTitle: {color: '#C9956C', fontSize: 16, fontWeight: '700', marginBottom: 16},

  fieldContainer: {marginBottom: 14},
  fieldLabel: {
    color: '#C9956C', fontSize: 11, fontWeight: '700',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: '#2A2A2A', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, color: '#FFFFFF', fontSize: 14,
    borderWidth: 1, borderColor: '#333333',
  },
  multilineInput: {minHeight: 80, paddingTop: 10},

  postBtn: {
    backgroundColor: '#C9956C', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  postBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5},
});