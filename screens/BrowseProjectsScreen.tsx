import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const PROJECT_TYPES = ['All', 'Short Film', 'Feature Film', 'Web Series', 'Ad Film', 'Music Video', 'Documentary'];

export default function BrowseProjectsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const currentUser = auth().currentUser;

  useEffect(() => {
    const unsub = firestore()
      .collection('projects')
      .where('status', '==', 'Recruiting')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          setProjects(data);
          setLoading(false);
        },
        err => {
          console.log('PROJECTS ERROR:', err);
          setLoading(false);
        },
      );
    return () => unsub();
  }, []);

  const filteredProjects = projects.filter((item: any) => {
    const text = searchText.toLowerCase();
    const typeMatch = selectedType === 'All' || item.type === selectedType;
    const searchMatch =
      !text ||
      item.title?.toLowerCase().includes(text) ||
      item.directorName?.toLowerCase().includes(text) ||
      item.location?.toLowerCase().includes(text) ||
      item.language?.toLowerCase().includes(text);
    return typeMatch && searchMatch;
  });

  const getOpenRoles = (rolesNeeded: any[]) => {
    if (!rolesNeeded) return 0;
    return rolesNeeded.filter(r => !r.filled).length;
  };

  const renderProject = ({item}: any) => {
    const openRoles = getOpenRoles(item.rolesNeeded);
    const isOwner = item.directorId === currentUser?.uid;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ProjectDetail', {project: item})}>

        <View style={styles.cardHeader}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.type}</Text>
          </View>
          <View style={[styles.statusBadge, openRoles === 0 && styles.statusBadgeFull]}>
            <Text style={styles.statusBadgeText}>
              {openRoles === 0 ? '🔒 Full' : `🟢 ${openRoles} Open`}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>🎬 {item.directorName}</Text>
          <Text style={styles.metaText}>📍 {item.location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>🗣️ {item.language}</Text>
          <Text style={styles.metaText}>👥 {item.membersCount || 1} members</Text>
        </View>

        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.rolesSection}>
          <Text style={styles.rolesTitle}>Roles Needed:</Text>
          <View style={styles.rolesWrap}>
            {item.rolesNeeded?.slice(0, 5).map((role: any, index: number) => (
              <View key={index} style={[styles.rolePill, role.filled && styles.rolePillFilled]}>
                <Text style={[styles.rolePillText, role.filled && styles.rolePillTextFilled]}>
                  {role.filled ? '✓ ' : ''}{role.role}
                </Text>
              </View>
            ))}
            {item.rolesNeeded?.length > 5 && (
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>+{item.rolesNeeded.length - 5} more</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          {isOwner ? (
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>👑 Your Project</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => navigation.navigate('ProjectDetail', {project: item})}>
              <Text style={styles.applyBtnText}>View & Apply →</Text>
            </TouchableOpacity>
          )}
        </View>

      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* ✅ BACK BUTTON */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={{flex: 1}}>
            <Text style={styles.headerTitle}>🎬 CineLink Rooms</Text>
            <Text style={styles.headerSub}>Find your next film project</Text>
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreateProject')}>
            <Text style={styles.createBtnText}>+ Create</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search projects..."
          placeholderTextColor="#A09080"
          value={searchText}
          onChangeText={setSearchText}
        />

        <FlatList
          data={PROJECT_TYPES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item}
          contentContainerStyle={styles.filterList}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[styles.filterChip, selectedType === item && styles.filterChipActive]}
              onPress={() => setSelectedType(item)}>
              <Text style={[styles.filterChipText, selectedType === item && styles.filterChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9956C" />
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={item => item.id}
          renderItem={renderProject}
          contentContainerStyle={{padding: 16, paddingBottom: insets.bottom + 80}}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🎬</Text>
              <Text style={styles.emptyTitle}>No projects yet!</Text>
              <Text style={styles.emptyText}>Be the first to create a project</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('CreateProject')}>
                <Text style={styles.emptyBtnText}>+ Create Project</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  header: {backgroundColor: '#0A0A0A', paddingBottom: 8},
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
  },
  backBtn: {marginRight: 10},
  backText: {color: '#C9956C', fontSize: 26, fontWeight: 'bold'},
  headerTitle: {color: '#FFFFFF', fontSize: 22, fontWeight: 'bold'},
  headerSub: {color: '#A09080', fontSize: 13, marginTop: 2},
  createBtn: {
    backgroundColor: '#C9956C', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  createBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 14},
  searchInput: {
    backgroundColor: '#1C1C1C', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    color: '#FFFFFF', fontSize: 14,
    marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  filterList: {paddingHorizontal: 16, gap: 8, paddingBottom: 4},
  filterChip: {
    backgroundColor: '#1C1C1C', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  filterChipActive: {backgroundColor: '#C9956C', borderColor: '#C9956C'},
  filterChipText: {color: '#A09080', fontSize: 13},
  filterChipTextActive: {color: '#FFFFFF', fontWeight: 'bold'},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  card: {
    backgroundColor: '#1C1C1C', borderRadius: 16,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10},
  typeBadge: {
    backgroundColor: '#2A2A2A', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeText: {color: '#A09080', fontSize: 12, fontWeight: '600'},
  statusBadge: {
    backgroundColor: '#1A3020', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#4ADE80',
  },
  statusBadgeFull: {backgroundColor: '#2A0A0A', borderColor: '#DC2626'},
  statusBadgeText: {color: '#4ADE80', fontSize: 12, fontWeight: '600'},
  cardTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 8},
  metaRow: {flexDirection: 'row', gap: 16, marginBottom: 4},
  metaText: {color: '#A09080', fontSize: 13},
  description: {color: '#A09080', fontSize: 13, lineHeight: 20, marginTop: 8},
  rolesSection: {marginTop: 12},
  rolesTitle: {color: '#C9956C', fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase'},
  rolesWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  rolePill: {
    backgroundColor: '#2A2A2A', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  rolePillFilled: {backgroundColor: '#1A3020'},
  rolePillText: {color: '#A09080', fontSize: 12},
  rolePillTextFilled: {color: '#4ADE80'},
  cardFooter: {marginTop: 14},
  ownerBadge: {
    backgroundColor: '#2A1500', borderRadius: 10,
    padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#FBBF24',
  },
  ownerBadgeText: {color: '#FBBF24', fontSize: 13, fontWeight: 'bold'},
  applyBtn: {
    backgroundColor: '#C9956C', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  applyBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 14},
  emptyContainer: {alignItems: 'center', paddingTop: 80},
  emptyEmoji: {fontSize: 60, marginBottom: 16},
  emptyTitle: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8},
  emptyText: {color: '#A09080', fontSize: 14, marginBottom: 20},
  emptyBtn: {
    backgroundColor: '#C9956C', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 14},
});