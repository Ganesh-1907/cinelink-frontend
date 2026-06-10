import React, {useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Image, ActivityIndicator, SafeAreaView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'Creator';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function FollowersScreen({route, navigation}: any) {
  const {userId, displayName, tab = 'followers'} = route.params;
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(tab);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth().currentUser;

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Load followers
      const followersSnap = await firestore()
        .collection('users').doc(userId)
        .collection('followers').get();
      const followerIds = followersSnap.docs.map(d => d.id);

      // Load following
      const followingSnap = await firestore()
        .collection('users').doc(userId)
        .collection('following').get();
      const followingIds = followingSnap.docs.map(d => d.data().userId || d.id);

      // Fetch user data for each
      const fetchUsers = async (ids: string[]) => {
        const users = [];
        for (const id of ids) {
          try {
            const doc = await firestore().collection('users').doc(id).get();
            if (doc.exists) users.push({id: doc.id, ...doc.data()});
          } catch (e) {}
        }
        return users;
      };

      const [followerUsers, followingUsers] = await Promise.all([
        fetchUsers(followerIds),
        fetchUsers(followingIds),
      ]);

      setFollowers(followerUsers);
      setFollowing(followingUsers);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({item}: any) => {
    const name = cleanName(item.displayName || item.fullName || item.name || item.email);
    const avatarUrl = item.photoUrl || item.photoURL || null;
    const isCurrentUser = item.id === currentUser?.uid;

    return (
      <TouchableOpacity
        style={styles.userRow}
        onPress={() => {
          if (isCurrentUser) {
            navigation.navigate('Profile');
          } else {
            navigation.navigate('PublicProfile', {userId: item.id});
          }
        }}>

        {avatarUrl ? (
          <Image source={{uri: avatarUrl}} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{name?.charAt(0)?.toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userRole}>🎭 {item.role || 'Creator'}</Text>
          {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
        </View>

        {!isCurrentUser && (
          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View →</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const data = activeTab === 'followers' ? followers : following;

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayName}</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.tabActive]}
          onPress={() => setActiveTab('followers')}>
          <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>
            Followers ({followers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}>
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
            Following ({following.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#C9956C" style={{marginTop: 60}} />
      ) : data.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>
            {activeTab === 'followers' ? '👥' : '🔍'}
          </Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'followers'
              ? 'When someone follows this creator, they appear here'
              : 'When this creator follows someone, they appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={{padding: 16, paddingBottom: 100}}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#2A2A2A',
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center',
  },
  backBtnText:  {color: '#C9956C', fontSize: 20, fontWeight: 'bold'},
  headerTitle:  {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', flex: 1},

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: '#2A2A2A',
  },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:     {borderBottomColor: '#C9956C'},
  tabText:       {color: '#A09080', fontSize: 14, fontWeight: '600'},
  tabTextActive: {color: '#C9956C', fontWeight: 'bold'},

  userRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1C1C1C', borderRadius: 14,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: '#C9956C', marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
  userInfo:   {flex: 1},
  userName:   {color: '#FFFFFF', fontSize: 15, fontWeight: '700'},
  userRole:   {color: '#C9956C', fontSize: 12, marginTop: 2},
  userBio:    {color: '#A09080', fontSize: 11, marginTop: 2},

  viewBtn:     {backgroundColor: 'rgba(201,149,108,0.10)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#C9956C'},
  viewBtnText: {color: '#C9956C', fontSize: 12, fontWeight: '600'},

  emptyState:    {alignItems: 'center', paddingTop: 80, paddingHorizontal: 40},
  emptyEmoji:    {fontSize: 60, marginBottom: 16},
  emptyTitle:    {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center'},
  emptySubtitle: {color: '#A09080', fontSize: 14, textAlign: 'center', lineHeight: 22},
});