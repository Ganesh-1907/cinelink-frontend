import React, {useState} from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const PROJECT_TYPES = ['Short Film', 'Feature Film', 'Web Series', 'Ad Film', 'Music Video', 'Documentary'];

const ALL_ROLES = [
  'Hero', 'Heroine', 'Villain', 'Supporting Actor', 'Child Artist',
  'DOP', 'Editor', 'Music Director', 'Sound Designer', 'Writer',
  'Makeup Artist', 'Costume Designer', 'Art Director',
  'Stunt Coordinator', 'Producer',
];

const LANGUAGES = ['Telugu', 'Hindi', 'Tamil', 'Malayalam', 'Kannada', 'English', 'Other'];

export default function CreateProjectScreen({navigation}: any) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Short Film');
  const [language, setLanguage] = useState('Telugu');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const currentUser = auth().currentUser;
  const directorName =
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'Director';

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role],
    );
  };

  const createProject = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Info', 'Please enter a project title.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing Info', 'Please enter a location.');
      return;
    }
    if (selectedRoles.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one role needed.');
      return;
    }

    setLoading(true);
    try {
      const rolesNeeded = selectedRoles.map(role => ({
        role,
        filled: false,
        memberId: null,
        memberName: null,
      }));

      await firestore().collection('projects').add({
        title: title.trim(),
        type,
        language,
        location: location.trim(),
        description: description.trim(),
        directorId: currentUser?.uid,
        directorName,
        directorEmail: currentUser?.email,
        rolesNeeded,
        status: 'Recruiting',
        membersCount: 1,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('🎬 Project Created!', 'Your project is now live. Crew can now apply!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e: any) {
      console.log('CREATE PROJECT ERROR:', e);
      Alert.alert('Error', e.message || 'Could not create project. Try again.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Project</Text>
        </View>

        <View style={styles.section}>

          {/* PROJECT TITLE */}
          <Text style={styles.label}>Project Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Telugu Action Short Film"
            placeholderTextColor="#A09080"
            value={title}
            onChangeText={setTitle}
          />

          {/* PROJECT TYPE */}
          <Text style={styles.label}>Project Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {PROJECT_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, type === t && styles.chipActive]}
                onPress={() => setType(t)}>
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* LANGUAGE */}
          <Text style={styles.label}>Language</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.chip, language === l && styles.chipActive]}
                onPress={() => setLanguage(l)}>
                <Text style={[styles.chipText, language === l && styles.chipTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* LOCATION */}
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Hyderabad, Telangana"
            placeholderTextColor="#A09080"
            value={location}
            onChangeText={setLocation}
          />

          {/* DESCRIPTION */}
          <Text style={styles.label}>Project Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Tell crew about your project, story, timeline..."
            placeholderTextColor="#A09080"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {/* ROLES NEEDED */}
          <Text style={styles.label}>Roles Needed * (tap to select)</Text>
          <View style={styles.rolesGrid}>
            {ALL_ROLES.map(role => (
              <TouchableOpacity
                key={role}
                style={[styles.roleChip, selectedRoles.includes(role) && styles.roleChipActive]}
                onPress={() => toggleRole(role)}>
                <Text style={[styles.roleChipText, selectedRoles.includes(role) && styles.roleChipTextActive]}>
                  {selectedRoles.includes(role) ? '✓ ' : ''}{role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedRoles.length > 0 && (
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedInfoText}>
                ✅ {selectedRoles.length} role{selectedRoles.length > 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          {/* CREATE BUTTON */}
          <TouchableOpacity
            style={[styles.createBtn, loading && {opacity: 0.5}]}
            onPress={createProject}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createBtnText}>🎬 Create Project</Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: {marginRight: 12},
  backText: {color: '#C9956C', fontSize: 26, fontWeight: 'bold'},
  headerTitle: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
  section: {padding: 16},
  label: {
    color: '#C9956C', fontSize: 13, fontWeight: '700',
    marginBottom: 8, marginTop: 16,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1C1C1C', borderRadius: 12,
    padding: 14, color: '#FFFFFF', fontSize: 15,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  multiline: {height: 100, textAlignVertical: 'top'},
  chipScroll: {marginBottom: 4},
  chip: {
    backgroundColor: '#1C1C1C', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    marginRight: 8, borderWidth: 1, borderColor: '#2A2A2A',
  },
  chipActive: {backgroundColor: '#C9956C', borderColor: '#C9956C'},
  chipText: {color: '#A09080', fontSize: 13, fontWeight: '500'},
  chipTextActive: {color: '#FFFFFF', fontWeight: 'bold'},
  rolesGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  roleChip: {
    backgroundColor: '#1C1C1C', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  roleChipActive: {backgroundColor: '#1A3020', borderColor: '#4ADE80'},
  roleChipText: {color: '#A09080', fontSize: 13},
  roleChipTextActive: {color: '#4ADE80', fontWeight: 'bold'},
  selectedInfo: {
    backgroundColor: '#1A3020', borderRadius: 10,
    padding: 10, marginTop: 8,
    borderWidth: 1, borderColor: '#4ADE80',
  },
  selectedInfoText: {color: '#4ADE80', fontSize: 13, fontWeight: '600'},
  createBtn: {
    backgroundColor: '#C9956C', borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  createBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
});