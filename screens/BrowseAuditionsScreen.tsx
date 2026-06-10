import React, {useEffect, useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
  Animated, ScrollView, Alert,
} from 'react-native';;
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

function SkeletonBlock({width, height, style}: any) {
  const shimmer = useState(new Animated.Value(0.3))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {toValue: 0.7, duration: 800, useNativeDriver: true}),
        Animated.timing(shimmer, {toValue: 0.3, duration: 800, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={[{width, height, backgroundColor: '#1C1C1C', borderRadius: 8, opacity: shimmer}, style]} />
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonBlock width="70%" height={22} style={{marginBottom: 10}} />
      <SkeletonBlock width="40%" height={16} style={{marginBottom: 8}} />
      <SkeletonBlock width="55%" height={16} style={{marginBottom: 8}} />
      <SkeletonBlock width="100%" height={44} style={{borderRadius: 12, marginTop: 8}} />
    </View>
  );
}

const ROLES = ['All', 'Hero', 'Heroine', 'Villain', 'Supporting', 'Child Artist', 'Comedian', 'Any Role'];

export default function BrowseAuditionsScreen({navigation}: any) {
  const currentUser = auth().currentUser;
  const [auditions, setAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    loadAuditions();
    loadSavedIds();
  }, []);

  const loadAuditions = async () => {
    try {
      setLoading(true);
      const snap = await firestore()
        .collection('auditions')
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get();
      const data = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));
      setAuditions(data);
    } catch (e: any) {
      try {
        const snap = await firestore()
          .collection('auditions')
          .orderBy('createdAt', 'desc')
          .get();
        const data = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setAuditions(data);
      } catch (err) {
        console.log('LOAD AUDITIONS ERROR:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSavedIds = async () => {
    if (!currentUser) return;
    try {
      const snap = await firestore()
        .collection('savedAuditions')
        .where('userId', '==', currentUser.uid)
        .get();
      setSavedIds(snap.docs.map(d => d.data().auditionId));
    } catch (e) {console.log(e);}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAuditions();
    await loadSavedIds();
    setRefreshing(false);
  }, []);

  const toggleSave = async (audition: any) => {
    if (!currentUser) return;
    const isSaved = savedIds.includes(audition.id);
    try {
      if (isSaved) {
        const snap = await firestore()
          .collection('savedAuditions')
          .where('userId', '==', currentUser.uid)
          .where('auditionId', '==', audition.id)
          .get();
        for (const doc of snap.docs) await doc.ref.delete();
        setSavedIds(prev => prev.filter(id => id !== audition.id));
      } else {
        await firestore().collection('savedAuditions').add({
          userId: currentUser.uid,
          auditionId: audition.id,
          auditionTitle: audition.title,
          savedAt: firestore.FieldValue.serverTimestamp(),
        });
        setSavedIds(prev => [...prev, audition.id]);
      }
    } catch (e) {console.log(e);}
  };

  const filtered = auditions.filter(a => {
    const q = searchText.toLowerCase();
    const matchSearch =
      !q ||
      a.title?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q) ||
      a.language?.toLowerCase().includes(q) ||
      a.directorName?.toLowerCase().includes(q);
    const matchRole = selectedRole === 'All' || a.role === selectedRole;
    return matchSearch && matchRole;
  });

  const renderCard = ({item}: any) => {
    const isSaved = savedIds.includes(item.id);
    const isExpired = item.status === 'Closed' || item.isActive === false;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AuditionDetail', {audition: item})}>

        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, isExpired ? styles.statusClosed : styles.statusOpen]}>
            <Text style={styles.statusText}>{isExpired ? '🔴 Closed' : '🟢 Open'}</Text>
          </View>
          <TouchableOpacity onPress={() => toggleSave(item)} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{isSaved ? '❤️ Saved' : '🤍 Save'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

        <View style={styles.metaGrid}>
          {item.role ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>🎭 {item.role}</Text>
            </View>
          ) : null}
          {item.gender ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                {item.gender === 'Male' ? '👨' : item.gender === 'Female' ? '👩' : '🧑'} {item.gender}
              </Text>
            </View>
          ) : null}
          {item.language ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>🗣 {item.language}</Text>
            </View>
          ) : null}
          {item.ageRange ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>🎂 {item.ageRange} yrs</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoRow}>
          {item.location ? <Text style={styles.infoText}>📍 {item.location}</Text> : null}
          {item.lastDate ? <Text style={styles.deadlineText}>⏰ {item.lastDate}</Text> : null}
        </View>

        <Text style={styles.directorText}>
          🎥 {item.directorName || item.directorEmail?.split('@')[0] || 'Director'}
        </Text>

        {item.description ? (
          <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* APPLY BUTTON */}
<TouchableOpacity
  style={[styles.applyBtn, isExpired && styles.applyBtnDisabled]}
  onPress={() => navigation.navigate('AuditionDetail', {audition: item})}
  disabled={isExpired}>
  <Text style={styles.applyBtnText}>
    {isExpired ? 'Closed' : 'View & Apply →'}
  </Text>
</TouchableOpacity>

{/* ✅ DELETE BUTTON — only for audition owner */}
{item.directorId === currentUser?.uid && (
  <TouchableOpacity
    style={styles.deleteBtn}
    onPress={() => {
      Alert.alert('Delete Audition', `Delete "${item.title}"?`, [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('auditions').doc(item.id).delete();
              Alert.alert('✅ Deleted!', 'Audition removed successfully.');
              loadAuditions();
            } catch (e) {
              Alert.alert('Error', 'Could not delete.');
            }
          },
        },
      ]);
    }}>
    <Text style={styles.deleteBtnText}>🗑 Delete Audition</Text>
  </TouchableOpacity>
)}

      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>🎭 Browse Auditions</Text>
          <Text style={styles.headerSub}>{auditions.length} auditions available</Text>
        </View>
      </View>

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by title, city, language..."
          placeholderTextColor="#A09080"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* ✅ ROLE FILTER — Fixed with ScrollView instead of FlatList */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}>
        {ROLES.map(role => (
          <TouchableOpacity
            key={role}
            style={[styles.filterChip, selectedRole === role && styles.filterChipActive]}
            onPress={() => setSelectedRole(role)}>
            <Text style={[styles.filterChipText, selectedRole === role && styles.filterChipTextActive]}>
              {role}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* LIST */}
      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={i => String(i)}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={{padding: 16}}
        />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎭</Text>
          <Text style={styles.emptyTitle}>No auditions found</Text>
          <Text style={styles.emptyText}>
            {searchText || selectedRole !== 'All'
              ? 'Try changing your search or filter'
              : 'No auditions posted yet. Check back soon!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={{padding: 16, paddingBottom: 100}}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#C9956C"
              colors={['#C9956C']}
              progressBackgroundColor="#0A0A0A"
            />
          }
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: '#0A0A0A', gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: {color: '#C9956C', fontSize: 22, fontWeight: 'bold'},
  headerTitle: {color: '#FFFFFF', fontSize: 22, fontWeight: 'bold'},
  headerSub: {color: '#A09080', fontSize: 13, marginTop: 2},
  searchContainer: {paddingHorizontal: 16, marginBottom: 10},
  searchInput: {
    backgroundColor: '#1C1C1C', borderRadius: 14, padding: 14,
    color: '#FFFFFF', borderWidth: 1, borderColor: '#2A2A2A', fontSize: 14,
  },

  /* ✅ FIXED FILTER STYLES */
  filterScroll: {maxHeight: 50, marginBottom: 12},
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {backgroundColor: '#C9956C', borderColor: '#C9956C'},
  filterChipText: {color: '#A09080', fontSize: 13, fontWeight: '600'},
  filterChipTextActive: {color: '#FFFFFF', fontWeight: 'bold'},

  card: {
    backgroundColor: '#1C1C1C', borderRadius: 18, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#2A2A2A',
  },
  cardTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  statusBadge: {borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4},
  statusOpen: {backgroundColor: 'rgba(74, 222, 128, 0.15)', borderWidth: 1, borderColor: '#4ADE80'},
  statusClosed: {backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#EF4444'},
  statusText: {fontSize: 12, fontWeight: '700', color: '#FFFFFF'},
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#2A2A2A', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600'},
  cardTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 10, lineHeight: 24},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10},
  metaChip: {backgroundColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4},
  metaChipText: {color: '#A09080', fontSize: 12},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  infoText: {color: '#A09080', fontSize: 13},
  deadlineText: {color: '#FBBF24', fontSize: 12, fontWeight: '600'},
  directorText: {color: '#A09080', fontSize: 12, marginBottom: 8},
  descText: {color: '#A09080', fontSize: 13, lineHeight: 20, marginBottom: 10},
  applyBtn: {backgroundColor: '#C9956C', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4},
  applyBtnDisabled: {backgroundColor: '#2A2A2A'},
  applyBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 15},
  emptyContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100},
  emptyEmoji: {fontSize: 60, marginBottom: 16},
  emptyTitle: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8},
  emptyText: {color: '#A09080', fontSize: 14, textAlign: 'center', paddingHorizontal: 40},

  deleteBtn: {
    backgroundColor: '#2A0A0A', borderRadius: 12, padding: 12,
    alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: '#DC2626',
  },
  deleteBtnText: {color: '#FCA5A5', fontWeight: 'bold', fontSize: 14},
});