import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const CLOUD_NAME = 'dipwobgzb';
const UPLOAD_PRESET = 'cinelink_upload';

const GENRES = ['Drama', 'Action', 'Romance', 'Comedy', 'Thriller', 'Sci-Fi', 'Horror', 'Documentary'];

export default function UploadFilmScreen({navigation}: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Drama');
  const [duration, setDuration] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [uploadType, setUploadType] = useState<'link' | 'file'>('link');
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = auth().currentUser;

  const pickPoster = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets && result.assets[0]?.uri) {
      const uri = result.assets[0].uri!;
      setPosterUri(uri);
      setPosterUrl(null);
      setUploadingPoster(true);
      try {
        const fd = new FormData();
        fd.append('file', {uri, type: 'image/jpeg', name: 'poster.jpg'} as any);
        fd.append('upload_preset', UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {method: 'POST', body: fd});
        const data = await res.json();
        setPosterUrl(data.secure_url);
      } catch { Alert.alert('Error', 'Poster upload failed.'); }
      finally { setUploadingPoster(false); }
    }
  };

  const pickVideo = async () => {
    const result = await launchImageLibrary({mediaType: 'video', videoQuality: 'medium'});
    if (result.assets && result.assets[0]?.uri) {
      const uri = result.assets[0].uri!;
      setVideoUrl(null);
      setUploadingVideo(true);
      try {
        const fd = new FormData();
        fd.append('file', {uri, type: 'video/mp4', name: 'film.mp4'} as any);
        fd.append('upload_preset', UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {method: 'POST', body: fd});
        const data = await res.json();
        setVideoUrl(data.secure_url);
      } catch { Alert.alert('Error', 'Video upload failed.'); }
      finally { setUploadingVideo(false); }
    }
  };

  const uploadFilm = async () => {
    if (!title.trim() || !description.trim() || !duration.trim()) {
      Alert.alert('Missing Info', 'Please fill in Title, Description and Duration.'); return;
    }
    if (uploadType === 'link' && !videoLink.trim()) {
      Alert.alert('Missing Link', 'Please paste your video link.'); return;
    }
    if (uploadType === 'file' && !videoUrl) {
      Alert.alert('Missing Video', 'Please upload a video file first.'); return;
    }
    if (uploadingPoster || uploadingVideo) {
      Alert.alert('Please Wait', 'Files are still uploading...'); return;
    }
    setLoading(true);
    try {
      await firestore().collection('films').add({
        title: title.trim(),
        description: description.trim(),
        genre,
        duration: duration.trim(),
        posterUrl: posterUrl || '',
        videoLink: uploadType === 'link' ? videoLink.trim() : '',
        videoUrl: uploadType === 'file' ? videoUrl : '',
        uploadType,
        directorId: user?.uid,
        directorName: user?.displayName || user?.email?.split('@')[0] || 'Creator',
        directorEmail: user?.email,
        status: 'Screening',
        likes: 0,
        likedBy: [],
        views: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      Alert.alert('Success! 🎬', 'Your short film has been uploaded.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch { Alert.alert('Error', 'Something went wrong. Try again!'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload Short Film</Text>
          <View style={{width: 60}} />
        </View>

        <View style={styles.body}>

          {/* POSTER */}
          <TouchableOpacity style={styles.posterPicker} onPress={pickPoster}>
            {posterUri ? (
              <>
                <Image source={{uri: posterUri}} style={styles.posterImage} />
                {uploadingPoster && (
                  <View style={styles.overlay}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.overlayText}>Uploading poster...</Text>
                  </View>
                )}
                {posterUrl && !uploadingPoster && (
                  <View style={styles.doneBadge}>
                    <Text style={styles.doneBadgeText}>✅ Uploaded</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.posterEmpty}>
                <Text style={styles.posterIcon}>🎬</Text>
                <Text style={styles.posterEmptyText}>Tap to add poster</Text>
                <Text style={styles.posterEmptySub}>Recommended: 16:9 image</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Film Title *</Text>
          <TextInput style={styles.input} placeholder="e.g. Oka Chinna Katha"
            placeholderTextColor="#A09080" value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Description *</Text>
          <TextInput style={[styles.input, styles.multiline]}
            placeholder="What is your film about? Cast, story, theme..."
            placeholderTextColor="#A09080" value={description}
            onChangeText={setDescription} multiline numberOfLines={4} />

          <Text style={styles.label}>Duration (minutes) *</Text>
          <TextInput style={styles.input} placeholder="e.g. 18"
            placeholderTextColor="#A09080" value={duration}
            onChangeText={setDuration} keyboardType="numeric" />

          <Text style={styles.label}>Genre</Text>
          <View style={styles.genreGrid}>
            {GENRES.map(g => (
              <TouchableOpacity key={g}
                style={[styles.genreBtn, genre === g && styles.genreBtnActive]}
                onPress={() => setGenre(g)}>
                <Text style={[styles.genreBtnText, genre === g && styles.genreBtnTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Video Upload</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, uploadType === 'link' && styles.toggleBtnActive]}
              onPress={() => setUploadType('link')}>
              <Text style={[styles.toggleBtnText, uploadType === 'link' && styles.toggleBtnTextActive]}>
                🔗  Paste Link
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, uploadType === 'file' && styles.toggleBtnActive]}
              onPress={() => setUploadType('file')}>
              <Text style={[styles.toggleBtnText, uploadType === 'file' && styles.toggleBtnTextActive]}>
                📁  Upload File
              </Text>
            </TouchableOpacity>
          </View>

          {uploadType === 'link' ? (
            <View>
              <TextInput style={styles.input}
                placeholder="Paste YouTube / Drive / Vimeo link"
                placeholderTextColor="#A09080" value={videoLink}
                onChangeText={setVideoLink} autoCapitalize="none" />
              <Text style={styles.hint}>Supported: YouTube, Google Drive, Vimeo, Instagram</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.fileBox, videoUrl ? styles.fileBoxDone : null]}
              onPress={pickVideo}>
              {uploadingVideo ? (
                <>
                  <ActivityIndicator color="#C9956C" />
                  <Text style={styles.fileBoxText}>Uploading video...</Text>
                  <Text style={styles.fileBoxSub}>This may take a moment</Text>
                </>
              ) : videoUrl ? (
                <>
                  <Text style={styles.fileBoxIcon}>✅</Text>
                  <Text style={styles.fileBoxText}>Video uploaded!</Text>
                  <Text style={styles.fileBoxSub}>Tap to replace</Text>
                </>
              ) : (
                <>
                  <Text style={styles.fileBoxIcon}>🎥</Text>
                  <Text style={styles.fileBoxText}>Tap to pick video file</Text>
                  <Text style={styles.fileBoxSub}>MP4 recommended</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.benefitsBox}>
            <Text style={styles.benefitsTitle}>🌟 CineLink Creator Benefits</Text>
            {[
              'Showcase your talent to industry professionals',
              'Get audience ratings & comments',
              'Participate in CineLink contests',
              'Build your cinema portfolio',
              'Reach filmmakers & casting directors',
            ].map((item, i) => (
              <Text key={i} style={styles.benefitsItem}>• {item}</Text>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (loading || uploadingPoster || uploadingVideo) && styles.submitBtnDisabled]}
            onPress={uploadFilm}
            disabled={loading || uploadingPoster || uploadingVideo}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>🎬  Upload Film</Text>}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0A0A0A'},
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#1C1C1C', borderBottomWidth: 1, borderBottomColor: '#2A2A2A',
  },
  backBtn: {color: '#C9956C', fontSize: 15, fontWeight: 'bold', width: 60},
  headerTitle: {color: '#fff', fontSize: 17, fontWeight: 'bold'},
  body: {padding: 16, paddingBottom: 48},
  posterPicker: {
    width: '100%', height: 200, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#2A2A2A', borderStyle: 'dashed', marginBottom: 4,
  },
  posterImage: {width: '100%', height: '100%', resizeMode: 'cover'},
  posterEmpty: {flex: 1, backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center', gap: 6},
  posterIcon: {fontSize: 40},
  posterEmptyText: {color: '#A09080', fontSize: 14, fontWeight: '600'},
  posterEmptySub: {color: '#A09080', fontSize: 12},
  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  overlayText: {color: '#fff', fontSize: 13},
  doneBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  doneBadgeText: {color: '#4ADE80', fontSize: 12, fontWeight: 'bold'},
  label: {
    color: '#C9956C', fontSize: 13, fontWeight: '700',
    marginBottom: 8, marginTop: 18, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1C1C1C', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2A2A2A',
  },
  multiline: {height: 100, textAlignVertical: 'top'},
  hint: {color: '#A09080', fontSize: 12, marginTop: 6},
  genreGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  genreBtn: {
    backgroundColor: '#1C1C1C', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: '#2A2A2A',
  },
  genreBtnActive: {backgroundColor: '#C9956C', borderColor: '#C9956C'},
  genreBtnText: {color: '#A09080', fontSize: 13},
  genreBtnTextActive: {color: '#fff', fontWeight: 'bold'},
  toggleRow: {flexDirection: 'row', gap: 8, marginBottom: 12},
  toggleBtn: {
    flex: 1, backgroundColor: '#1C1C1C', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A',
  },
  toggleBtnActive: {backgroundColor: '#C9956C', borderColor: '#C9956C'},
  toggleBtnText: {color: '#A09080', fontSize: 13, fontWeight: '500'},
  toggleBtnTextActive: {color: '#fff', fontWeight: 'bold'},
  fileBox: {
    backgroundColor: '#1C1C1C', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#2A2A2A', borderStyle: 'dashed', padding: 28, alignItems: 'center', gap: 6,
  },
  fileBoxDone: {borderColor: '#4ADE80', borderStyle: 'solid', backgroundColor: '#0D2818'},
  fileBoxIcon: {fontSize: 32},
  fileBoxText: {color: '#A09080', fontSize: 14, fontWeight: '600'},
  fileBoxSub: {color: '#A09080', fontSize: 12},
  benefitsBox: {
    backgroundColor: '#1C1C1C', borderRadius: 12, padding: 16,
    marginTop: 22, borderWidth: 1, borderColor: '#2A2A2A',
  },
  benefitsTitle: {color: '#C9956C', fontSize: 15, fontWeight: 'bold', marginBottom: 10},
  benefitsItem: {color: '#A09080', fontSize: 13, marginBottom: 5, lineHeight: 20},
  submitBtn: {
    backgroundColor: '#C9956C', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 26,
  },
  submitBtnDisabled: {opacity: 0.5},
  submitBtnText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
});
