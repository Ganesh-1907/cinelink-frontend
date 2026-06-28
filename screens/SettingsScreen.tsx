import React, {useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function SettingsScreen({navigation}: any) {
  const user = auth().currentUser;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);

  const toggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    try {
      await firestore().collection('users').doc(user?.uid)
        .update({notificationsEnabled: val});
    } catch(e) {}
  };

  const toggleEmailNotifications = async (val: boolean) => {
    setEmailNotifications(val);
    try {
      await firestore().collection('users').doc(user?.uid)
        .update({emailNotifications: val});
    } catch(e) {}
  };

  const toggleProfileVisible = async (val: boolean) => {
    setProfileVisible(val);
    try {
      await firestore().collection('users').doc(user?.uid)
        .update({profileVisible: val});
    } catch(e) {}
  };
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = () => {
    Alert.alert(
      '🗑 Delete Account',
      'This will permanently delete:\n\n• Your profile\n• Your posts\n• Your auditions\n• Your applications\n• All your data\n\nThis cannot be undone!',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const uid = user?.uid;
              if (!uid) return;

              // Delete user document
              await firestore().collection('users').doc(uid).delete();

              // Delete user's posts
              const posts = await firestore()
                .collection('feedPosts')
                .where('userId', '==', uid)
                .get();
              for (const doc of posts.docs) await doc.ref.delete();

              // Delete user's auditions
              const auditions = await firestore()
                .collection('auditions')
                .where('directorId', '==', uid)
                .get();
              for (const doc of auditions.docs) await doc.ref.delete();

              // Delete user's applications
              const applications = await firestore()
                .collection('applications')
                .where('applicantId', '==', uid)
                .get();
              for (const doc of applications.docs) await doc.ref.delete();

              // Delete saved auditions
              const saved = await firestore()
                .collection('savedAuditions')
                .where('userId', '==', uid)
                .get();
              for (const doc of saved.docs) await doc.ref.delete();

              // Delete notifications
              const notifications = await firestore()
                .collection('notifications')
                .where('userId', '==', uid)
                .get();
              for (const doc of notifications.docs) await doc.ref.delete();

              // Finally delete auth account
              await auth().currentUser?.delete();

              Alert.alert('✅ Done', 'Your account has been deleted.');
            } catch (e: any) {
              console.log('DELETE ERROR:', e);
              if (e?.code === 'auth/requires-recent-login') {
                Alert.alert(
                  'Sign In Required',
                  'For security, please sign out and sign back in before deleting your account.',
                  [
                    {text: 'Sign Out Now', style: 'destructive', onPress: () => auth().signOut()},
                    {text: 'Cancel', style: 'cancel'},
                  ],
                );
              } else {
                Alert.alert('Error', 'Could not delete account. Please try again.');
              }
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const changePassword = () => {
    if (!user?.email) return;
    Alert.alert('Reset Password', `A reset email will be sent to ${user.email}`, [
      {
        text: 'Send',
        onPress: async () => {
          await auth().sendPasswordResetEmail(user.email!);
          Alert.alert('Done!', 'Check your email for reset link.');
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Logout', style: 'destructive', onPress: () => auth().signOut()},
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>

        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>

        <TouchableOpacity style={styles.settingCard} onPress={changePassword}>
          <Text style={styles.settingIcon}>🔑</Text>
          <Text style={styles.settingText}>Change Password</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingCard} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.settingIcon}>👤</Text>
          <Text style={styles.settingText}>Edit Profile</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleIcon}>🔔</Text>
            <Text style={styles.toggleText}>Push Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{false: '#2A2A2A', true: '#C9956C'}}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleIcon}>📧</Text>
            <Text style={styles.toggleText}>Email Notifications</Text>
          </View>
          <Switch
            value={emailNotifications}
            onValueChange={toggleEmailNotifications}
            trackColor={{false: '#2A2A2A', true: '#C9956C'}}
            thumbColor="#fff"
          />
        </View>

        <Text style={styles.sectionTitle}>Privacy</Text>

        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleIcon}>👁</Text>
            <Text style={styles.toggleText}>Profile Visible to Others</Text>
          </View>
          <Switch
            value={profileVisible}
            onValueChange={toggleProfileVisible}
            trackColor={{false: '#2A2A2A', true: '#C9956C'}}
            thumbColor="#fff"
          />
        </View>

        {/* ✅ LEGAL LINKS */}
        <Text style={styles.sectionTitle}>Legal</Text>

        <TouchableOpacity
          style={styles.settingCard}
          onPress={() => navigation.navigate('PrivacyPolicy')}>
          <Text style={styles.settingIcon}>🔒</Text>
          <Text style={styles.settingText}>Privacy Policy</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingCard}
          onPress={() => navigation.navigate('Terms')}>
          <Text style={styles.settingIcon}>📄</Text>
          <Text style={styles.settingText}>Terms & Conditions</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.settingCard}>
          <Text style={styles.settingIcon}>📱</Text>
          <Text style={styles.settingText}>App Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>

        <View style={styles.settingCard}>
          <Text style={styles.settingIcon}>🎬</Text>
          <Text style={styles.settingText}>CineLink</Text>
          <Text style={styles.settingValue}>India's Cinema Network</Text>
        </View>

        <TouchableOpacity style={styles.logoutCard} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>

        {/* ✅ DPDP ACT — DELETE ACCOUNT */}
        <TouchableOpacity
          style={styles.deleteCard}
          onPress={deleteAccount}
          disabled={deleting}>
          {deleting ? (
            <ActivityIndicator color="#FCA5A5" />
          ) : (
            <Text style={styles.deleteText}>🗑 Delete My Account & Data</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.deleteNote}>
          As per India's DPDP Act 2023, you have the right to delete all your personal data from CineLink.
          {'\n'}⚠️ You may need to sign out and sign back in before deleting.
        </Text>

        {/* ✅ COPYRIGHT */}
        <View style={styles.copyrightBox}>
          <Text style={styles.copyrightText}>© 2026 CineLink. All rights reserved.</Text>
          <Text style={styles.copyrightSubText}>India's Cinema Network</Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  section: {padding: 16, paddingBottom: 60},
  sectionTitle: {
    color: '#C9956C', fontSize: 13, fontWeight: 'bold',
    marginTop: 24, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#1C1C1C', borderRadius: 12, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#2A2A2A',
  },
  infoLabel: {color: '#A09080', fontSize: 12, marginBottom: 4},
  infoValue: {color: '#FFFFFF', fontSize: 15, fontWeight: '500'},
  settingCard: {
    backgroundColor: '#1C1C1C', borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#2A2A2A', flexDirection: 'row', alignItems: 'center',
  },
  settingIcon: {fontSize: 20, marginRight: 12},
  settingText: {color: '#FFFFFF', fontSize: 15, flex: 1},
  settingArrow: {color: '#C9956C', fontSize: 20, fontWeight: 'bold'},
  settingValue: {color: '#A09080', fontSize: 13},
  toggleCard: {
    backgroundColor: '#1C1C1C', borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#2A2A2A', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  toggleLeft: {flexDirection: 'row', alignItems: 'center'},
  toggleIcon: {fontSize: 20, marginRight: 12},
  toggleText: {color: '#FFFFFF', fontSize: 15},
  logoutCard: {
    backgroundColor: '#1C1C1C', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 24, borderWidth: 1, borderColor: '#2A2A2A',
  },
  logoutText: {color: '#FCA5A5', fontSize: 16, fontWeight: 'bold'},
  deleteCard: {
    backgroundColor: '#450A0A', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#DC2626',
  },
  deleteText: {color: '#FCA5A5', fontSize: 16, fontWeight: 'bold'},
  deleteNote: {
    color: '#A09080', fontSize: 11, textAlign: 'center',
    marginTop: 8, paddingHorizontal: 16, lineHeight: 16,
  },
  copyrightBox: {
    alignItems: 'center', marginTop: 32, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#1C1C1C',
  },
  copyrightText: {color: '#A09080', fontSize: 12, fontWeight: '600'},
  copyrightSubText: {color: '#4A5568', fontSize: 11, marginTop: 4},
});