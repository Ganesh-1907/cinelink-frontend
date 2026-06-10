import React, {useState} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, TextInput,
  SafeAreaView, FlatList, Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com';

const C = {
  background:   '#0A0A0A',
  card:         '#1C1C1C',
  cardElevated: '#242424',
  border:       '#2A2A2A',
  primary:      '#C9956C',
  primaryFaint: 'rgba(201,149,108,0.10)',
  textPrimary:  '#FFFFFF',
  textSecondary:'#A09080',
  textTertiary: '#6B5D52',
};

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'Creator';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function CrewScreen({navigation}: any) {
  const [results, setResults]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searched, setSearched]   = useState(false);
  const currentUser = auth().currentUser;

  const searchUsers = async (text: string) => {
    setSearchText(text);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const snap = await firestore().collection('users').get();
      const q = text.toLowerCase();
      const filtered = snap.docs
        .map(doc => ({id: doc.id, ...doc.data()}))
        .filter((u: any) => {
          if (u.id === currentUser?.uid) return false;
          if (u.email === ADMIN_EMAIL) return false;
          const name = cleanName(u.displayName || u.fullName || u.name || u.email).toLowerCase();
          const role = (u.role || '').toLowerCase();
          const bio  = (u.bio  || '').toLowerCase();
          return name.includes(q) || role.includes(q) || bio.includes(q);
        });
      setResults(filtered);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const sendConnectRequest = async (otherUser: any) => {
    if (!currentUser) return;
    try {
      const currentUserName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';

      // Check if already sent
      const existing = await firestore()
        .collection('connectionRequests')
        .where('fromUserId', '==', currentUser.uid)
        .where('toUserId',   '==', otherUser.id)
        .get();
      if (!existing.empty) {
        Alert.alert('Already Sent', 'You already sent a connect request to this person.');
        return;
      }

      // Check if already connected
      const connected = await firestore()
        .collection('connections')
        .where('users', 'array-contains', currentUser.uid)
        .get();
      const isConnected = connected.docs.some((doc: any) =>
        doc.data().users?.includes(otherUser.id),
      );
      if (isConnected) {
        Alert.alert('Already Connected', 'You are already connected with this person.');
        return;
      }

      await firestore().collection('connectionRequests').add({
        fromUserId:   currentUser.uid,
        fromUserName: currentUserName,
        fromUserEmail: currentUser.email,
        toUserId:     otherUser.id,
        toUserName:   cleanName(otherUser.displayName || otherUser.fullName || otherUser.name || otherUser.email),
        status:       'pending',
        createdAt:    firestore.FieldValue.serverTimestamp(),
      });

      await firestore().collection('notifications').add({
        userId:      otherUser.id,
        type:        'connect_request',
        title:       '🤝 Connection Request',
        message:     `${currentUserName} wants to connect with you`,
        senderId:    currentUser.uid,
        senderName:  currentUserName,
        read:        false,
        createdAt:   firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Request Sent! 🤝', `Connection request sent to ${cleanName(otherUser.displayName || otherUser.name || otherUser.email)}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not send request.');
    }
  };

  const renderUser = ({item}: any) => {
    const displayName = cleanName(item.displayName || item.fullName || item.name || item.email);
    const avatarUrl   = item.photoUrl || item.photoURL || null;
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.navigate('PublicProfile', {userId: item.id})}>

        {avatarUrl ? (
          <Image source={{uri: avatarUrl}} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{displayName?.charAt(0)?.toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
            {item.verificationStatus === 'verified' && <Text style={{fontSize: 14}}>✅</Text>}
          </View>
          <Text style={styles.userRole}>🎭 {item.role || 'Creator'}</Text>
          {item.bio      ? <Text style={styles.userBio}      numberOfLines={1}>{item.bio}</Text>      : null}
          {item.location ? <Text style={styles.userLocation}>{' '}📍 {item.location}</Text>           : null}
        </View>

        <TouchableOpacity
          style={styles.connectBtn}
          onPress={() => sendConnectRequest(item)}>
          <Text style={styles.connectText}>🤝</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const TIPS = ['Actor', 'Director', 'Mumbai', 'Telugu', 'Editor', 'Writer', 'DOP'];

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>🎥 Find Creators</Text>
        <Text style={styles.subtitle}>Search to discover cinema professionals</Text>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, role, bio..."
          placeholderTextColor={C.textTertiary}
          value={searchText}
          onChangeText={searchUsers}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchText(''); setResults([]); setSearched(false); }}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ROOMS BANNER */}
      <TouchableOpacity
        style={styles.roomsBanner}
        onPress={() => navigation.navigate('BrowseProjects')}>
        <View style={{flex: 1}}>
          <Text style={styles.roomsTitle}>🎬 CineLink Rooms</Text>
          <Text style={styles.roomsSub}>Find projects · Join film teams · Collaborate</Text>
        </View>
        <Text style={styles.roomsArrow}>→</Text>
      </TouchableOpacity>

      {/* CONTENT */}
      {!searched ? (
        /* ── Empty / Suggestions state ── */
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Search for Creators</Text>
          <Text style={styles.emptySubtitle}>
            Type a name, role or location to find{'\n'}actors, directors and crew members
          </Text>

          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>Try searching for:</Text>
            <View style={styles.tipsChipsRow}>
              {TIPS.map(tip => (
                <TouchableOpacity key={tip} onPress={() => searchUsers(tip)}>
                  <Text style={styles.tipChip}>🔎 {tip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

      ) : loading ? (
        <ActivityIndicator size="large" color={C.primary} style={{marginTop: 60}} />

      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>😔</Text>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try a different name or role</Text>
        </View>

      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={{padding: 16, paddingBottom: 100}}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {results.length} result{results.length > 1 ? 's' : ''} for "{searchText}"
            </Text>
          }
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  {flex: 1, backgroundColor: C.background},
  header:     {padding: 20, paddingTop: 10, paddingBottom: 8},
  title:      {color: C.textPrimary,   fontSize: 26, fontWeight: 'bold', marginBottom: 4},
  subtitle:   {color: C.textSecondary, fontSize: 14},

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 14,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, height: 50,
  },
  searchIcon:  {fontSize: 16, marginRight: 8},
  searchInput: {flex: 1, color: C.textPrimary, fontSize: 14},
  clearText:   {color: C.textTertiary, fontSize: 18, fontWeight: 'bold', padding: 4},

  roomsBanner: {
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    marginHorizontal: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.primary,
  },
  roomsTitle: {color: C.textPrimary,   fontSize: 15, fontWeight: 'bold'},
  roomsSub:   {color: C.textSecondary, fontSize: 12, marginTop: 3},
  roomsArrow: {color: C.primary,       fontSize: 22, fontWeight: 'bold'},

  // ── Empty / Tips ────────────────────────────────────────────
  emptyState:    {alignItems: 'center', paddingTop: 40, paddingHorizontal: 30},
  emptyEmoji:    {fontSize: 60, marginBottom: 16},
  emptyTitle:    {color: C.textPrimary,   fontSize: 20, fontWeight: 'bold', marginBottom: 8},
  emptySubtitle: {color: C.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22},

  tipsBox:      {marginTop: 24, alignItems: 'center', width: '100%'},
  tipsTitle:    {color: C.textSecondary, fontSize: 13, marginBottom: 12},
  tipsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  tipChip: {
    color: C.primary,
    backgroundColor: C.primaryFaint,
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    fontSize: 13, fontWeight: '600',
    borderWidth: 1, borderColor: C.primary,
  },

  resultsCount: {color: C.textSecondary, fontSize: 13, marginBottom: 12},

  // ── User Card ────────────────────────────────────────────────
  userCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: C.primary, marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText:   {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
  userInfo:     {flex: 1},
  nameRow:      {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2},
  userName:     {color: C.textPrimary,   fontSize: 15, fontWeight: 'bold', flex: 1},
  userRole:     {color: C.primary,       fontSize: 12, marginBottom: 2},
  userBio:      {color: C.textSecondary, fontSize: 12},
  userLocation: {color: C.textTertiary,  fontSize: 11, marginTop: 2},
  connectBtn: {
    backgroundColor: C.primaryFaint, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.primary, marginLeft: 8,
  },
  connectText: {fontSize: 20},
});