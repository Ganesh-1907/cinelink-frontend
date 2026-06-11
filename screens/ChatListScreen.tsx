import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return '';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function ChatListScreen({navigation}: any) {
  const currentUser = auth().currentUser;
  const [chats, setChats] = useState<any[]>([]);
  const [userNames, setUserNames] = useState<any>({});
  const [userPhotos, setUserPhotos] = useState<any>({});
  
  useEffect(() => {
    if (chats.length > 0) {
      loadUserData(chats);
    }
  }, [chats]);

  useEffect(() => {
    if (!currentUser) return;
    const subscriber = firestore()
      .collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as any),
          }));
          const sorted = data.sort((a: any, b: any) => {
            const aTime = a.lastMessageTime?.seconds || a.createdAt?.seconds || 0;
            const bTime = b.lastMessageTime?.seconds || b.createdAt?.seconds || 0;
            return bTime - aTime;
          });
          setChats([...sorted]);

        },
        err => console.log('❌ CHAT LIST ERROR:', err.message),
      );
    return () => subscriber();
  }, []);

  const loadUserData = async (chatList: any[]) => {
    // Only fetch users we haven't loaded yet
    const newIds = chatList
      .map(chat =>
        (chat.participants as string[])?.find(id => id !== currentUser?.uid),
      )
      .filter((id): id is string => !!id && !userNames[id]);

    if (newIds.length === 0) return;

    try {
      const docs = await Promise.all(
        newIds.map(id => firestore().collection('users').doc(id).get()),
      );
      const names: any = {};
      const photos: any = {};
      docs.forEach((doc, i) => {
        if (doc.exists) {
          const data = doc.data() as any;
          names[newIds[i]] = cleanName(
            data?.fullName || data?.displayName || data?.name || data?.email,
          ) || 'User';
          const photo = data?.photoUrl || data?.photoURL || null;
          if (photo) photos[newIds[i]] = photo;
        }
      });
      setUserNames((prev: any) => ({...prev, ...names}));
      setUserPhotos((prev: any) => ({...prev, ...photos}));
    } catch (e) {
      console.log('❌ USER DATA LOAD ERROR:', e);
    }
  };

  const openChat = (chat: any) => navigation.navigate('ChatScreen', {chat});

  const showOptions = (chat: any, otherName: string, otherId: string) => {
    Alert.alert('Chat Options', `Options for ${otherName}`, [
      {text: 'Delete Chat', style: 'destructive', onPress: () => deleteChat(chat.id)},
      {text: 'Block User', style: 'destructive', onPress: () => blockUser(otherId, otherName)},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

const deleteChat = async (chatId: string) => {
    Alert.alert('Delete Chat', 'Are you sure?', [
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            // Delete all messages first
            const messages = await firestore()
              .collection('chats').doc(chatId)
              .collection('messages').get();
            const batch = firestore().batch();
            messages.docs.forEach(doc => batch.delete(doc.ref));
            batch.delete(firestore().collection('chats').doc(chatId));
            await batch.commit();
          } catch (e) {console.log(e);}
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

const blockUser = async (otherId: string, otherName: string) => {
    Alert.alert('Block User', `Block ${otherName}?`, [
      {
        text: 'Block', style: 'destructive',
        onPress: async () => {
          try {
            const chatId = [currentUser?.uid, otherId].sort().join('_');
            await firestore().collection('users').doc(currentUser?.uid)
              .update({blockedUsers: firestore.FieldValue.arrayUnion(otherId)});
            // Also delete the chat
            const messages = await firestore()
              .collection('chats').doc(chatId)
              .collection('messages').get();
            const batch = firestore().batch();
            messages.docs.forEach(doc => batch.delete(doc.ref));
            batch.delete(firestore().collection('chats').doc(chatId));
            await batch.commit();
            Alert.alert('Blocked!', `${otherName} has been blocked.`);
          } catch (e) {console.log(e);}
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const renderItem = ({item}: any) => {
  const chat = item as any;

  const otherId = (chat.participants as string[])?.find(
    (id: string) => id !== currentUser?.uid,
  );

  const resolvedName =
    (otherId ? userNames[otherId] : null) ||
    cleanName(
      (chat.participantNames as string[])?.find(
        (n: string) => n && n !== currentUser?.email,
      ),
    ) ||
    'Unknown';

    const profilePhoto = otherId ? userPhotos[otherId] : null;

    const formatTime = (timestamp: any) => {
      if (!timestamp?.toDate) return '';
      const date = timestamp.toDate();
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
      }
      return date.toLocaleDateString([], {day: '2-digit', month: 'short'});
    };

    const lastTime = chat.lastMessageTime || chat.createdAt;
    const lastMsg = chat.lastMessage?.trim() ? chat.lastMessage : '💬 Say hello!';
    const unreadCount = chat.unreadCount?.[currentUser?.uid || ''] || 0;

    return (
      <TouchableOpacity
        style={styles.chatCard}
        activeOpacity={0.85}
        onPress={() => openChat(chat)}>

        {/* AVATAR */}
        <View style={styles.avatarWrapper}>
          {profilePhoto ? (
            <Image source={{uri: profilePhoto}} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {resolvedName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* INFO */}
        <View style={{flex: 1}}>
          <Text style={styles.name}>{resolvedName}</Text>
          <Text
            style={[styles.lastMessage, unreadCount > 0 && styles.lastMessageUnread]}
            numberOfLines={1}>
            {lastMsg}
          </Text>
        </View>

        {/* TIME + OPTIONS */}
        <View style={styles.rightCol}>
          {lastTime ? (
            <Text style={styles.timeText}>{formatTime(lastTime)}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.optionsBtn}
            onPress={() => showOptions(chat, resolvedName, otherId || '')}>
            <Text style={styles.optionsBtnText}>⋯</Text>
          </TouchableOpacity>
        </View>

      </TouchableOpacity>
    );
  };

  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>💬</Text>
      <Text style={styles.emptyTitle}>No chats yet</Text>
      <Text style={styles.emptyText}>Start networking with creators on CineLink.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Chats</Text>
        <Text style={styles.headerSub}>Connect with creators</Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={EmptyComponent}
        extraData={userNames}
        contentContainerStyle={{flexGrow: 1, padding: 12}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  header: {padding: 20, paddingBottom: 8},
  headerTitle: {color: '#FFFFFF', fontSize: 26, fontWeight: 'bold'},
  headerSub: {color: '#A09080', marginTop: 2, fontSize: 13},

  chatCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  avatarWrapper: {position: 'relative', marginRight: 10},
  avatarImage: {width: 46, height: 46, borderRadius: 23},
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold'},

  unreadBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#C9956C',
    borderRadius: 10,
    minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 2, borderColor: '#0A0A0A',
  },
  unreadBadgeText: {color: '#FFFFFF', fontSize: 10, fontWeight: 'bold'},

  name: {color: '#FFFFFF', fontSize: 15, fontWeight: '600'},
  lastMessage: {color: '#A09080', marginTop: 2, fontSize: 13},
  lastMessageUnread: {color: '#FFFFFF', fontWeight: '600'},

  rightCol: {alignItems: 'flex-end', gap: 4},
  timeText: {color: '#A09080', fontSize: 11},
  optionsBtn: {padding: 4},
  optionsBtnText: {color: '#C9956C', fontSize: 20, fontWeight: 'bold'},

  emptyContainer: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', paddingBottom: 100,
  },
  emptyEmoji: {fontSize: 60, marginBottom: 16},
  emptyTitle: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
  emptyText: {
    color: '#A09080', marginTop: 10,
    textAlign: 'center', lineHeight: 22, paddingHorizontal: 40,
  },
});