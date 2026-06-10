import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export default function MovieDetails({route}: any) {
  const {movie} = route.params;

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      <Image
        source={{
          uri: movie.poster_path
            ? `${IMAGE_BASE_URL}${movie.poster_path}`
            : 'https://via.placeholder.com/400x600?text=No+Image',
        }}
        style={styles.poster}
      />

      <View style={styles.content}>
        <Text style={styles.title}>{movie.title}</Text>

        <View style={styles.row}>
          <Text style={styles.rating}>
            ⭐ {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
          </Text>
          <Text style={styles.date}>
            📅 {movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.overview}>
          {movie.overview ? movie.overview : 'No description available.'}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {movie.vote_count ? movie.vote_count : '0'}
            </Text>
            <Text style={styles.statLabel}>Votes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {movie.popularity ? movie.popularity.toFixed(0) : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Popularity</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {movie.original_language ? movie.original_language.toUpperCase() : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Language</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  poster: {
    width: '100%',
    height: 450,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  rating: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: 'bold',
  },
  date: {
    color: '#94A3B8',
    fontSize: 16,
  },
  sectionTitle: {
    color: '#6366F1',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  overview: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
});