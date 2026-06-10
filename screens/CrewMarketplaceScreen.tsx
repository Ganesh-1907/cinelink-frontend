import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

/* ── clean name helper ── */
const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'Creator';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const CRAFTS = [
  'Actor', 'Director', 'Writer', 'Editor',
  'Cinematographer', 'Music Director', 'VFX Artist', 'Makeup Artist',
];

export default function CrewMarketplaceScreen({navigation}: any) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCraft, setSelectedCraft] = useState('Actor');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const currentUser = auth().currentUser;

  const currentUserName =
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'User';

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const snapshot = await firestore()
        .collection('crewPosts')
        .orderBy('createdAt', 'desc')
        .get();
      const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      setPosts(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!title || !location || !budget || !description) {
      Alert.alert('Missing Info', 'Please fill all fields!');
      return;
    }
    setPosting(true);
    try {
      await firestore().collection('crewPosts').add({
        title: title.trim(),
        craft: selectedCraft,
        location: location.trim(),
        budget: budget.trim(),
        description: description.trim(),
        createdByName: currentUserName,
        createdBy: currentUser?.email,
        createdById: currentUser?.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      setTitle('');
      setLocation('');
      setBudget('');
      setDescription('');
      Alert.alert('Posted! 🎬', 'Your requirement has been posted!');
      loadPosts();
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Something went wrong. Try again!');
    } finally {
      setPosting(false);
    }
  };

  /* ── START CHAT — FIXED: Pass complete chat object ── */
  const startChat = async (post: any) => {
    if (post.createdById === currentUser?.uid) {
      Alert.alert('Error', 'This is your own post!');
      return;
    }
    try {
      const chatId = [currentUser?.uid, post.createdById].sort().join('_');
      const chatRef = firestore().collection('chats').doc(chatId);
      const chatDoc = await chatRef.get();

      const otherName = post.createdByName || cleanName(post.createdBy);

      // ✅ Create or update chat with id field
      if (!chatDoc.exists) {
        await chatRef.set({
          id: chatId,
          participants: [currentUser?.uid, post.createdById],
          participantNames: [currentUserName, otherName],
          participantEmails: [currentUser?.email, post.createdBy],
          lastMessage: '',
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      // ✅ FIXED: Fetch the complete chat object and pass it
      const updatedChatDoc = await chatRef.get();
      const chatData = {
        id: chatId,
        ...updatedChatDoc.data(),
      };

      navigation.navigate('ChatScreen', {chat: chatData});
    } catch (e) {
      console.log('Chat error:', e);
      Alert.alert('Error', 'Could not start chat. Try again!');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        <Text style={styles.heading}>Crew Marketplace</Text>
        <Text style={styles.subHeading}>Post your project requirements</Text>

        {/* TITLE */}
        <Text style={styles.label}>Project Title *</Text>
        <TextInput
          placeholder="e.g. Looking for Actor for Short Film"
          placeholderTextColor="#A09080"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        {/* CRAFT */}
        <Text style={styles.label}>Looking for</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{marginBottom: 16}}>
          {CRAFTS.map(craft => (
            <TouchableOpacity
              key={craft}
              style={[
                styles.craftBtn,
                selectedCraft === craft && styles.craftBtnActive,
              ]}
              onPress={() => setSelectedCraft(craft)}>
              <Text
                style={[
                  styles.craftText,
                  selectedCraft === craft && styles.craftTextActive,
                ]}>
                {craft}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* LOCATION */}
        <Text style={styles.label}>Location *</Text>
        <TextInput
          placeholder="e.g. Hyderabad"
          placeholderTextColor="#A09080"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
        />

        {/* BUDGET */}
        <Text style={styles.label}>Budget *</Text>
        <TextInput
          placeholder="e.g. ₹5,000 / Negotiable"
          placeholderTextColor="#A09080"
          value={budget}
          onChangeText={setBudget}
          style={styles.input}
        />

        {/* DESCRIPTION */}
        <Text style={styles.label}>Description *</Text>
        <TextInput
          placeholder="Describe your project and requirements..."
          placeholderTextColor="#A09080"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, {height: 120, textAlignVertical: 'top'}]}
          multiline
        />

        {/* POST BUTTON */}
        <TouchableOpacity
          style={[styles.postBtn, posting && styles.postBtnDisabled]}
          onPress={createPost}
          disabled={posting}>
          {posting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>📋 Post Requirement</Text>
          )}
        </TouchableOpacity>

        {/* POSTS LIST */}
        <Text style={styles.sectionTitle}>
          Available Projects ({posts.length})
        </Text>

        {loading ? (
          <ActivityIndicator color="#C9956C" style={{marginTop: 20}} />
        ) : posts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No projects posted yet</Text>
            <Text style={styles.emptySubText}>Be the first to post!</Text>
          </View>
        ) : (
          posts.map((item: any) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.craftBadge}>
                  <Text style={styles.craftBadgeText}>{item.craft}</Text>
                </View>
              </View>

              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>📍 {item.location}</Text>
                <Text style={styles.cardMetaText}>💰 {item.budget}</Text>
              </View>

              <Text style={styles.cardDescription} numberOfLines={3}>
                {item.description}
              </Text>

              <Text style={styles.owner}>
                Posted by {item.createdByName || cleanName(item.createdBy)}
              </Text>

              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => startChat(item)}>
                <Text style={styles.messageBtnText}>💬 Message</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{height: 60}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    padding: 16,
  },

  heading: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
  },

  subHeading: {
    color: '#A09080',
    fontSize: 14,
    marginBottom: 20,
  },

  label: {
    color: '#C9956C',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    fontSize: 14,
  },

  craftBtn: {
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  craftBtnActive: {
    backgroundColor: '#C9956C',
    borderColor: '#C9956C',
  },

  craftText: {color: '#A09080', fontWeight: '600', fontSize: 13},
  craftTextActive: {color: '#FFFFFF', fontWeight: 'bold'},

  postBtn: {
    backgroundColor: '#C9956C',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 28,
  },

  postBtnDisabled: {opacity: 0.5},

  postBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },

  sectionTitle: {
    color: '#C9956C',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  emptyBox: {alignItems: 'center', marginTop: 40},
  emptyIcon: {fontSize: 40, marginBottom: 10},
  emptyText: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
  emptySubText: {color: '#A09080', fontSize: 13, marginTop: 4},

  card: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },

  craftBadge: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C9956C',
  },

  craftBadgeText: {
    color: '#C9956C',
    fontSize: 11,
    fontWeight: '600',
  },

  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },

  cardMetaText: {color: '#A09080', fontSize: 13},

  cardDescription: {
    color: '#A09080',
    lineHeight: 22,
    fontSize: 13,
    marginBottom: 12,
  },

  owner: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12,
  },

  messageBtn: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C9956C',
  },

  messageBtnText: {
    color: '#C9956C',
    fontSize: 14,
    fontWeight: 'bold',
  },
});