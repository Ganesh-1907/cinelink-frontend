import React, {useState, useEffect, useRef, useCallback} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Image, Alert, Share, Dimensions, SafeAreaView} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import { getStoredUser } from "../src/services/storageService";
import {useFocusEffect} from '@react-navigation/native';
import PremiumBadge from '../src/components/Premium/PremiumBadge';
import {uploadImage} from '../src/services/uploadService';
import {getProfile, updateProfile} from '../src/services/dataService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 2;

interface PhotoAsset {uri: string; type?: string; name?: string;}

const ROLE_TAGS = ['Lead','Supporting','Character','Theatre','Film','OTT','Web Series','Ad Film'];

export default function ProfileScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState('Actor');
  const [photo, setPhoto] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [introVideoLink, setIntroVideoLink] = useState('');
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [location, setLocation] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const [instagramLink, setInstagramLink] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [height, setHeight] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [isApprovedDirector, setIsApprovedDirector] = useState(false);
  const [user, setUser] = useState<any>(null);
  useEffect(() => { getStoredUser().then(u => setUser(u)); }, []);
  const toggleTag = (tag: string) => setProfileTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  useFocusEffect(useCallback(() => {const t = setTimeout(loadProfile, 300); return () => clearTimeout(t);}, []));

  const loadProfile = async () => {
    try {
      const res = await getProfile();
      const d = res.user;
      setName(d?.fullName || d?.displayName || d?.name || '');
      setPhone(d?.phone || '');
      setBio(d?.bio || '');
      setRole(d?.role || 'Actor');
      setPhotoUrl(d?.photoUrl || d?.photoURL || '');
      setIntroVideoLink(d?.introVideoLink || '');
      setPortfolioPhotos(d?.portfolioPhotos || []);
      setVerificationStatus(d?.verificationStatus || '');
      setLocation(d?.location || '');
      setAvailabilityStatus(d?.availabilityStatus || '');
      setLookingFor(d?.lookingFor || '');
      setProfileTags(d?.profileTags || []);
      setInstagramLink(d?.instagramLink || '');
      setYoutubeLink(d?.youtubeLink || '');
      setAgeRange(d?.ageRange || '');
      setHeight(d?.height || '');
      setBodyType(d?.bodyType || '');
      setIsApprovedDirector(d?.isApprovedDirector === true);
    } catch (e) {console.error('Error loading profile:', e);}
  };

  const uploadToCloudinary = async (imageUri: string): Promise<string> => {
    const result = await uploadImage(imageUri);
    return result.secureUrl;
  };

  const saveProfile = async () => {
    if (!name.trim()) {Alert.alert('Missing Name','Please enter your full name!'); return;}
    setLoading(true);
    try {
      let finalPhotoUrl = photoUrl;
      if (photo) {setUploading(true); finalPhotoUrl = await uploadToCloudinary(photo.uri); setUploading(false);}
      await updateProfile({
        fullName: name.trim(), bio: bio.trim(), role, location: location.trim(),
        photoUrl: finalPhotoUrl, introVideoLink: introVideoLink.trim(),
        portfolioPhotos, availabilityStatus, lookingFor, profileTags,
        instagramLink: instagramLink.trim(), youtubeLink: youtubeLink.trim(),
        ageRange, height, bodyType,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {Alert.alert('Error', e.message);}
    finally {setLoading(false); setUploading(false);}
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: insets.bottom + 100}}>
        <Text style={{fontSize:26, fontWeight:'bold', color:'#FFF', marginBottom:20}}>👤 Edit Profile</Text>
        <Text style={{color:'#A09080', fontSize:13, marginBottom:20}}>Complete your profile to get discovered by directors and casting agents.</Text>

        <TouchableOpacity onPress={async () => {
          const result = await launchImageLibrary({mediaType:'photo', quality: 0.8});
          if (result.assets?.[0]) {setPhoto(result.assets[0]); setPhotoUrl('');}
        }} style={{alignItems:'center', marginBottom: 24}}>
          <View style={{width:100,height:100,borderRadius:50,backgroundColor:'#1C1C1C',justifyContent:'center',alignItems:'center',overflow:'hidden',borderWidth:2,borderColor:'#C9956C'}}>
            {photo ? <Image source={{uri: photo.uri}} style={{width:100,height:100,borderRadius:50}} /> :
             photoUrl ? <Image source={{uri: photoUrl}} style={{width:100,height:100,borderRadius:50}} /> :
             <Text style={{fontSize:36}}>📸</Text>}
          </View>
          <Text style={{color:'#C9956C', fontSize:13, marginTop:8}}>Tap to change photo</Text>
        </TouchableOpacity>

        <TextInput placeholder="Full Name" value={name} onChangeText={setName}
          style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}} />

        <View style={{flexDirection:'row',gap:8,marginBottom:16,flexWrap:'wrap'}}>
          {['Actor','Director','Writer','Editor','DOP','Producer','Crew','Creator'].map(r => (
            <TouchableOpacity key={r} onPress={() => setRole(r)}
              style={{paddingVertical:8,paddingHorizontal:16,borderRadius:20,borderWidth:1,borderColor:role===r?'#C9956C':'#2A2A2A',backgroundColor:role===r?'rgba(201,149,108,0.15)':'#1C1C1C'}}>
              <Text style={{color:role===r?'#C9956C':'#A09080',fontSize:13,fontWeight:'600'}}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput placeholder="Bio / About you" value={bio} onChangeText={setBio} multiline
          style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,minHeight:80,borderWidth:1,borderColor:'#2A2A2A'}} />

        <TextInput placeholder="Location (e.g., Mumbai)" value={location} onChangeText={setLocation}
          style={{backgroundColor:'#141414',color:'#FFF',borderRadius:12,padding:16,marginBottom:12,borderWidth:1,borderColor:'#2A2A2A'}} />

        <TouchableOpacity onPress={saveProfile}
          style={{backgroundColor:'#C9956C',paddingVertical:16,borderRadius:12,alignItems:'center',marginBottom:16}}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF',fontSize:16,fontWeight:'bold'}}>{saved ? '✅ Saved!' : 'Save Profile'}</Text>}
        </TouchableOpacity>

        <View style={{gap:8}}>
          {[
            {icon:'🎬',label:'My Applications',screen:'MyApplications'},
            ...(isApprovedDirector ? [{icon:'📊',label:'Dashboard',screen:'DirectorDashboard'}] : []),
            {icon:'🎥',label:'My Films',screen:'MyFilms'},
            {icon:'🏆',label:'My Contests',screen:'MyContests'},
            {icon:'💾',label:'Saved Auditions',screen:'SavedAuditions'},
            {icon:'🎓',label:'Industry Guide',screen:'IndustryGuide'},
            {icon:'⚙️',label:'Settings',screen:'Settings'},
          ].map(item => (
            <TouchableOpacity key={item.screen} onPress={() => navigation.navigate(item.screen as any)}
              style={{backgroundColor:'#1C1C1C',padding:16,borderRadius:12,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:'#2A2A2A'}}>
              <Text style={{fontSize:20}}>{item.icon}</Text>
              <Text style={{color:'#FFF',fontSize:15,fontWeight:'600'}}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
