import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Video from 'react-native-video';

const CLOUD_NAME = 'dipwobgzb';
const UPLOAD_PRESET = 'cinelink_upload';
const MAX_DURATION = 90;

export default function UploadReelsScreen({navigation}: any) {
  const currentUser = auth().currentUser;
  const [videoUri, setVideoUri] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoSelected, setVideoSelected] = useState(false);

  /* ── PICK VIDEO ── */
  const pickVideo = async () => {
    const result = await launchImageLibrary({
      mediaType: 'video',
      videoQuality: 'medium',
    });
    if (result.assets && result.assets[0]?.uri) {
      setVideoUri(result.assets[0].uri);
      setVideoSelected(true);
      setVideoDuration(0);
    }
  };

  /* ── UPLOAD REEL ── */
  const uploadReel = async () => {
    if (!videoUri) {
      Alert.alert('Missing Video', 'Please select a video first.');
      return;
    }
    if (videoDuration > MAX_DURATION) {
      Alert.alert(
        'Video Too Long',
        `Maximum is 90 seconds. Your video is ${Math.floor(videoDuration)}s.`,
      );
      return;
    }
    if (!caption.trim()) {
      Alert.alert('Missing Caption', 'Please add a caption.');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      /* Upload video to Cloudinary */
      const formData = new FormData();
      formData.append('file', {
        uri: videoUri,
        type: 'video/mp4',
        name: `reel_${Date.now()}.mp4`,
      } as any);
      formData.append('upload_preset', UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
        {method: 'POST', body: formData},
      );
      const videoData = await response.json();
      setUploading(false);

      /* Fetch user profile */
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser?.uid)
        .get();
      const userData = userDoc.data();

      // FIX: resolve name with full fallback chain
      const creatorName =
        userData?.displayName ||
        userData?.fullName ||
        userData?.name ||
        currentUser?.displayName ||
        currentUser?.email?.split('@')[0] ||
        'Creator';

      // FIX: resolve avatar — tries both field casings
      const creatorAvatar =
        userData?.photoUrl ||
        userData?.photoURL ||
        currentUser?.photoURL ||
        '';

      // FIX: save to 'cinereels' — matches HomeScreen + ReelsScreen
      await firestore().collection('cinereels').add({
        videoUrl: videoData.secure_url,
        creatorId: currentUser?.uid,
        creatorName,
        creatorAvatar,
        caption: caption.trim(),
        duration: videoDuration,
        likes: 0,
        comments: 0,
        views: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success! 🎬', 'Your reel has been uploaded.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e) {
      console.log('Upload error:', e);
      Alert.alert('Error', 'Failed to upload reel. Try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled">

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload Reel</Text>
          <View style={{width: 60}} />
        </View>

        {/* VIDEO PICKER / PREVIEW */}
        {videoSelected ? (
          <View style={styles.videoContainer}>
            <Video
              source={{uri: videoUri}}
              style={styles.video}
              resizeMode="cover"
              paused
              controls
              onLoad={data => setVideoDuration(data.duration)}
            />

            {/* DURATION */}
            <View style={styles.durationRow}>
              <Text style={styles.durationLabel}>Duration:</Text>
              <Text
                style={[
                  styles.durationValue,
                  videoDuration > MAX_DURATION && styles.durationError,
                ]}>
                {Math.floor(videoDuration)}s / {MAX_DURATION}s max
              </Text>
            </View>

            <TouchableOpacity style={styles.changeBtn} onPress={pickVideo}>
              <Text style={styles.changeBtnText}>🔄 Change Video</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.picker} onPress={pickVideo}>
            <Text style={styles.pickerIcon}>🎬</Text>
            <Text style={styles.pickerText}>Tap to select video</Text>
            <Text style={styles.pickerSub}>Max 90 seconds · MP4 recommended</Text>
          </TouchableOpacity>
        )}

        {/* TOO LONG WARNING */}
        {videoSelected && videoDuration > MAX_DURATION && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              ⚠️ Video too long! Maximum is 90 seconds.
            </Text>
          </View>
        )}

        {/* CAPTION */}
        <Text style={styles.label}>Caption *</Text>
        <TextInput
          style={styles.input}
          placeholder="Add a caption... #cinema #acting"
          placeholderTextColor="#A09080"
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={300}
        />
        <Text style={styles.charCount}>{caption.length}/300</Text>

        {/* UPLOAD BUTTON */}
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (!videoSelected ||
              videoDuration > MAX_DURATION ||
              loading) &&
              styles.uploadButtonDisabled,
          ]}
          onPress={uploadReel}
          disabled={!videoSelected || videoDuration > MAX_DURATION || loading}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>
                {uploading ? '  Uploading video...' : '  Saving...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.uploadButtonText}>🎬  Upload Reel</Text>
          )}
        </TouchableOpacity>

        {/* TIPS */}
        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>💡 Tips for better reels</Text>
          <Text style={styles.tipsItem}>• Keep videos under 60s for best engagement</Text>
          <Text style={styles.tipsItem}>• Good lighting makes a huge difference</Text>
          <Text style={styles.tipsItem}>• Add relevant hashtags in caption</Text>
          <Text style={styles.tipsItem}>• Vertical videos (9:16) look best</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0A0A0A'},
  container: {flex: 1, backgroundColor: '#0A0A0A', paddingHorizontal: 16},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 8,
  },

  backButton: {color: '#C9956C', fontSize: 16, fontWeight: 'bold'},
  headerTitle: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},

  videoContainer: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  video: {width: '100%', height: 320},

  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },

  durationLabel: {color: '#A09080', fontSize: 14, fontWeight: '600'},
  durationValue: {color: '#C9956C', fontSize: 14, fontWeight: 'bold'},
  durationError: {color: '#F87171'},

  changeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  changeBtnText: {color: '#C9956C', fontSize: 14, fontWeight: '600'},

  picker: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    paddingVertical: 60,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
  },
  pickerIcon: {fontSize: 60, marginBottom: 16},
  pickerText: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 8},
  pickerSub: {color: '#A09080', fontSize: 12},

  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#F87171',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {color: '#F87171', fontSize: 13},

  label: {
    color: '#C9956C',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: '#1C1C1C',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
  },

  charCount: {
    color: '#A09080',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
    marginBottom: 20,
  },

  uploadButton: {
    backgroundColor: '#C9956C',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButtonDisabled: {opacity: 0.45},
  uploadButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},

  loadingRow: {flexDirection: 'row', alignItems: 'center'},

  tipsBox: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tipsTitle: {
    color: '#C9956C',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tipsItem: {
    color: '#A09080',
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 20,
  },
});