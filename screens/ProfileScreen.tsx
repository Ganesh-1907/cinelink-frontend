import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import {launchImageLibrary, launchCamera, ImagePickerResponse} from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useFocusEffect} from '@react-navigation/native';
import ProfileCompletionCard from './ProfileCompletionCard';
import {usePremiumStatus} from '../hooks/usePremiumStatus';
import PremiumBadge from '../src/components/Premium/PremiumBadge';

const ADMIN_EMAIL   = 'anilkumardevarakonda03@gmail.com';
const CLOUD_NAME    = 'dipwobgzb';
const UPLOAD_PRESET = 'cinelink_upload';

const SCREEN_W  = Dimensions.get('window').width;
const GRID_GAP  = 2;
const CELL_SIZE = Math.floor((SCREEN_W - 40 - GRID_GAP * 2) / 3);

interface PhotoAsset {
  uri: string;
  type?: string;
  name?: string;
}

const ROLE_TAGS = ['Lead', 'Supporting', 'Character', 'Theatre', 'Film', 'OTT', 'Web Series', 'Ad Film'];

const availColor = (status: string) => {
  if (status === 'Available Now') return {bg: 'rgba(74,222,128,0.15)', border: '#4ADE80', text: '#4ADE80'};
  if (status === 'Booked')        return {bg: 'rgba(251,191,36,0.15)',  border: '#FBBF24', text: '#FBBF24'};
  return                                 {bg: 'rgba(160,144,128,0.15)', border: '#A09080', text: '#A09080'};
};

export default function ProfileScreen({navigation}: any) {
  const [name, setName]                     = useState<string>('');
  const [phone, setPhone]                   = useState<string>('');
  const [bio, setBio]                       = useState<string>('');
  const [role, setRole]                     = useState<string>('Actor');
  const [photo, setPhoto]                   = useState<PhotoAsset | null>(null);
  const [photoUrl, setPhotoUrl]             = useState<string>('');
  const [introVideoLink, setIntroVideoLink] = useState<string>('');
  const [portfolio1, setPortfolio1]         = useState<string>('');
  const [portfolio2, setPortfolio2]         = useState<string>('');
  const [portfolio3, setPortfolio3]         = useState<string>('');
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos]           = useState<PhotoAsset[]>([]);
  const [loading, setLoading]               = useState<boolean>(false);
  const [uploading, setUploading]           = useState<boolean>(false);
  const [saved, setSaved]                   = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [location, setLocation]             = useState<string>('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Gallery
  const [portfolioMedia, setPortfolioMedia]   = useState<string[]>([]);
  const [mediaUploading, setMediaUploading]   = useState(false);
  const [galleryVisible, setGalleryVisible]   = useState(false);
  const [galleryIndex, setGalleryIndex]       = useState(0);

  // Portfolio v2
  const [availabilityStatus, setAvailabilityStatus] = useState<string>('');
  const [lookingFor, setLookingFor]                 = useState<string>('');
  const [profileTags, setProfileTags]               = useState<string[]>([]);
  const [instagramLink, setInstagramLink]           = useState<string>('');
  const [youtubeLink, setYoutubeLink]               = useState<string>('');
  const [ageRange, setAgeRange]                     = useState<string>('');
  const [height, setHeight]                         = useState<string>('');
  const [bodyType, setBodyType]                     = useState<string>('');

  const scrollRef = useRef<ScrollView>(null);
  const user = auth().currentUser;
  const {tier: premiumTier, isVerified: premiumVerifiedReal} = usePremiumStatus();
  const toggleTag = (tag: string) =>
    setProfileTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => loadProfile(), 300);
      return () => clearTimeout(timer);
    }, []),
  );

  // ── Real-time followers/following counts ──
  useEffect(() => {
    if (!user?.uid) return;
    const unsubF = firestore()
      .collection('users').doc(user.uid).collection('followers')
      .onSnapshot(snap => setFollowersCount(snap.size), e => console.log(e));
    const unsubFi = firestore()
      .collection('users').doc(user.uid).collection('following')
      .onSnapshot(snap => setFollowingCount(snap.size), e => console.log(e));
    return () => { unsubF(); unsubFi(); };
  }, [user?.uid]);

  const loadProfile = async () => {
    try {
      if (!user?.uid) return;
      const doc = await firestore().collection('users').doc(user.uid).get();
      if (doc.exists) {
        const data = doc.data();
        setName(data?.fullName || data?.displayName || data?.name || '');
        setPhone(data?.phone || '');
        setBio(data?.bio || '');
        setRole(data?.role || 'Actor');
        setPhotoUrl(data?.photoUrl || data?.photoURL || '');
        setIntroVideoLink(data?.introVideoLink || '');
        setPortfolio1(data?.portfolio1 || '');
        setPortfolio2(data?.portfolio2 || '');
        setPortfolio3(data?.portfolio3 || '');
        setPortfolioPhotos(data?.portfolioPhotos || []);
        setVerificationStatus(data?.verificationStatus || '');
        setLocation(data?.location || '');
        setAvailabilityStatus(data?.availabilityStatus || '');
        setLookingFor(data?.lookingFor || '');
        setProfileTags(data?.profileTags || []);
        setInstagramLink(data?.instagramLink || '');
        setYoutubeLink(data?.youtubeLink || '');
        setAgeRange(data?.ageRange || '');
        setHeight(data?.height || '');
        setBodyType(data?.bodyType || '');
        setPortfolioMedia(data?.portfolioMedia || []);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  };

  const pickProfilePhoto = () => {
    Alert.alert('Choose Photo', 'Select source', [
      {
        text: '📷 Camera',
        onPress: () =>
          launchCamera(
            {mediaType: 'photo', quality: 0.8, saveToPhotos: false},
            (response: ImagePickerResponse) => {
              if (response.assets?.[0]) {
                const asset = response.assets[0];
                setPhoto({uri: asset.uri || '', type: asset.type, name: asset.fileName});
              }
            },
          ),
      },
      {
        text: '🖼 Gallery',
        onPress: () =>
          launchImageLibrary(
            {mediaType: 'photo', quality: 0.8},
            (response: ImagePickerResponse) => {
              if (response.assets?.[0]) {
                const asset = response.assets[0];
                setPhoto({uri: asset.uri || '', type: asset.type, name: asset.fileName});
              }
            },
          ),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const pickPortfolioPhoto = () => {
    const totalPhotos = portfolioPhotos.length + newPhotos.length;
    if (totalPhotos >= 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 photos!');
      return;
    }
    Alert.alert('Add Photo', 'Select source', [
      {
        text: '📷 Camera',
        onPress: () =>
          launchCamera(
            {mediaType: 'photo', quality: 0.8, saveToPhotos: false},
            (response: ImagePickerResponse) => {
              if (response.assets?.[0]) {
                const asset = response.assets[0];
                setNewPhotos(prev => [
                  ...prev,
                  {uri: asset.uri || '', type: asset.type, name: asset.fileName},
                ]);
              }
            },
          ),
      },
      {
        text: '🖼 Gallery',
        onPress: () =>
          launchImageLibrary(
            {mediaType: 'photo', quality: 0.8},
            (response: ImagePickerResponse) => {
              if (response.assets?.[0]) {
                const asset = response.assets[0];
                setNewPhotos(prev => [
                  ...prev,
                  {uri: asset.uri || '', type: asset.type, name: asset.fileName},
                ]);
              }
            },
          ),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos(newPhotos.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setPortfolioPhotos(portfolioPhotos.filter((_, i) => i !== index));
  };

  const uploadToCloudinary = async (imageUri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', {uri: imageUri, type: 'image/jpeg', name: 'photo.jpg'} as any);
    formData.append('upload_preset', UPLOAD_PRESET);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {method: 'POST', body: formData},
    );
    const data = await response.json();
    return data.secure_url;
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter your full name!');
      return;
    }
    setLoading(true);
    try {
      let finalPhotoUrl = photoUrl;
      if (photo) {
        setUploading(true);
        finalPhotoUrl = await uploadToCloudinary(photo.uri);
        setUploading(false);
      }

      let uploadedPhotos: string[] = [];
      if (newPhotos.length > 0) {
        setUploading(true);
        uploadedPhotos = await Promise.all(
          newPhotos.map(p => uploadToCloudinary(p.uri)),
        );
        setUploading(false);
      }

      const allPortfolioPhotos = [...portfolioPhotos, ...uploadedPhotos];
      const trimmedName = name.trim();

      await user?.updateProfile({
        displayName: trimmedName,
        photoURL: finalPhotoUrl || user?.photoURL || '',
      });

      const profileData = {
        name: trimmedName,
        fullName: trimmedName,
        displayName: trimmedName,
        phone,
        bio,
        role,
        location,
        photoUrl: finalPhotoUrl,
        photoURL: finalPhotoUrl,
        introVideoLink,
        portfolio1,
        portfolio2,
        portfolio3,
        portfolioPhotos: allPortfolioPhotos,
        email: user?.email,
        verificationStatus,
        availabilityStatus,
        lookingFor,
        profileTags,
        instagramLink,
        youtubeLink,
        ageRange,
        height,
        bodyType,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('users').doc(user?.uid).set(profileData, {merge: true});

      setName(trimmedName);
      setPhotoUrl(finalPhotoUrl);
      setPortfolioPhotos(allPortfolioPhotos);
      setNewPhotos([]);
      setPhoto(null);
      setSaved(true);

      Alert.alert('✅ Success', 'Profile saved successfully!');
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Error saving profile:', e);
      Alert.alert('Error', 'Failed to save profile!');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const applyForVerification = async () => {
    if (verificationStatus === 'verified') {
      Alert.alert('✅ Already Verified!', 'Your profile is already verified.');
      return;
    }
    if (verificationStatus === 'pending') {
      Alert.alert('⏳ Already Applied!', 'Your verification is under review.');
      return;
    }
    if (!name || !bio || !phone) {
      Alert.alert('Incomplete Profile', 'Please fill your name, phone and bio first!');
      return;
    }
    try {
      await firestore().collection('users').doc(user?.uid).update({verificationStatus: 'pending'});
      await firestore().collection('verificationRequests').add({
        userId: user?.uid,
        userEmail: user?.email,
        name, role, bio,
        requestedAt: firestore.FieldValue.serverTimestamp(),
      });
      setVerificationStatus('pending');
      Alert.alert('Applied! 🎉', 'Your verification request has been submitted!');
    } catch (e) {
      console.error(e);
    }
  };

  // ── Gallery helpers ──────────────────────────────────────
  const saveMediaToFirestore = async (media: string[]) => {
    if (!user?.uid) return;
    await firestore().collection('users').doc(user.uid).set({portfolioMedia: media}, {merge: true});
  };

  const pickPortfolioMedia = () => {
    if (portfolioMedia.length >= 20) {
      Alert.alert('Limit Reached', 'Portfolio gallery is limited to 20 images.');
      return;
    }
    launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 1}, async response => {
      if (!response.assets?.[0]?.uri) return;
      setMediaUploading(true);
      try {
        const url = await uploadToCloudinary(response.assets[0].uri);
        const updated = [...portfolioMedia, url];
        setPortfolioMedia(updated);
        await saveMediaToFirestore(updated);
      } catch {
        Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
      } finally {
        setMediaUploading(false);
      }
    });
  };

  const removeMediaItem = (index: number) => {
    Alert.alert('Remove Photo', 'Remove this photo from your gallery?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updated = portfolioMedia.filter((_, i) => i !== index);
          setPortfolioMedia(updated);
          await saveMediaToFirestore(updated);
        },
      },
    ]);
  };

  const handleShare = async () => {
    const shareName = name || user?.email?.split('@')[0] || 'my profile';
    try {
      await Share.share({
        message:
          `Check out ${shareName} on CineLink!\n\n` +
          `They're a ${role} on CineLink — India's casting & film collaboration platform.\n\n` +
          `Download CineLink to view their full profile and connect! 🎬`,
      });
    } catch (_) {}
  };

  const scrollToForm = () => {
    scrollRef.current?.scrollTo({y: 420, animated: true});
  };

  const totalPhotos = portfolioPhotos.length + newPhotos.length;
  const displayName = name || user?.email?.split('@')[0] || 'Me';

  return (
    <>
    <ScrollView ref={scrollRef} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* ── AVATAR ── */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickProfilePhoto}>
          {photo || photoUrl ? (
            <Image
              source={{uri: photo ? photo.uri : photoUrl}}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {name ? name[0].toUpperCase() : user?.email?.charAt(0)?.toUpperCase() || 'C'}
              </Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>Edit</Text>
          </View>
        </TouchableOpacity>

        {verificationStatus === 'verified' && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>✅ Verified</Text>
          </View>
        )}

        {uploading && (
          <View style={styles.uploadingRow}>
            <ActivityIndicator size="small" color="#C9956C" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}

        {name ? (
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{name}</Text>
            <PremiumBadge tier={premiumTier} verifiedReal={premiumVerifiedReal} size="large" />
          </View>
        ) : null}
        <Text style={styles.email}>{user?.email || user?.phoneNumber}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>↗ Share Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ── FOLLOWERS / FOLLOWING STATS ── */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => navigation.navigate('Followers', {
            userId: user?.uid,
            displayName,
            tab: 'followers',
          })}>
          <Text style={styles.statNum}>{followersCount}</Text>
          <Text style={styles.statLbl}>Followers</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => navigation.navigate('Followers', {
            userId: user?.uid,
            displayName,
            tab: 'following',
          })}>
          <Text style={styles.statNum}>{followingCount}</Text>
          <Text style={styles.statLbl}>Following</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ PROFILE COMPLETION CARD */}
      <ProfileCompletionCard
        name={name}
        phone={phone}
        bio={bio}
        photoUrl={photoUrl}
        role={role}
        portfolioPhotos={portfolioPhotos}
        introVideoLink={introVideoLink}
        portfolio1={portfolio1}
        onItemPress={scrollToForm}
      />

      {/* ── FORM ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Info</Text>

        <Text style={styles.label}>I am a:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleRow} contentContainerStyle={{gap: 8, paddingRight: 8}}>
          {['Actor', 'Director', 'Writer', 'Editor', 'DOP', 'Producer', 'Creator'].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}>
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Mumbai, Delhi, Hyderabad"
          placeholderTextColor="#A09080"
          value={location}
          onChangeText={setLocation}
        />

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          placeholderTextColor="#A09080"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Your phone number"
          placeholderTextColor="#A09080"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Tell us about yourself..."
          placeholderTextColor="#A09080"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.sectionTitle}>Portfolio Photos</Text>
        <Text style={styles.hint}>Add up to 5 photos ({totalPhotos}/5)</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
          {portfolioPhotos.map((url, index) => (
            <View key={index} style={styles.photoBox}>
              <Image source={{uri: url}} style={styles.portfolioPhoto} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeExistingPhoto(index)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {newPhotos.map((p, index) => (
            <View key={`new-${index}`} style={styles.photoBox}>
              <Image source={{uri: p.uri}} style={styles.portfolioPhoto} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeNewPhoto(index)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {totalPhotos < 5 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPortfolioPhoto}>
              <Text style={styles.addPhotoBtnIcon}>+</Text>
              <Text style={styles.addPhotoBtnText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ── PORTFOLIO GALLERY ── */}
        <Text style={styles.sectionTitle}>Portfolio Gallery</Text>
        <Text style={styles.hint}>
          {portfolioMedia.length}/20 · Tap to view · Long-press to remove
        </Text>
        <View style={styles.mediaGrid}>
          {portfolioMedia.map((url, i) => (
            <TouchableOpacity
              key={i}
              style={styles.mediaCell}
              onPress={() => { setGalleryIndex(i); setGalleryVisible(true); }}
              onLongPress={() => removeMediaItem(i)}
              activeOpacity={0.85}>
              <Image source={{uri: url}} style={styles.mediaCellImg} resizeMode="cover" />
            </TouchableOpacity>
          ))}
          {portfolioMedia.length < 20 && (
            <TouchableOpacity
              style={[styles.mediaCell, styles.mediaCellAdd]}
              onPress={pickPortfolioMedia}
              disabled={mediaUploading}
              activeOpacity={0.7}>
              {mediaUploading
                ? <ActivityIndicator color="#C9956C" size="small" />
                : <>
                    <Text style={styles.mediaCellPlus}>+</Text>
                    <Text style={styles.mediaCellAddText}>Add</Text>
                  </>}
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Intro Video</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste intro video link"
          placeholderTextColor="#A09080"
          value={introVideoLink}
          onChangeText={setIntroVideoLink}
        />

        <Text style={styles.sectionTitle}>Portfolio / Previous Works</Text>
        <TextInput
          style={styles.input}
          placeholder="Work 1 link"
          placeholderTextColor="#A09080"
          value={portfolio1}
          onChangeText={setPortfolio1}
        />
        <TextInput
          style={styles.input}
          placeholder="Work 2 link"
          placeholderTextColor="#A09080"
          value={portfolio2}
          onChangeText={setPortfolio2}
        />
        <TextInput
          style={styles.input}
          placeholder="Work 3 link"
          placeholderTextColor="#A09080"
          value={portfolio3}
          onChangeText={setPortfolio3}
        />

        {/* ── CASTING PROFILE ── */}
        <Text style={styles.sectionTitle}>Casting Profile</Text>

        <Text style={styles.label}>Availability</Text>
        <View style={styles.chipRow}>
          {(['Available Now', 'Booked', 'Not Looking'] as const).map(status => {
            const c = availColor(status);
            const isActive = availabilityStatus === status;
            return (
              <TouchableOpacity
                key={status}
                style={[styles.availChip, isActive && {backgroundColor: c.bg, borderColor: c.border}]}
                onPress={() => setAvailabilityStatus(prev => prev === status ? '' : status)}>
                <Text style={[styles.availChipText, isActive && {color: c.text}]}>
                  {status === 'Available Now' ? '🟢' : status === 'Booked' ? '🟡' : '🔴'}{' '}{status}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Looking For</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Lead roles in short films, OTT projects"
          placeholderTextColor="#A09080"
          value={lookingFor}
          onChangeText={setLookingFor}
        />

        <Text style={styles.label}>Profile Type Tags</Text>
        <View style={styles.tagGrid}>
          {ROLE_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagChip, profileTags.includes(tag) && styles.tagChipActive]}
              onPress={() => toggleTag(tag)}>
              <Text style={[styles.tagChipText, profileTags.includes(tag) && styles.tagChipTextActive]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Instagram Profile URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://instagram.com/yourhandle"
          placeholderTextColor="#A09080"
          value={instagramLink}
          onChangeText={setInstagramLink}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>YouTube Channel URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://youtube.com/@yourchannel"
          placeholderTextColor="#A09080"
          value={youtubeLink}
          onChangeText={setYoutubeLink}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>Age Range</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 22–28"
          placeholderTextColor="#A09080"
          value={ageRange}
          onChangeText={setAgeRange}
        />

        <Text style={styles.label}>Height</Text>
        <TextInput
          style={styles.input}
          placeholder={'e.g. 5\'10" / 178 cm'}
          placeholderTextColor="#A09080"
          value={height}
          onChangeText={setHeight}
        />

        <Text style={styles.label}>Body Type</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Athletic, Slim, Average"
          placeholderTextColor="#A09080"
          value={bodyType}
          onChangeText={setBodyType}
        />

        <TouchableOpacity
          style={[
            styles.verifyBtn,
            verificationStatus === 'verified' && styles.verifyBtnDone,
            verificationStatus === 'pending' && styles.verifyBtnPending,
          ]}
          onPress={applyForVerification}>
          <Text style={styles.verifyBtnText}>
            {verificationStatus === 'pending'
              ? '⏳ Verification Pending'
              : verificationStatus === 'verified'
              ? '✅ Verified'
              : '🔰 Apply for Verification'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>
              {saved ? '✅ Profile Saved!' : 'Save Profile'}
            </Text>
          )}
        </TouchableOpacity>

        {/* ── MENU ── */}
        <View style={styles.menuSection}>
          {[
            {icon: '🎬', label: 'My Applications', screen: 'MyApplications'},
            {icon: '📊', label: 'Dashboard', screen: 'DirectorDashboard'},
            {icon: '🎥', label: 'My Films', screen: 'MyFilms'},
            {icon: '🏆', label: 'My Contests', screen: 'MyContests'},
            {icon: '💾', label: 'Saved Auditions', screen: 'SavedAuditions'},
            {icon: '🎓', label: 'Industry Guide', screen: 'IndustryGuide'},
            {icon: '⚙️', label: 'Settings', screen: 'Settings'},
          ].map(item => (
            <TouchableOpacity
              key={item.screen}
              style={styles.menuCard}
              onPress={() => navigation.navigate(item.screen as any)}>
              <Text style={styles.menuEmoji}>{item.icon}</Text>
              <Text style={styles.menuText}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}

          {user?.email === ADMIN_EMAIL && (
            <TouchableOpacity
              style={styles.adminCard}
              onPress={() => navigation.navigate('AdminReports')}>
              <Text style={styles.menuEmoji}>🛡️</Text>
              <Text style={styles.adminCardText}>Admin Dashboard</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.logoutCard}
            onPress={() => {
              Alert.alert('Logout', 'Are you sure you want to logout?', [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Logout',
                  style: 'destructive',
                  onPress: async () => await auth().signOut(),
                },
              ]);
            }}>
            <Text style={styles.logoutText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
    <ImageViewing
      images={portfolioMedia.map(url => ({uri: url}))}
      imageIndex={galleryIndex}
      visible={galleryVisible}
      onRequestClose={() => setGalleryVisible(false)}
      swipeToCloseEnabled
      doubleTapToZoomEnabled
      backgroundColor="black"
    />
  </>
  );
}

const styles = StyleSheet.create({
  container:    {flex: 1, backgroundColor: '#0A0A0A'},
  avatarSection:{alignItems: 'center', paddingTop: 30, paddingBottom: 16},
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#C9956C', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, borderWidth: 3, borderColor: '#FF8C5A',
  },
  avatarImage: {
    width: 100, height: 100, borderRadius: 50,
    marginBottom: 12, borderWidth: 3, borderColor: '#C9956C',
  },
  avatarText:   {color: '#FFFFFF', fontSize: 40, fontWeight: 'bold'},
  editBadge: {
    position: 'absolute', bottom: 12, right: 0,
    backgroundColor: '#C9956C', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  editBadgeText:    {color: '#FFFFFF', fontSize: 10, fontWeight: 'bold'},
  verifiedBadge: {
    backgroundColor: '#064E3B', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    marginTop: 8, borderWidth: 1, borderColor: '#6EE7B7',
  },
  verifiedBadgeText: {color: '#6EE7B7', fontSize: 13, fontWeight: 'bold'},
  uploadingRow:  {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8},
  uploadingText: {color: '#C9956C', fontSize: 12},
  nameRow:       {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4},
  profileName:   {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
  email:         {color: '#A09080', fontSize: 13, marginTop: 2},

  // ── Followers / Following ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
  },
  statItem:   {alignItems: 'center', flex: 1},
  statDivider:{width: 1, height: 36, backgroundColor: '#2A2A2A'},
  statNum:    {color: '#FFFFFF', fontSize: 26, fontWeight: 'bold'},
  statLbl:    {color: '#A09080', fontSize: 12, marginTop: 3},

  section:      {paddingHorizontal: 20, paddingBottom: 40},
  sectionTitle: {color: '#C9956C', fontSize: 16, fontWeight: 'bold', marginTop: 24, marginBottom: 8},
  hint:         {color: '#A09080', fontSize: 12, marginBottom: 12},
  label:        {color: '#A09080', fontSize: 13, marginBottom: 8, marginTop: 12},
  roleRow:      {flexDirection: 'row', gap: 8, marginBottom: 8},
  roleBtn: {
    backgroundColor: '#2A2A2A', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 18,
    alignItems: 'center', borderWidth: 1, borderColor: '#333333',
  },
  roleBtnActive:     {backgroundColor: '#C9956C', borderColor: '#C9956C'},
  roleBtnText:       {color: '#A09080', fontSize: 13, fontWeight: '500'},
  roleBtnTextActive: {color: '#FFFFFF', fontWeight: 'bold'},
  input: {
    backgroundColor: '#1C1C1C', borderRadius: 12, padding: 14,
    color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2A2A2A', marginBottom: 12,
  },
  bioInput:      {height: 100, textAlignVertical: 'top'},
  photoRow:      {flexDirection: 'row', marginBottom: 8},
  photoBox:      {marginRight: 10, position: 'relative'},
  portfolioPhoto:{width: 100, height: 100, borderRadius: 12},
  removeBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#EF4444', borderRadius: 12,
    width: 22, height: 22, justifyContent: 'center', alignItems: 'center',
  },
  removeBtnText: {color: '#FFFFFF', fontSize: 12, fontWeight: 'bold'},
  addPhotoBtn: {
    width: 100, height: 100, borderRadius: 12,
    backgroundColor: '#1C1C1C', borderWidth: 1,
    borderColor: '#333333', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  addPhotoBtnIcon: {color: '#C9956C', fontSize: 28, fontWeight: 'bold'},
  addPhotoBtnText: {color: '#A09080', fontSize: 11, marginTop: 4},
  verifyBtn: {
    backgroundColor: '#2A2A2A', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: '#C9956C',
  },
  verifyBtnDone:    {backgroundColor: '#064E3B', borderColor: '#6EE7B7'},
  verifyBtnPending: {backgroundColor: '#451A03', borderColor: '#FCD34D'},
  verifyBtnText:    {color: '#C9956C', fontSize: 15, fontWeight: 'bold'},
  saveBtn: {
    backgroundColor: '#C9956C', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 16,
  },
  saveBtnText:  {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
  menuSection:  {marginTop: 30, marginBottom: 60},
  menuCard: {
    backgroundColor: '#1C1C1C', borderRadius: 16, padding: 18, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A',
  },
  menuEmoji:  {fontSize: 22, marginRight: 14},
  menuText:   {color: '#FFFFFF', fontSize: 16, fontWeight: '600', flex: 1},
  menuArrow:  {color: '#C9956C', fontSize: 22, fontWeight: 'bold'},
  logoutCard: {
    backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#DC2626',
  },
  logoutText:    {color: '#FCA5A5', fontSize: 16, fontWeight: 'bold'},
  adminCard: {
    backgroundColor: 'rgba(201,149,108,0.12)', borderRadius: 16, padding: 18,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#C9956C',
  },
  adminCardText: {color: '#C9956C', fontSize: 16, fontWeight: 'bold', flex: 1},

  shareBtn: {
    marginTop: 10, paddingVertical: 8, paddingHorizontal: 22,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(201,149,108,0.4)',
  },
  shareBtnText: {color: '#C9956C', fontSize: 13, fontWeight: '600'},

  // ── Portfolio Gallery ─────────────────────────────────────
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginTop: 10,
    marginBottom: 16,
  },
  mediaCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  mediaCellImg: {
    width: '100%',
    height: '100%',
  },
  mediaCellAdd: {
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  mediaCellPlus:   {color: '#C9956C', fontSize: 28, fontWeight: 'bold', lineHeight: 32},
  mediaCellAddText:{color: '#A09080', fontSize: 11, marginTop: 2},

  // ── Casting Profile ──────────────────────────────────────
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16},
  availChip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: '#1C1C1C', borderWidth: 1, borderColor: '#2A2A2A',
  },
  availChipText: {color: '#A09080', fontSize: 13, fontWeight: '600'},

  tagGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16},
  tagChip: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: '#1C1C1C', borderWidth: 1, borderColor: '#2A2A2A',
  },
  tagChipActive:     {backgroundColor: 'rgba(201,149,108,0.15)', borderColor: '#C9956C'},
  tagChipText:       {color: '#A09080', fontSize: 13},
  tagChipTextActive: {color: '#C9956C', fontWeight: '600'},
});