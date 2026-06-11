import BootSplash from 'react-native-bootsplash';
import React, {useState, useEffect} from 'react';
import crashlytics from '@react-native-firebase/crashlytics';
import ImageViewerScreen from './screens/ImageViewerScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Text, View, ActivityIndicator, StatusBar, Alert} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNavigationContainerRef} from '@react-navigation/native';
import {setNavigator, registerBackgroundHandler} from './src/services/NotificationService';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {initNotifications} from './src/services/NotificationService';
import OnboardingScreen from './screens/OnboardingScreen';
import SuggestedFollowsScreen from './screens/SuggestedFollowsScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import MovieDetails from './screens/MovieDetails';
import PostAuditionScreen from './screens/PostAuditionScreen';
import AuditionDetailScreen from './screens/AuditionDetailScreen';
import MyApplicationsScreen from './screens/MyApplicationsScreen';
import DirectorDashboardScreen from './screens/DirectorDashboardScreen';
import BrowseAuditionsScreen from './screens/BrowseAuditionsScreen';
import UploadFilmScreen from './screens/UploadFilmScreen';
import FilmDetailScreen from './screens/FilmDetailScreen';
import MyFilmsScreen from './screens/MyFilmsScreen';
import CrewMarketplaceScreen from './screens/CrewMarketplaceScreen';
import CrewScreen from './screens/CrewScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ContestScreen from './screens/ContestScreen';
import PostContestScreen from './screens/PostContestScreen';
import ContestDetailScreen from './screens/ContestDetailScreen';
import MyContestsScreen from './screens/MyContestsScreen';
import PublicProfileScreen from './screens/PublicProfileScreen';
import PaymentScreen from './screens/PaymentScreen';
import SavedAuditionsScreen from './screens/SavedAuditionsScreen';
import SettingsScreen from './screens/SettingsScreen';
import AIAssistantScreen from './screens/AIAssistantScreen';
import QuickPostScreen from './screens/QuickPostScreen';
import AdminReportsScreen from './screens/AdminReportsScreen';
import CastingRequestScreen from './screens/CastingRequestScreen';
import CreateProjectScreen from './screens/CreateProjectScreen';
import BrowseProjectsScreen from './screens/BrowseProjectsScreen';
import ProjectDetailScreen from './screens/ProjectDetailScreen';
import JoinRequestsScreen from './screens/JoinRequestsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsScreen from './screens/TermsScreen';
import FollowersScreen from './screens/FollowersScreen';

export const navigationRef = createNavigationContainerRef();
registerBackgroundHandler(); // must run before AppRegistry

const COLORS = {
  primary: '#C9956C',
  background: '#0A0A0A',
  surface: '#1C1C1C',
  textPrimary: '#FFFFFF',
  textSecondary: '#A09080',
  border: '#2A2A2A',
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;
    const unsub = firestore()
      .collection('notifications')
      .where('userId', '==', currentUser.uid)
      .where('read', '==', false)
      .onSnapshot(
        snapshot => {
          console.log('Unread notifications:', snapshot.docs.length);
          setUnreadNotifCount(snapshot.docs.length);
        },
        error => {
          console.log('NOTIF BADGE ERROR:', error.message);
        },
      );
    return () => unsub();
  }, []);

  useEffect(() => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;
    const unsub = firestore()
      .collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .onSnapshot(
        snapshot => {
          let total = 0;
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const unread = data.unreadCount?.[currentUser.uid] || 0;
            total += unread;
          });
          console.log('Unread chats:', total);
          setUnreadCount(total);
        },
        error => {
          console.log('CHAT BADGE ERROR:', error.message);
        },
      );
    return () => unsub();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: COLORS.background},
        headerTintColor: COLORS.textPrimary,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 0,
          height: 66,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 8,
          position: 'absolute',
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({color}) => (
            <View style={{width: 28, height: 28, justifyContent: 'center', alignItems: 'center'}}>
              <Text style={{fontSize: 20, color}}>🏠</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Crew"
        component={CrewScreen}
        options={{
          title: 'Crew',
          headerShown: false,
          tabBarIcon: ({color}) => <Text style={{fontSize: 20, color}}>🎥</Text>,
        }}
      />
      <Tab.Screen
        name="Contests"
        component={ContestScreen}
        options={{
          title: 'Contests',
          headerShown: false,
          tabBarIcon: ({color}) => <Text style={{fontSize: 20, color}}>🏆</Text>,
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{
          title: 'Chats',
          headerTitle: 'Messages',
          tabBarIcon: ({color}) => (
            <View style={{width: 28, height: 28, justifyContent: 'center', alignItems: 'center'}}>
              <Text style={{fontSize: 20, color}}>💬</Text>
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -6,
                  backgroundColor: COLORS.primary, borderRadius: 10,
                  minWidth: 18, height: 18,
                  justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
                }}>
                  <Text style={{color: '#fff', fontSize: 10, fontWeight: 'bold'}}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({color}) => <Text style={{fontSize: 20, color}}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: COLORS.background},
        headerTintColor: COLORS.textPrimary,
        headerShadowVisible: false,
        contentStyle: {backgroundColor: COLORS.background},
      }}>
      <Stack.Screen name="Main" component={TabNavigator} options={{headerShown: false}} />
      <Stack.Screen name="SuggestedFollows" component={SuggestedFollowsScreen} options={{headerShown: false}} />
      <Stack.Screen name="CrewMarketplace" component={CrewMarketplaceScreen} options={{title: 'Crew Marketplace'}} />
      <Stack.Screen name="MovieDetails" component={MovieDetails} options={{title: 'Movie Details'}} />
      <Stack.Screen name="PostAudition" component={PostAuditionScreen} options={{title: 'Post Audition'}} />
      <Stack.Screen name="AuditionDetail" component={AuditionDetailScreen} options={{title: 'Audition Details'}} />
      <Stack.Screen name="BrowseAuditions" component={BrowseAuditionsScreen} options={{headerShown: false}} />
      <Stack.Screen name="MyApplications" component={MyApplicationsScreen} options={{title: 'My Applications'}} />
      <Stack.Screen name="DirectorDashboard" component={DirectorDashboardScreen} options={{title: 'Director Dashboard'}} />
      <Stack.Screen name="UploadFilm" component={UploadFilmScreen} options={{title: 'Upload Short Film', headerShown: false}} />
      <Stack.Screen name="FilmDetail" component={FilmDetailScreen} options={{title: 'Film Details'}} />
      <Stack.Screen name="MyFilms" component={MyFilmsScreen} options={{title: 'My Films'}} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} options={{title: 'Chat', headerShown: false}} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{title: 'Notifications'}} />
      <Stack.Screen name="PostContest" component={PostContestScreen} options={{title: 'Create Contest'}} />
      <Stack.Screen name="ContestDetail" component={ContestDetailScreen} options={{title: 'Contest Details'}} />
      <Stack.Screen name="MyContests" component={MyContestsScreen} options={{title: 'My Contests'}} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{title: 'Public Profile'}} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{title: 'Payment'}} />
      <Stack.Screen name="SavedAuditions" component={SavedAuditionsScreen} options={{title: 'Saved Auditions'}} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{title: 'Settings'}} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{title: '🤖 AI Assistant'}} />
      <Stack.Screen name="QuickPost" component={QuickPostScreen} options={{title: '⚡ Quick Post'}} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} options={{title: '🛡️ Admin Dashboard'}} />
      <Stack.Screen name="ImageViewer" component={ImageViewerScreen} options={{headerShown: false, animation: 'fade'}} />
      <Stack.Screen name="CastingRequest" component={CastingRequestScreen} options={{title: 'Request to Post Auditions'}} />
      <Stack.Screen name="CreateProject" component={CreateProjectScreen} />
      <Stack.Screen name="BrowseProjects" component={BrowseProjectsScreen} options={{headerShown: false}} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{headerShown: false}} />
      <Stack.Screen name="JoinRequests" component={JoinRequestsScreen} options={{headerShown: false}} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{headerShown: false}} />
      <Stack.Screen name="Terms" component={TermsScreen} options={{headerShown: false}} />
      <Stack.Screen name="Followers" component={FollowersScreen} options={{headerShown: false}} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
    </Stack.Navigator>
  );
}

function App(): JSX.Element {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [showSuggestedFollows, setShowSuggestedFollows] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then(val => {
      setShowOnboarding(val !== 'true');
    });
  }, []);

  useEffect(() => {
    if (!__DEV__) crashlytics().log('CineLink App started');
  }, []);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async userState => {
      setUser(userState);
      if (userState) {
        try {
          const done = await AsyncStorage.getItem('suggested_follows_done');
          setShowSuggestedFollows(done !== 'true');
        } catch (e) {
          setShowSuggestedFollows(false);
        }
      } else {
        setShowSuggestedFollows(false);
      }
      setLoading(false);
    });
    return subscriber;
  }, []);

  useEffect(() => {
    if (user) initNotifications();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const checkBan = async () => {
      try {
        const banDoc = await firestore().collection('bannedUsers').doc(user.uid).get();
        if (banDoc.exists) {
          await auth().signOut();
          Alert.alert('🚫 Account Banned', 'Your account has been banned from CineLink.');
        }
      } catch (e) {console.log(e);}
    };
    checkBan();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const setPresence = async (isOnline: boolean) => {
      try {
        await firestore().collection('users').doc(user.uid)
          .set({isOnline, lastSeen: firestore.FieldValue.serverTimestamp()}, {merge: true});
      } catch (e) {console.log(e);}
    };

    // Mark online once on login
    setPresence(true);

    // Refresh every 10 minutes instead of every 60 seconds
    // 60s = 1,440 writes/day → 10min = 144 writes/day
    const interval = setInterval(() => setPresence(true), 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
      setPresence(false);
    };
  }, [user]);

  useEffect(() => {
    BootSplash.hide({fade: true});
  }, []);

  if (loading || showOnboarding === null) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background}}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      </>
    );
  }

  if (user && showSuggestedFollows) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <SuggestedFollowsScreen
          navigation={{
            replace: async () => {
              await AsyncStorage.setItem('suggested_follows_done', 'true');
              setShowSuggestedFollows(false);
            },
            goBack: () => setShowSuggestedFollows(false),
          }}
          route={{params: {}}}
        />
      </>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={() => setNavigator(navigationRef)}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default App;