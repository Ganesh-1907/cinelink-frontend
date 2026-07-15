import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const C = {
  bg:      '#0A0A0A',
  card:    '#1C1C1C',
  border:  '#2A2A2A',
  primary: '#C9956C',
  muted:   '#A09080',
  white:   '#FFFFFF',
  success: '#4ADE80',
  dark:    '#0A2E1F',
};

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={[styles.skeletonLine, {width: '40%', height: 18, marginBottom: 10}]} />
      <View style={[styles.skeletonLine, {width: '80%', height: 22, marginBottom: 8}]} />
      <View style={[styles.skeletonLine, {width: '60%', height: 14, marginBottom: 14}]} />
      <View style={[styles.skeletonLine, {width: '100%', height: 42}]} />
    </View>
  );
}

export default function BrowseContestsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = firestore()
      .collection('contests')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          setContests(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
          setLoading(false);
        },
        err => {
          console.log('BrowseContests error:', err);
          setLoading(false);
        },
      );
    return () => unsub();
  }, []);

  const filtered = search.trim()
    ? contests.filter(c =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.type?.toLowerCase().includes(search.toLowerCase()),
      )
    : contests;

  const getDaysLeft = (deadline: string) => {
    if (!deadline) return null;
    const diff = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0) return {label: 'Ended', color: '#FCA5A5'};
    if (diff === 0) return {label: 'Last day!', color: '#FBBF24'};
    return {label: `${diff} days left`, color: C.success};
  };

  const renderItem = ({item}: any) => {
    const days = getDaysLeft(item.deadline);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.82}
        onPress={() => navigation.navigate('ContestDetail', {contest: item})}>

        {/* Banner row */}
        <View style={styles.bannerRow}>
          <Text style={styles.bannerLabel}>🏆 Contest</Text>
          {item.status === 'Active' ? (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>● Live</Text>
            </View>
          ) : (
            <View style={styles.endedBadge}>
              <Text style={styles.endedBadgeText}>Ended</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

        {/* Prize */}
        {item.prize ? (
          <View style={styles.prizeRow}>
            <Text style={styles.prizeText}>💰 {item.prize}</Text>
          </View>
        ) : null}

        {/* Badges */}
        <View style={styles.badgeRow}>
          {item.type ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🎭 {item.type}</Text>
            </View>
          ) : null}
          {item.entryFee !== undefined ? (
            <View style={[styles.badge, item.entryFee === 0 && styles.freeBadge]}>
              <Text style={[styles.badgeText, item.entryFee === 0 && {color: C.success}]}>
                {item.entryFee === 0 ? '✅ Free Entry' : `₹${item.entryFee} Entry`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Description */}
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Meta row */}
        <View style={styles.metaRow}>
          {item.deadline ? (
            <Text style={styles.metaText}>⏰ {item.deadline}</Text>
          ) : null}
          {days ? (
            <Text style={[styles.daysLeft, {color: days.color}]}>{days.label}</Text>
          ) : null}
        </View>

        {/* CTA */}
        <View style={styles.enterBtn}>
          <Text style={styles.enterBtnText}>Enter Contest →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Contests</Text>
        <Text style={styles.headerSub}>Win prizes for your craft</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contests..."
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={{padding: 16}}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 24}]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyText}>No contests found</Text>
              <Text style={styles.emptySub}>Check back soon for exciting cinema contests</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: C.bg},

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  headerTitle: {
    color: C.white,
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  headerSub: {
    color: C.muted,
    fontSize: 13,
    marginTop: 2,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchIcon: {fontSize: 16, marginRight: 8},
  searchInput: {flex: 1, color: C.white, fontSize: 15, paddingVertical: 12},
  clearBtn: {color: C.muted, fontSize: 16, paddingLeft: 8},

  list: {padding: 16, paddingBottom: 32},

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },

  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bannerLabel: {color: C.primary, fontSize: 13, fontWeight: '700'},

  activeBadge: {
    backgroundColor: C.dark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.success,
  },
  activeBadgeText: {color: C.success, fontSize: 12, fontWeight: '700'},

  endedBadge: {
    backgroundColor: '#450A0A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  endedBadgeText: {color: '#FCA5A5', fontSize: 12, fontWeight: '700'},

  cardTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 24,
  },

  prizeRow: {
    backgroundColor: '#1A1200',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FBBF24',
    alignSelf: 'flex-start',
  },
  prizeText: {color: '#FBBF24', fontSize: 13, fontWeight: '700'},

  badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10},
  badge: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  freeBadge: {
    backgroundColor: C.dark,
    borderColor: C.success,
  },
  badgeText: {color: C.muted, fontSize: 12},

  description: {color: '#B0A090', fontSize: 13, lineHeight: 20, marginBottom: 10},

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {color: C.muted, fontSize: 12},
  daysLeft: {fontSize: 12, fontWeight: '700'},

  enterBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  enterBtnText: {color: C.white, fontWeight: 'bold', fontSize: 15},

  skeletonLine: {backgroundColor: '#2A2A2A', borderRadius: 6},

  emptyBox: {alignItems: 'center', paddingTop: 60, paddingHorizontal: 32},
  emptyIcon: {fontSize: 52, marginBottom: 16},
  emptyText: {color: C.white, fontSize: 18, fontWeight: 'bold', marginBottom: 8},
  emptySub: {color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20},
});
