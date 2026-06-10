import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function SavedAuditionsScreen({navigation}: any) {
  const [savedAuditions, setSavedAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = auth().currentUser;

  useEffect(() => {
    loadSavedAuditions();
  }, []);

  /* ════════════════════════════════════════
     LOAD SAVED AUDITIONS
     FIX: reads saved IDs from user doc array,
     then fetches each audition's full data
  ════════════════════════════════════════ */
  const loadSavedAuditions = async () => {
    try {
      // Step 1 — get saved audition IDs from user doc
      const userDoc = await firestore()
        .collection('users')
        .doc(user?.uid)
        .get();

      const savedIds: string[] = userDoc.data()?.savedAuditions || [];

      if (savedIds.length === 0) {
        setSavedAuditions([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Step 2 — fetch each audition's full data
      const auditions: any[] = [];
      for (const auditionId of savedIds) {
        try {
          const doc = await firestore()
            .collection('auditions')
            .doc(auditionId)
            .get();
          if (doc.exists) {
            auditions.push({id: doc.id, ...doc.data()});
          }
        } catch (e) {
          console.log('Error fetching audition:', e);
        }
      }

      setSavedAuditions(auditions);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSavedAuditions();
  };

  /* ════════════════════════════════════════
     UNSAVE AUDITION
     FIX: removes ID from user doc array
  ════════════════════════════════════════ */
  const unsaveAudition = async (auditionId: string) => {
    Alert.alert('Remove', 'Remove from saved auditions?', [
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            // FIX: remove from user doc array (not a separate collection)
            await firestore()
              .collection('users')
              .doc(user?.uid)
              .update({
                savedAuditions:
                  firestore.FieldValue.arrayRemove(auditionId),
              });
            // Update local state
            setSavedAuditions(prev =>
              prev.filter(a => a.id !== auditionId),
            );
          } catch (e) {
            console.log(e);
          }
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#C9956C"
          colors={['#C9956C']}
        />
      }>

      <View style={styles.section}>

        {/* COUNT */}
        {savedAuditions.length > 0 && (
          <Text style={styles.countText}>
            {savedAuditions.length} saved audition{savedAuditions.length !== 1 ? 's' : ''}
          </Text>
        )}

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#C9956C"
            style={{marginTop: 30}}
          />
        ) : savedAuditions.length === 0 ? (

          /* EMPTY STATE */
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>💾</Text>
            <Text style={styles.emptyText}>No saved auditions!</Text>
            <Text style={styles.emptySubText}>
              Tap 🔖 Save on any audition to save it here.
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => navigation.navigate('Home')}>
              <Text style={styles.browseBtnText}>Browse Auditions</Text>
            </TouchableOpacity>
          </View>
        ) : (

          /* AUDITION CARDS */
          savedAuditions.map((item: any) => (
            <View key={item.id} style={styles.card}>

              {/* HEADER */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.badgeGreen}>
                  <Text style={styles.badgeText}>
                    {item.status || 'Open'}
                  </Text>
                </View>
              </View>

              {/* INFO */}
              <View style={styles.infoGrid}>
                {item.location ? (
                  <Text style={styles.cardSub}>📍 {item.location}</Text>
                ) : null}
                {item.gender ? (
                  <Text style={styles.cardSub}>👤 {item.gender}</Text>
                ) : null}
                {item.role ? (
                  <Text style={styles.cardSub}>🎭 {item.role}</Text>
                ) : null}
                {item.lastDate ? (
                  <Text style={styles.cardSub}>📅 Last Date: {item.lastDate}</Text>
                ) : null}
                {(item.directorName || item.directorEmail) ? (
                 <Text style={styles.cardSub}>
                   🎬 {item.directorName || item.directorEmail?.split('@')[0]}
                 </Text>
               ) : null}
              </View>

              {/* DESCRIPTION */}
              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              {/* BUTTONS */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() =>
                    navigation.navigate('AuditionDetail', {audition: item})
                  }>
                  <Text style={styles.viewBtnText}>View & Apply →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => unsaveAudition(item.id)}>
                  <Text style={styles.removeBtnText}>🗑</Text>
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
    backgroundColor: '#0A0A0A',
  },

  section: {
    padding: 16,
    paddingBottom: 40,
  },

  countText: {
    color: '#A09080',
    fontSize: 13,
    marginBottom: 16,
  },

  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
  },

  emptyIcon: {fontSize: 50, marginBottom: 12},

  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  emptySubText: {
    color: '#A09080',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },

  browseBtn: {
    backgroundColor: '#C9956C',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 14},

  card: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },

  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },

  badgeGreen: {
    backgroundColor: '#064E3B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {color: '#6EE7B7', fontSize: 11, fontWeight: '600'},

  infoGrid: {
    gap: 4,
    marginBottom: 8,
  },

  cardSub: {
    color: '#A09080',
    fontSize: 13,
  },

  description: {
    color: '#A09080',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },

  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },

  viewBtn: {
    flex: 1,
    backgroundColor: '#C9956C',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  viewBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: 'bold'},

  removeBtn: {
    backgroundColor: '#450A0A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  removeBtnText: {color: '#FCA5A5', fontSize: 16},
});