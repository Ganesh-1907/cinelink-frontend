import React, {useEffect, useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl,
  Animated, ScrollView, Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import EngagementBar from '../components/EngagementBar';

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
const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com';

const CATEGORY_COLORS: Record<string, {bg: string; text: string; border: string}> = {
  'Movies':        {bg: 'rgba(201,149,108,0.15)', text: '#C9956C', border: 'rgba(201,149,108,0.5)'},
  'Short Films':   {bg: 'rgba(74,222,128,0.10)',  text: '#4ADE80', border: 'rgba(74,222,128,0.4)'},
  'Theatre':       {bg: 'rgba(129,140,248,0.10)', text: '#818CF8', border: 'rgba(129,140,248,0.4)'},
  'YouTube / Web': {bg: 'rgba(248,113,113,0.10)', text: '#F87171', border: 'rgba(248,113,113,0.4)'},
  'TV / OTT':      {bg: 'rgba(251,191,36,0.10)',  text: '#FBBF24', border: 'rgba(251,191,36,0.4)'},
};

const getDaysLeft = (dateStr: string) => {
  if (!dateStr) return null;
  const deadline = new Date(dateStr);
  if (isNaN(deadline.getTime())) return null;
  const diff = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return {label: 'Deadline passed', color: '#FCA5A5'};
  if (diff === 0) return {label: 'Last day!', color: '#FBBF24'};
  return {label: `${diff} days left`, color: '#4ADE80'};
};

export default function BrowseAuditionsScreen({navigation}: any) {
  const currentUser = auth().currentUser;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const [auditions, setAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
  loadSavedIds();
  setLoading(true);
  const unsub = firestore()
    .collection('auditions')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      snap => {
        setAuditions(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
        setLoading(false);
      },
      err => {
        console.log('LOAD AUDITIONS ERROR:', err);
        setLoading(false);
      },
    );
  return () => unsub();
}, []);
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
    const daysLeft = getDaysLeft(item.lastDate);
    const catColor = (item.category && CATEGORY_COLORS[item.category])
      ? CATEGORY_COLORS[item.category]
      : CATEGORY_COLORS['Movies'];

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AuditionDetail', {audition: item})}>

        {/* Top row: status + save */}
        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, isExpired ? styles.statusClosed : styles.statusOpen]}>
            <Text style={styles.statusText}>{isExpired ? '🔴 Closed' : '🟢 Open'}</Text>
          </View>
          <TouchableOpacity
            onPress={e => { e.stopPropagation?.(); toggleSave(item); }}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{isSaved ? '❤️ Saved' : '🤍 Save'}</Text>
          </TouchableOpacity>
        </View>

        {/* Category pill */}
        {item.category ? (
          <View style={[styles.categoryPill, {backgroundColor: catColor.bg, borderColor: catColor.border}]}>
            <Text style={[styles.categoryPillText, {color: catColor.text}]}>{item.category}</Text>
          </View>
        ) : null}

        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

        {/* Budget + Positions */}
        {(item.budget || item.positions) ? (
          <View style={styles.budgetRow}>
            {item.budget ? (
              <View style={styles.budgetPill}>
                <Text style={styles.budgetPillText}>💰 {item.budget}</Text>
              </View>
            ) : null}
            {item.positions ? (
              <View style={styles.positionsPill}>
                <Text style={styles.positionsPillText}>👥 {item.positions}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Meta chips */}
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

        {/* Location */}
        {item.location ? (
          <Text style={styles.infoText}>📍 {item.location}</Text>
        ) : null}

        {/* Director + applicants */}
        <View style={styles.directorRow}>
          <Text style={styles.directorText}>
            🎥 {item.directorName || item.directorEmail?.split('@')[0] || 'Director'}
          </Text>
          <Text style={styles.applicantsText}>
            {item.applicants?.length || item.applicationCount || 0} applied
          </Text>
        </View>

        {/* Description */}
        {item.description ? (
          <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Deadline countdown */}
        {item.lastDate ? (
          <View style={styles.deadlineRow}>
            <Text style={styles.deadlineLabel}>Apply before {item.lastDate}</Text>
            {daysLeft ? (
              <Text style={[styles.daysLeftText, {color: daysLeft.color}]}>{daysLeft.label}</Text>
            ) : null}
          </View>
        ) : null}

        <EngagementBar
          auditionId={item.id}
          likes={item.likes || 0}
          likedBy={item.likedBy || []}
          commentCount={0}
          views={item.views || 0}
          shareTitle={item.title || 'Audition'}
        />

        {/* CTA buttons */}
        {isExpired ? (
          <View style={[styles.applyBtn, styles.applyBtnDisabled]}>
            <Text style={styles.applyBtnText}>Closed</Text>
          </View>
        ) : (
          <View style={styles.auditionBtnRow}>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={e => { e.stopPropagation?.(); navigation.navigate('AuditionDetail', {audition: item}); }}>
              <Text style={styles.contactBtnText}>Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtnFilled}
              onPress={e => { e.stopPropagation?.(); navigation.navigate('AuditionDetail', {audition: item}); }}>
              <Text style={styles.applyBtnFilledText}>Apply →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Delete button — only for audition owner */}
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
          {isAdmin && !searchText && selectedRole === 'All' && (
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('PostAudition')}>
              <Text style={styles.emptyBtnText}>+ Post an Audition</Text>
            </TouchableOpacity>
          )}
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
    backgroundColor: '#121212',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  backBtnText: {color: '#C9956C', fontSize: 22, fontWeight: 'bold'},
  headerTitle: {color: '#FFFFFF', fontSize: 22, fontWeight: 'bold'},
  headerSub: {color: '#A09080', fontSize: 13, marginTop: 2},
  searchContainer: {paddingHorizontal: 16, marginBottom: 10},
  searchInput: {
    backgroundColor: '#060606', borderRadius: 14, padding: 14,
    color: '#FFFFFF', borderWidth: 1, borderColor: '#1A1A1A', fontSize: 14,
    elevation: 0,
  },

  filterScroll: {maxHeight: 50, marginBottom: 12},
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: '#121212',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#1E1E1E',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#C9956C', borderWidth: 1, borderColor: '#E8C4A0',
    shadowColor: '#C9956C', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 10,
  },
  filterChipText: {color: '#A09080', fontSize: 13, fontWeight: '600'},
  filterChipTextActive: {color: '#FFFFFF', fontWeight: 'bold'},

  card: {
    backgroundColor: '#141414', borderRadius: 18, padding: 16,
    marginBottom: 16, borderTopWidth: 2, borderTopColor: '#C9956C44',
    borderWidth: 1, borderColor: '#2A2A2A', borderBottomWidth: 3,
    borderBottomColor: '#C9956C22', borderRightWidth: 2, borderRightColor: '#1A1A1A',
    shadowColor: '#000', shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 8,
  },
  cardTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  statusBadge: {borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4},
  statusOpen: {backgroundColor: 'rgba(74, 222, 128, 0.15)', borderWidth: 1, borderColor: '#4ADE80'},
  statusClosed: {backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#EF4444'},
  statusText: {fontSize: 12, fontWeight: '700', color: '#FFFFFF'},
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(201,149,108,0.08)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 0.5, borderColor: 'rgba(201,149,108,0.3)',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600'},
  cardTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 10, lineHeight: 24},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10},
  metaChip: {backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: '#1E1E1E'},
  metaChipText: {color: '#A09080', fontSize: 12},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  infoText: {color: '#A09080', fontSize: 13},
  deadlineText: {color: '#FBBF24', fontSize: 12, fontWeight: '600'},
  directorText: {color: '#A09080', fontSize: 12, marginBottom: 8},
  descText: {color: '#A09080', fontSize: 13, lineHeight: 20, marginBottom: 10},
  applyBtn: {
    backgroundColor: '#C9956C', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4,
    borderTopWidth: 2, borderTopColor: '#E8C4A0',
    borderBottomWidth: 2, borderBottomColor: '#7A5535',
    borderLeftWidth: 0, borderRightWidth: 0,
    shadowColor: '#C9956C', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  applyBtnDisabled: {backgroundColor: '#2A2A2A', shadowColor: 'transparent', elevation: 0},
  applyBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 15},
  emptyContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100},
  emptyEmoji: {fontSize: 60, marginBottom: 16},
  emptyTitle: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8},
  emptyText: {color: '#A09080', fontSize: 14, textAlign: 'center', paddingHorizontal: 40},
  emptyBtn: {marginTop: 24, backgroundColor: '#C9956C', borderRadius: 25, paddingVertical: 12, paddingHorizontal: 28, borderTopWidth: 2, borderTopColor: '#E8C4A0', borderBottomWidth: 2, borderBottomColor: '#7A5535', elevation: 6},
  emptyBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 15},

  deleteBtn: {
    backgroundColor: '#2A0A0A', borderRadius: 12, padding: 12,
    alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: '#DC2626',
  },
  deleteBtnText: {color: '#FCA5A5', fontWeight: 'bold', fontSize: 14},
  categoryPill:       {flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, marginBottom: 10},
  categoryPillText:   {fontSize: 11, fontWeight: '700'},
  budgetRow:          {flexDirection: 'row', gap: 6, marginBottom: 10},
  budgetPill:         {backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)'},
  budgetPillText:     {color: '#FBBF24', fontSize: 12, fontWeight: '600'},
  positionsPill:      {backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(74,222,128,0.4)'},
  positionsPillText:  {color: '#4ADE80', fontSize: 12, fontWeight: '600'},
  directorRow:        {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  applicantsText:     {color: '#A09080', fontSize: 11},
  deadlineRow:        {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  deadlineLabel:      {color: '#A09080', fontSize: 12},
  daysLeftText:       {fontSize: 12, fontWeight: '700'},
  auditionBtnRow:     {flexDirection: 'row', gap: 8, marginTop: 12},
  contactBtn:         {flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#C9956C', backgroundColor: 'transparent'},
  contactBtnText:     {color: '#C9956C', fontWeight: '700', fontSize: 14},
  applyBtnFilled:     {flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#C9956C'},
  applyBtnFilledText: {color: '#FFFFFF', fontWeight: '700', fontSize: 14},
});