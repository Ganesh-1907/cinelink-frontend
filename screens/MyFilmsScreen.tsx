import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function MyFilmsScreen({navigation}: any) {
  const [films, setFilms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth().currentUser;

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('films')
      .where('directorId', '==', user?.uid)
      .onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFilms(data);
        setLoading(false);
      });
    return () => unsubscribe();
  }, []);

  const deleteFilm = async (filmId: string) => {
    Alert.alert('Delete Film', 'Are you sure you want to delete this film?', [
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await firestore().collection('films').doc(filmId).delete();
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>

        {/* FIX: changed button color from purple (#6366F1) to brand orange (#FF6B35) */}
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => navigation.navigate('UploadFilm')}>
          <Text style={styles.uploadBtnText}>🎬  Upload New Film</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#C9956C"
            style={{marginTop: 30}}
          />
        ) : films.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyText}>No films yet!</Text>
            <Text style={styles.emptySubText}>
              Upload your first short film.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('UploadFilm')}>
              <Text style={styles.emptyBtnText}>+ Upload Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          films.map((item: any) => (
            <View key={item.id} style={styles.card}>
              {item.posterUrl ? (
                <Image
                  source={{uri: item.posterUrl}}
                  style={styles.poster}
                />
              ) : (
                <View style={styles.posterPlaceholder}>
                  <Text style={styles.posterPlaceholderText}>🎬</Text>
                </View>
              )}

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>

                <View style={styles.badgeRow}>
                  {item.genre ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.genre}</Text>
                    </View>
                  ) : null}
                  {item.duration ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>⏱ {item.duration} min</Text>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          item.status === 'published'
                            ? 'rgba(74,222,128,0.12)'
                            : '#1E293B',
                      },
                    ]}>
                    <Text style={styles.badgeText}>
                      {item.status === 'published' ? '✅ Published' : '📝 Draft'}
                    </Text>
                  </View>
                </View>

                {item.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {item.videoUrl ? (
                  <Text style={styles.videoLink} numberOfLines={1}>
                    🎥 Video uploaded
                  </Text>
                ) : item.videoLink ? (
                  <Text style={styles.videoLink} numberOfLines={1}>
                    🔗 {item.videoLink}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteFilm(item.id)}>
                  <Text style={styles.deleteBtnText}>🗑  Delete Film</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081421',
  },

  section: {
    padding: 16,
    paddingBottom: 40,
  },

  /* FIX: orange instead of purple */
  uploadBtn: {
    backgroundColor: '#C9956C',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },

  uploadBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
  },

  emptyIcon: {
    fontSize: 50,
    marginBottom: 12,
  },

  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  emptySubText: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 20,
  },

  emptyBtn: {
    backgroundColor: '#C9956C',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  emptyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  card: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },

  poster: {
    width: '100%',
    height: 180,
  },

  posterPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  posterPlaceholderText: {
    fontSize: 40,
  },

  cardContent: {
    padding: 14,
  },

  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },

  badge: {
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  badgeText: {
    color: '#A09080',
    fontSize: 11,
  },

  description: {
    color: '#A09080',
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },

  videoLink: {
    color: '#C9956C',
    fontSize: 12,
    marginBottom: 8,
  },

  deleteBtn: {
    backgroundColor: '#450A0A',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#DC2626',
  },

  deleteBtnText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: 'bold',
  },
});