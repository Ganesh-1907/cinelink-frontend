import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  SafeAreaView,
} from 'react-native';
import api from '../src/api/client';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface MovieData {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date: string;
  overview: string;
  popularity: number;
  original_language: string;
  genres?: {id: number; name: string}[];
  runtime?: number;
  tagline?: string;
  homepage?: string;
  imdb_id?: string;
  production_companies?: {name: string}[];
  credits?: {
    cast: {name: string; character: string; profile_path: string | null}[];
    crew: {name: string; job: string}[];
  };
}

export default function MovieDetails({route, navigation}: any) {
  const {movieId, movie: passedMovie} = route.params;
  const [movie, setMovie] = useState<MovieData | null>(passedMovie || null);
  const [loading, setLoading] = useState(!passedMovie);
  const [error, setError] = useState('');

  useEffect(() => {
    if (movieId && !passedMovie) {
      fetchMovieDetails();
    }
  }, [movieId]);

  const fetchMovieDetails = async () => {
    setLoading(true);
    try {
      if (movieId) {
        const result = await api.get(`/tmdb/movie/${movieId}`);
        setMovie(result.movie as MovieData);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load movie details');
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => {
    if (url) Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <ActivityIndicator size="large" color="#C9956C" />
        <Text style={{color: '#A09080', marginTop: 12}}>Loading movie details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center', padding: 20}]}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <Text style={{fontSize: 48, marginBottom: 12}}>🎬</Text>
        <Text style={{color: '#F87171', fontSize: 16, textAlign: 'center'}}>{error}</Text>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <Text style={{color: '#A09080'}}>No movie data available</Text>
      </View>
    );
  }

  const genreNames = movie.genres?.map(g => g.name).join(', ') || 'N/A';
  const castList = movie.credits?.cast?.slice(0, 10) || [];
  const director = movie.credits?.crew?.find(c => c.job === 'Director')?.name;
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'N/A';

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0A0A0A'}}>
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {movie.backdrop_path ? (
        <Image source={{uri: `${IMAGE_BASE_URL}${movie.backdrop_path}`}} style={styles.backdrop} />
      ) : null}

      <View style={styles.headerRow}>
        {movie.poster_path ? (
          <Image source={{uri: `${IMAGE_BASE_URL}${movie.poster_path}`}} style={styles.poster} />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>🎬</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{movie.title}</Text>
          {movie.tagline ? <Text style={styles.tagline}>{movie.tagline}</Text> : null}
          <View style={styles.row}>
            <Text style={styles.rating}>⭐ {movie.vote_average?.toFixed(1) || 'N/A'}</Text>
            <Text style={styles.date}>📅 {movie.release_date?.split('-')[0] || 'N/A'}</Text>
          </View>
          <Text style={styles.meta}>{genreNames}</Text>
          <Text style={styles.meta}>{runtime}</Text>
          {director ? <Text style={styles.meta}>Directed by {director}</Text> : null}
        </View>
      </View>

      <View style={styles.content}>
        {movie.overview ? (
          <>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.overview}>{movie.overview}</Text>
          </>
        ) : null}

        {castList.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Cast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.castRow}>
              {castList.map((actor, i) => (
                <View key={i} style={styles.castCard}>
                  {actor.profile_path ? (
                    <Image source={{uri: `${IMAGE_BASE_URL}${actor.profile_path}`}} style={styles.castPhoto} />
                  ) : (
                    <View style={[styles.castPhoto, {backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center'}]}>
                      <Text style={{fontSize: 24}}>🎭</Text>
                    </View>
                  )}
                  <Text style={styles.castName} numberOfLines={1}>{actor.name}</Text>
                  <Text style={styles.castRole} numberOfLines={1}>{actor.character}</Text>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{movie.vote_count || 0}</Text>
            <Text style={styles.statLabel}>Votes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{movie.popularity?.toFixed(0) || 'N/A'}</Text>
            <Text style={styles.statLabel}>Popularity</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{movie.original_language?.toUpperCase() || 'N/A'}</Text>
            <Text style={styles.statLabel}>Language</Text>
          </View>
        </View>

        {movie.homepage ? (
          <TouchableOpacity style={styles.linkButton} onPress={() => openLink(movie.homepage!)}>
            <Text style={styles.linkText}>🌐 Visit Homepage</Text>
          </TouchableOpacity>
        ) : null}

        {movie.imdb_id ? (
          <TouchableOpacity style={styles.linkButton} onPress={() => openLink(`https://www.imdb.com/title/${movie.imdb_id}`)}>
            <Text style={styles.linkText}>🎬 View on IMDb</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  backdrop: {width: '100%', height: 200, position: 'absolute', opacity: 0.3},
  headerRow: {flexDirection: 'row', padding: 20, paddingTop: 10, gap: 16},
  poster: {width: 130, height: 195, borderRadius: 12, resizeMode: 'cover'},
  posterPlaceholder: {width: 130, height: 195, borderRadius: 12, backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center'},
  posterPlaceholderText: {fontSize: 48},
  headerInfo: {flex: 1, justifyContent: 'center'},
  title: {color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 4},
  tagline: {color: '#A09080', fontSize: 14, fontStyle: 'italic', marginBottom: 8},
  row: {flexDirection: 'row', gap: 12, marginBottom: 6},
  rating: {color: '#FBBF24', fontSize: 14, fontWeight: 'bold'},
  date: {color: '#A09080', fontSize: 14},
  meta: {color: '#A09080', fontSize: 13, marginBottom: 2},
  content: {padding: 20, paddingTop: 0},
  sectionTitle: {color: '#C9956C', fontSize: 18, fontWeight: 'bold', marginBottom: 8, marginTop: 16},
  overview: {color: '#FFFFFF', fontSize: 15, lineHeight: 24},
  castRow: {marginTop: 8, marginBottom: 16},
  castCard: {marginRight: 16, alignItems: 'center', width: 90},
  castPhoto: {width: 72, height: 72, borderRadius: 36, marginBottom: 6},
  castName: {color: '#FFFFFF', fontSize: 12, textAlign: 'center', fontWeight: '600'},
  castRole: {color: '#A09080', fontSize: 11, textAlign: 'center'},
  statsRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 16},
  statBox: {flex: 1, backgroundColor: '#1C1C1C', borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#2A2A2A'},
  statValue: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
  statLabel: {color: '#A09080', fontSize: 12, marginTop: 4},
  linkButton: {backgroundColor: '#1C1C1C', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#C9956C'},
  linkText: {color: '#C9956C', fontSize: 15, fontWeight: '600'},
});
