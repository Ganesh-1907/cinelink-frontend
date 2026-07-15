import React, {useEffect, useState, useRef} from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Image, ActivityIndicator, StatusBar, Linking, Alert,
} from 'react-native';
import {LiquidPress} from '../components/LiquidPress';
import Clipboard from '@react-native-clipboard/clipboard';
import PremiumBadge from '../src/components/Premium/PremiumBadge';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadImage} from '../src/services/uploadService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'User';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const QUICK_EMOJIS = [
  '😊','😂','❤️','👍','🎬','🎭','🔥','✅',
  '😍','🙏','💪','🎉','👏','🤝','💯','🎯',
  '✨','🙌','😎','🤩','💥','🎊','👌','🥳',
];

export default function ChatScreen({route, navigation}: any) {
  const insets = useSafeAreaInsets();
  const chat = route?.params?.chat;
  const currentUser = auth().currentUser;

  useEffect(() => { if (!chat?.id) { navigation.goBack(); } }, []);

  useEffect(() => {
    return () => {
      if (chat?.id && currentUser?.uid) {
        firestore().collection('chats').doc(chat.id).update({typingUser: null}).catch(() => {});
      }
    };
  }, [chat?.id, currentUser?.uid]);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const otherUserId: string | undefined =
    chat.participants?.find((id: string) => id !== currentUser?.uid) ||
    chat.id?.split('_').find((id: string) => id !== currentUser?.uid);


  const initialHeaderName = (() => {
    const participants: string[] = chat.participants || [];
    const names: string[] = chat.participantNames || [];
    const otherIndex = participants.findIndex(
      (id: string) => id !== currentUser?.uid,
    );
    if (otherIndex !== -1 && names[otherIndex]) {
      return cleanName(names[otherIndex]);
    }
    return 'User';
  })();

  const [messages,        setMessages]        = useState<any[]>([]);
  const [newMessage,      setNewMessage]      = useState('');
  const [loading,         setLoading]         = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [otherUserOnline, setOtherUserOnline]           = useState(false);
  const [otherUserName,   setOtherUserName]             = useState(initialHeaderName);
  const [otherUserPhoto,  setOtherUserPhoto]            = useState<string | null>(null);
  const [otherUserTier,   setOtherUserTier]             = useState<string>('none');
  const [otherUserVerifiedReal, setOtherUserVerifiedReal] = useState(false);

  // ── Reply state ──────────────────────────────────────────────
  const [replyTo, setReplyTo] = useState<any>(null);

  const typingTimeout = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('chats')
      .doc(chat.id)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          setMessages(prev => {
            // Keep locally deleted messages as deleted until Firestore confirms
            const deletedIds = new Set(prev.filter(m => m.deleted).map(m => m.id));
            return data.map(m => deletedIds.has(m.id) ? {...m, deleted: true} : m);
          });
          setLoading(false);
          setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 100);
        },
        error => {
          console.log('❌ MESSAGE LISTENER ERROR:', error);
          setLoading(false);
        },
      );
    return unsubscribe;
  }, [chat.id]);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('chats')
      .doc(chat.id)
      .onSnapshot(
        doc => {
          if (doc && doc.exists) {
            const data = doc.data();
            setOtherUserTyping(
              !!(data?.typingUser && data.typingUser !== currentUser?.uid),
            );
          }
        },
        err => console.log('TYPING LISTENER ERROR:', err),
      );
    return unsubscribe;
  }, [chat.id]);

  useEffect(() => {
    if (!otherUserId) return;
    const unsubscribe = firestore()
      .collection('users')
      .doc(otherUserId)
      .onSnapshot(doc => {
        const data = doc.data();
        if (!data) return;
        const photo = data.photoUrl || data.photoURL || null;
        setOtherUserPhoto(photo);
        const freshName = data.fullName || data.displayName || data.name || data.email;
        if (freshName) setOtherUserName(cleanName(freshName));
        setOtherUserTier(data.premiumTier || 'none');
        setOtherUserVerifiedReal(data.verifiedReal === true);
        const lastSeen = data.lastSeen?.toDate?.();
        const isOnlineFlag = data.isOnline || false;
        if (isOnlineFlag && lastSeen) {
          const diffMinutes = (Date.now() - lastSeen.getTime()) / 60000;
          setOtherUserOnline(diffMinutes < 2);
        } else {
          setOtherUserOnline(false);
        }
      });
    return unsubscribe;
  }, [otherUserId]);

  useEffect(() => {
    if (!currentUser) return;
    const unread = messages.filter((msg: any) =>
      msg.senderId !== currentUser?.uid &&
      !msg.readBy?.includes(currentUser?.uid),
    );
    firestore().collection('chats').doc(chat.id)
      .update({[`unreadCount.${currentUser.uid}`]: 0})
      .catch(e => console.log('UNREAD RESET ERROR:', e));
    if (unread.length === 0) return;
    unread.forEach(async (msg: any) => {
      try {
        await firestore().collection('chats').doc(chat.id)
          .collection('messages').doc(msg.id)
          .update({readBy: firestore.FieldValue.arrayUnion(currentUser?.uid)});
      } catch (e: any) {
        console.log('❌ READ RECEIPT FAILED:', e.message || e);
      }
    });
  }, [messages, chat.id, currentUser?.uid]);

  const handleTyping = async (text: string) => {
    setNewMessage(text);
    try {
      await firestore().collection('chats').doc(chat.id)
        .update({typingUser: currentUser?.uid});
    } catch (e) {console.log(e);}
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(async () => {
      try {
        await firestore().collection('chats').doc(chat.id)
          .update({typingUser: null});
      } catch (e) {console.log(e);}
    }, 1500);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    const text = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);

    // Capture reply snapshot before clearing
    const replySnapshot = replyTo ? {
      id:         replyTo.id,
      text:       replyTo.text || '📷 Photo',
      senderName: replyTo.senderName || 'User',
    } : null;
    setReplyTo(null);

    try {
      await firestore().collection('chats').doc(chat.id).collection('messages').add({
        type: 'text',
        text,
        senderId:    currentUser?.uid,
        senderEmail: currentUser?.email,
        senderName:  currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User',
        senderPhoto: currentUser?.photoURL || '',
        createdAt:   firestore.FieldValue.serverTimestamp(),
        readBy:      [],
        // Attach reply if present
        ...(replySnapshot ? {replyTo: replySnapshot} : {}),
      });
      await firestore().collection('chats').doc(chat.id).update({
        lastMessage:     text,
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
        typingUser:      null,
        [`unreadCount.${otherUserId}`]: firestore.FieldValue.increment(1),
      });

      if (otherUserId) {
        try {
          const senderDoc = await firestore()
            .collection('users').doc(currentUser.uid).get();
          const senderData = senderDoc.data();
          const realName =
            senderData?.fullName || senderData?.displayName || senderData?.name ||
            currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Someone';

          await firestore().collection('notifications').add({
            userId:    otherUserId,
            type:      'message',
            title:     '💬 New Message',
            message:   `${realName} sent you a message`,
            senderId:  currentUser?.uid,
            chatId:    chat.id,
            read:      false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
        } catch (e: any) {
          console.log('❌ NOTIFICATION ERROR:', e?.message || e);
        }
      }
    } catch (e: any) {
      console.log('❌ SEND MESSAGE ERROR:', e.message || e);
    }
  };

  // ── Long press actions ───────────────────────────────────────
  const handleLongPress = (message: any) => {
    const isMyMessage = message.senderId === currentUser?.uid;
    const options: any[] = [
      {
        text: '📋 Copy',
        onPress: () => {
          Clipboard.setString(message.text || '');
          Alert.alert('Copied!', 'Message copied to clipboard.');
        },
      },
      {
        text: '↩️ Reply',
        onPress: () => {
          setReplyTo(message);
          inputRef.current?.focus();
        },
      },
    ];

    if (isMyMessage) {
      options.push({
        text: '🗑 Unsend',
        style: 'destructive',
        onPress: () => unsendMessage(message.id),
      });
    }

    options.push({text: 'Cancel', style: 'cancel'});

    Alert.alert('Message Options', '', options);
  };

const unsendMessage = async (messageId: string) => {
    Alert.alert('Unsend Message', 'Remove this message for everyone?', [
      {
        text: 'Unsend', style: 'destructive',
        onPress: async () => {
          try {
            // Mark as deleted locally first — show placeholder instead of blinking
            setMessages(prev =>
              prev.map(m =>
                m.id === messageId
                  ? {...m, deleted: true, text: 'This message was unsent'}
                  : m,
              ),
            );
            await firestore()
              .collection('chats').doc(chat.id)
              .collection('messages').doc(messageId)
              .delete();
          } catch (e: any) {
            setMessages(prev =>
              prev.map(m =>
                m.id === messageId ? {...m, deleted: false} : m,
              ),
            );
            Alert.alert('Unsend Error', e?.message || JSON.stringify(e));
          }
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };
  const pickImage = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.7});
    if (result.assets && result.assets[0]?.uri) uploadChatImage(result.assets[0].uri);
  };

  const uploadChatImage = async (imageUri: string) => {
    try {
      const fileData = await uploadImage(imageUri);
      await firestore().collection('chats').doc(chat.id).collection('messages').add({
        type:        'image',
        imageUrl:    fileData.secureUrl,
        senderId:    currentUser?.uid,
        senderEmail: currentUser?.email,
        senderName:  currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User',
        senderPhoto: currentUser?.photoURL || '',
        createdAt:   firestore.FieldValue.serverTimestamp(),
        readBy:      [],
      });
      await firestore().collection('chats').doc(chat.id).update({
        lastMessage:     '📷 Photo',
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {console.log(e);}
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], {day: 'numeric', month: 'long', year: 'numeric'});
  };

  const renderMessageText = (text: string, isMyMessage: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return (
      <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
        {parts.map((part, index) => {
          if (urlRegex.test(part)) {
            return (
              <Text
                key={index}
                style={styles.linkText}
                onPress={() => Linking.openURL(part).catch(() => {})}>
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  const renderMessage = ({item, index}: any) => {
    const message = item as any;
    const isMyMessage = message.senderId === currentUser?.uid;
    const previousMessage = messages[index - 1];
    const nextMessage = messages[index + 1];

    const showDate =
      !previousMessage ||
      formatDate(previousMessage.createdAt) !== formatDate(message.createdAt);

    const isFirstInGroup =
      !previousMessage ||
      previousMessage.senderId !== message.senderId ||
      formatDate(previousMessage.createdAt) !== formatDate(message.createdAt);

    const isLastInGroup =
      !nextMessage ||
      nextMessage.senderId !== message.senderId;

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(message.createdAt)}</Text>
          </View>
        )}

        <View style={[
          styles.messageRow,
          isMyMessage ? styles.myMessageRow : styles.otherMessageRow,
          !isLastInGroup && {marginBottom: 2},
        ]}>

          {!isMyMessage && (
            <View style={styles.avatarSpace}>
              {isLastInGroup ? (
                otherUserPhoto ? (
                  <Image source={{uri: otherUserPhoto}} style={styles.msgAvatar} />
                ) : (
                  <View style={styles.msgAvatarPlaceholder}>
                    <Text style={styles.msgAvatarText}>
                      {otherUserName?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                )
              ) : null}
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => handleLongPress(message)}
            style={[
              styles.bubble,
              isMyMessage ? styles.myBubble : styles.otherBubble,
              isMyMessage && isFirstInGroup && styles.myBubbleFirst,
              !isMyMessage && isFirstInGroup && styles.otherBubbleFirst,
              isMyMessage && isLastInGroup && styles.myBubbleLast,
              !isMyMessage && isLastInGroup && styles.otherBubbleLast,
            ]}>

            {/* REPLY PREVIEW */}
            {message.replyTo && (
              <View style={[
                styles.replyPreview,
                isMyMessage ? styles.replyPreviewMy : styles.replyPreviewOther,
              ]}>
                <Text style={styles.replyPreviewName}>{message.replyTo.senderName}</Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {message.replyTo.text}
                </Text>
              </View>
            )}

            {message.deleted ? (
              <Text style={{color: 'rgba(255,255,255,0.4)', fontSize: 13, fontStyle: 'italic'}}>
                🚫 This message was unsent
              </Text>
            ) : message.type === 'image' ? (
              <Image source={{uri: message.imageUrl}} style={styles.chatImage} />
            ) : (
              renderMessageText(message.text || '', isMyMessage)
            )}

            <View style={styles.messageFooter}>
              <Text style={[styles.timestamp, isMyMessage && styles.myTimestamp]}>
                {formatTime(message.createdAt)}
              </Text>
              {isMyMessage && (
                <Text style={[
                  styles.readReceipt,
                  message.readBy?.length > 0 && styles.readReceiptRead,
                ]}>
                  {message.readBy?.length > 0 ? ' ✓✓' : ' ✓'}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1C" />

      {/* HEADER */}
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrapper}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (otherUserId) {
              navigation.navigate('PublicProfile', {userId: otherUserId});
            } else {
              Alert.alert('Profile unavailable', 'Could not open profile — user data missing.');
            }
          }}
          style={styles.profileCircle}>
          {otherUserPhoto ? (
            <Image source={{uri: otherUserPhoto}} style={styles.headerPhoto} />
          ) : (
            <Text style={styles.profileInitial}>
              {otherUserName?.charAt(0)?.toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => {
            if (otherUserId) {
              navigation.navigate('PublicProfile', {userId: otherUserId});
            } else {
              Alert.alert('Profile unavailable', 'Could not open profile — user data missing.');
            }
          }}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerName}>{otherUserName}</Text>
            <PremiumBadge tier={otherUserTier} verifiedReal={otherUserVerifiedReal} size="small" />
          </View>
          <Text style={[
            styles.headerStatus,
            {color: otherUserTyping ? '#FBBF24' : otherUserOnline ? '#4ADE80' : '#A09080'},
          ]}>
            {otherUserTyping ? 'typing...' : otherUserOnline ? '● Online' : '○ Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C9956C" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 20}}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>👋</Text>
                <Text style={styles.emptyText}>Say hello to {otherUserName}!</Text>
              </View>
            }
          />
        )}

        {otherUserTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingDots}>● ● ●</Text>
            </View>
          </View>
        )}

        {showEmojiPicker && (
          <View style={styles.emojiRow}>
            {QUICK_EMOJIS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiItemWrapper}
                onPress={() => {
                  setNewMessage(prev => prev + emoji);
                  setShowEmojiPicker(false);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}>
                <Text style={styles.emojiItem}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* REPLY BANNER */}
        {replyTo && (
          <View style={styles.replyBanner}>
            <View style={styles.replyBannerContent}>
              <Text style={styles.replyBannerName}>↩️ {replyTo.senderName}</Text>
              <Text style={styles.replyBannerText} numberOfLines={1}>
                {replyTo.text || '📷 Photo'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyBannerClose}>
              <Text style={styles.replyBannerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setShowEmojiPicker(!showEmojiPicker);
              if (!showEmojiPicker) inputRef.current?.blur();
            }}>
            <Text style={styles.emojiButton}>{showEmojiPicker ? '⌨️' : '😊'}</Text>
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Message"
            placeholderTextColor="#A09080"
            value={newMessage}
            onChangeText={handleTyping}
            multiline
            onFocus={() => setShowEmojiPicker(false)}
          />

          <TouchableOpacity style={styles.iconBtn} onPress={pickImage}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>

          <LiquidPress
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}>
            <Text style={styles.sendIcon}>➤</Text>
          </LiquidPress>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  flex: {flex: 1},
  header: {
    backgroundColor: '#141414',
    paddingHorizontal: 12, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 3, borderBottomColor: '#C9956C22',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  backWrapper: {marginRight: 8},
  backButton: {color: '#C9956C', fontWeight: 'bold', fontSize: 26},
  profileCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10, overflow: 'hidden',
  },
  headerPhoto: {width: 42, height: 42, borderRadius: 21},
  profileInitial: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 17},
  headerInfo: {flex: 1},
  headerNameRow: {flexDirection: 'row', alignItems: 'center', gap: 5},
  headerName: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
  headerStatus: {fontSize: 12, marginTop: 1},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120},
  emptyEmoji: {fontSize: 50, marginBottom: 12},
  emptyText: {color: '#A09080', fontSize: 16},
  messageRow: {flexDirection: 'row', marginBottom: 4, paddingHorizontal: 4, alignItems: 'flex-end'},
  myMessageRow: {justifyContent: 'flex-end'},
  otherMessageRow: {justifyContent: 'flex-start'},
  avatarSpace: {width: 32, marginRight: 6, alignItems: 'center', justifyContent: 'flex-end'},
  msgAvatar: {width: 30, height: 30, borderRadius: 15},
  msgAvatarPlaceholder: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center',
  },
  msgAvatarText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 12},
  bubble: {maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18},
  myBubble: {backgroundColor: '#C9956C'},
  otherBubble: {backgroundColor: '#1A1A1A'},
  myBubbleFirst: {borderTopRightRadius: 4},
  otherBubbleFirst: {borderTopLeftRadius: 4},
  myBubbleLast: {borderBottomRightRadius: 4},
  otherBubbleLast: {borderBottomLeftRadius: 4},
  messageText: {color: '#FFFFFF', fontSize: 15, lineHeight: 21},
  myMessageText: {color: '#FFFFFF'},
  linkText: {color: '#93C5FD', textDecorationLine: 'underline', fontSize: 15, lineHeight: 21},
  messageFooter: {flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3},
  timestamp: {color: 'rgba(255,255,255,0.5)', fontSize: 11},
  myTimestamp: {color: 'rgba(255,255,255,0.7)'},
  readReceipt: {color: 'rgba(255,255,255,0.5)', fontSize: 11},
  readReceiptRead: {color: '#93C5FD'},
  chatImage: {width: 200, height: 260, borderRadius: 12},
  dateSeparator: {alignItems: 'center', marginVertical: 12},
  dateText: {
    backgroundColor: '#141414', color: '#A09080',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 10, fontSize: 11,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  typingContainer: {paddingHorizontal: 48, paddingBottom: 6},
  typingBubble: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    alignSelf: 'flex-start',
    borderWidth: 0.5, borderColor: '#1E1E1E',
  },
  typingDots: {color: '#A09080', fontSize: 10, letterSpacing: 3},
  emojiRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: '#141414', padding: 8,
    borderTopWidth: 2, borderTopColor: '#C9956C44',
  },
  emojiItemWrapper: {width: '12.5%', alignItems: 'center', paddingVertical: 6},
  emojiItem: {fontSize: 26},

  // ── Reply banner (above input) ───────────────────────────────
  replyBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#141414',
    borderTopWidth: 2, borderTopColor: '#C9956C44',
    borderLeftWidth: 3, borderLeftColor: '#C9956C',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  replyBannerContent: {flex: 1},
  replyBannerName: {color: '#C9956C', fontSize: 12, fontWeight: 'bold', marginBottom: 2},
  replyBannerText: {color: '#A09080', fontSize: 13},
  replyBannerClose: {padding: 6},
  replyBannerCloseText: {color: '#A09080', fontSize: 16, fontWeight: 'bold'},

  // ── Reply preview inside bubble ──────────────────────────────
  replyPreview: {
    borderRadius: 8, padding: 8, marginBottom: 6,
    borderLeftWidth: 3,
  },
  replyPreviewMy: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderLeftColor: 'rgba(255,255,255,0.5)',
  },
  replyPreviewOther: {
    backgroundColor: 'rgba(201,149,108,0.15)',
    borderLeftColor: '#C9956C',
  },
  replyPreviewName: {color: '#C9956C', fontSize: 11, fontWeight: 'bold', marginBottom: 2},
  replyPreviewText: {color: 'rgba(255,255,255,0.7)', fontSize: 12},

  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: '#141414',
    borderTopWidth: 1, borderTopColor: '#C9956C33', gap: 6,
  },
  iconBtn: {padding: 6},
  emojiButton: {fontSize: 24},
  attachIcon: {fontSize: 22},
  input: {
    flex: 1, backgroundColor: '#060606',
    color: '#FFFFFF', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 120,
    borderWidth: 1, borderColor: '#1A1A1A', elevation: 0,
  },
  sendButton: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center',
    // Uniform borderWidth avoids the arc-cut artifact where asymmetric
    // top/bottom-only borders terminate at the 9 and 3 o'clock positions.
    borderWidth: 1.5,
    borderTopColor: '#E8C4A0',
    borderBottomColor: '#7A5535',
    borderLeftColor: 'rgba(232,196,160,0.45)',
    borderRightColor: 'rgba(122,85,53,0.45)',
    shadowColor: '#C9956C', shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
  sendButtonDisabled: {opacity: 0.4},
  sendIcon: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold'},
});