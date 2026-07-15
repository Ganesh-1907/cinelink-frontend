import React, {useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Image, ActivityIndicator, SafeAreaView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const C = {
  background: '#0A0A0A',
  card: '#1C1C1C',
  border: '#2A2A2A',
  primary: '#C9956C',
  primaryFaint: 'rgba(201,149,108,0.10)',
  textPrimary: '#FFFFFF',
  textSecondary: '#A09080',
  textTertiary: '#6B5D52',
  success: '#4ADE80',
};

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'Creator';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function SuggestedFollowsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const currentUser = auth().currentUser;
  const currentUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  useEffect(() => {
    loadSuggestedUsers();
  }, []);

  const loadSuggestedUsers = async () => {
    try {
      const snap = await firestore().collection('users').limit(20).get();
      const data = snap.docs
        .map(doc => ({id: doc.id, ...doc.data()}))
        .filter((u: any) => u.id !== currentUser?.uid && u.email !== 'anilkumardevarakonda03@gmail.com');
      setUsers(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (user: any) => {
    if (!currentUser) return;
    try {
      const followRef = firestore()
        .collection('users').doc(user.id)
        .collection('followers').doc(currentUser.uid);

      if (following.has(user.id)) {
        await followRef.delete();
        await firestore().collection('users').doc(currentUser.uid)
          .collection('following').doc(user.id).delete();
        setFollowing(prev => { const s = new Set(prev); s.delete(user.id); return s; });
      } else {
        await followRef.set({
          userId: currentUser.uid,
          userName: currentUserName,
          email: currentUser.email,
          followedAt: firestore.FieldValue.serverTimestamp(),
        });
        await firestore().collection('users').doc(currentUser.uid)
          .collection('following').doc(user.id).set({
            userId: user.id,
            followedAt: firestore.FieldValue.serverTimestamp(),
          });
        await firestore().collection('notifications').add({
          userId: user.id,
          type: 'new_follower',
          title: '🎉 New Follower!',
          message: `${currentUserName} started following you`,
          senderId: currentUser.uid,
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        setFollowing(prev => new Set(prev).add(user.id));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleDone = async () => {
    await AsyncStorage.setItem('suggested_follows_done', 'true');
    navigation.replace('Main');
  };

  const renderUser = ({item}: any) => {
    const displayName = cleanName(item.displayName || item.fullName || item.name || item.email);
    const avatarUrl = item.photoUrl || item.photoURL || null;
    const isFollowing = following.has(item.id);

    return (
      <View style={styles.userCard}>
        <TouchableOpacity
          style={styles.userLeft}
          onPress={() => navigation.navigate('PublicProfile', {userId: item.id})}>
          {avatarUrl ? (
            <Image source={{uri: avatarUrl}} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{displayName?.charAt(0)?.toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.userRole}>🎭 {item.role || 'Creator'}</Text>
            {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={() => handleFollow(item)}>
          <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
            {isFollowing ? '✓ Following' : '+ Follow'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>People You May Know</Text>
        <Text style={styles.subtitle}>Follow creators to build your cinema network</Text>
      </View>

      {/* FOLLOW COUNT */}
      {following.size > 0 && (
        <View style={styles.followingBanner}>
          <Text style={styles.followingBannerText}>
            ✅ Following {following.size} creator{following.size > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={C.primary} style={{marginTop: 60}} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={{padding: 16, paddingBottom: insets.bottom + 80}}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* BOTTOM BUTTONS */}
      <View style={styles.bottomRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleDone}>
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>
            {following.size > 0 ? `Done (${following.size} followed)` : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: C.background},
  header: {padding: 20, paddingTop: 16, paddingBottom: 8},
  title: {color: C.textPrimary, fontSize: 24, fontWeight: 'bold', marginBottom: 6},
  subtitle: {color: C.textSecondary, fontSize: 14},
  followingBanner: {
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderRadius: 10, marginHorizontal: 16,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: C.success,
    alignItems: 'center',
  },
  followingBannerText: {color: C.success, fontWeight: '600', fontSize: 14},
  userCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center',
  },
  userLeft: {flexDirection: 'row', alignItems: 'center', flex: 1},
  avatar: {width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: C.primary},
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
  userInfo: {flex: 1, marginLeft: 12},
  userName: {color: C.textPrimary, fontSize: 15, fontWeight: '700'},
  userRole: {color: C.primary, fontSize: 12, marginTop: 2},
  userBio: {color: C.textSecondary, fontSize: 11, marginTop: 2},
  followBtn: {
    backgroundColor: C.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    minWidth: 90, alignItems: 'center',
  },
  followingBtn: {backgroundColor: C.card, borderWidth: 1, borderColor: C.primary},
  followBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 13},
  followingBtnText: {color: C.primary},
  bottomRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10,
    padding: 20, paddingBottom: 36,
    backgroundColor: C.background,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  skipBtn: {
    flex: 1, backgroundColor: C.card,
    borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  skipBtnText: {color: C.textSecondary, fontWeight: '600', fontSize: 15},
  doneBtn: {
    flex: 2, backgroundColor: C.primary,
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  doneBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 15},
});