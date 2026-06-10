import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';

export default function PrivacyPolicyScreen({navigation}: any) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          <Text style={styles.lastUpdated}>Last updated: June 2026</Text>

          <Text style={styles.intro}>
            Welcome to CineLink — India's Cinema Network. We are committed to protecting
            your personal information and your right to privacy. This Privacy Policy explains
            how we collect, use, and share your information when you use our app.
          </Text>

          {/* SECTION 1 */}
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.sectionText}>
            We collect information you provide directly to us, including:
          </Text>
          <Text style={styles.bullet}>• Name and email address when you register</Text>
          <Text style={styles.bullet}>• Profile information such as role, bio, location, and profile photo</Text>
          <Text style={styles.bullet}>• Portfolio photos and work links you upload</Text>
          <Text style={styles.bullet}>• Messages you send to other users</Text>
          <Text style={styles.bullet}>• Audition applications and contest entries you submit</Text>
          <Text style={styles.bullet}>• Payment information processed securely through Razorpay</Text>
          <Text style={styles.bullet}>• Device information and usage data for app improvement</Text>

          {/* SECTION 2 */}
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.sectionText}>We use the information we collect to:</Text>
          <Text style={styles.bullet}>• Create and manage your CineLink account</Text>
          <Text style={styles.bullet}>• Connect you with directors, actors, and other film professionals</Text>
          <Text style={styles.bullet}>• Send notifications about auditions, messages, and updates</Text>
          <Text style={styles.bullet}>• Process payments for contest entries and film uploads</Text>
          <Text style={styles.bullet}>• Improve our app features and user experience</Text>
          <Text style={styles.bullet}>• Prevent fraud, spam, and abuse on the platform</Text>
          <Text style={styles.bullet}>• Comply with legal obligations</Text>

          {/* SECTION 3 */}
          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.sectionText}>
            We do not sell your personal information to third parties. We may share your
            information only in the following circumstances:
          </Text>
          <Text style={styles.bullet}>• With other users as part of the networking features (name, role, profile photo)</Text>
          <Text style={styles.bullet}>• With Razorpay for secure payment processing</Text>
          <Text style={styles.bullet}>• With Firebase/Google for app infrastructure and authentication</Text>
          <Text style={styles.bullet}>• With Cloudinary for secure media storage</Text>
          <Text style={styles.bullet}>• When required by law or legal process</Text>

          {/* SECTION 4 */}
          <Text style={styles.sectionTitle}>4. Data Storage & Security</Text>
          <Text style={styles.sectionText}>
            Your data is stored securely on Google Firebase servers. We implement
            industry-standard security measures including:
          </Text>
          <Text style={styles.bullet}>• Encrypted data transmission (HTTPS)</Text>
          <Text style={styles.bullet}>• Firebase Authentication for secure login</Text>
          <Text style={styles.bullet}>• Firestore Security Rules to protect your data</Text>
          <Text style={styles.bullet}>• Cloudinary secure media storage</Text>

          {/* SECTION 5 */}
          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <Text style={styles.sectionText}>You have the right to:</Text>
          <Text style={styles.bullet}>• Access and update your personal information via your Profile</Text>
          <Text style={styles.bullet}>• Delete your account and associated data by contacting us</Text>
          <Text style={styles.bullet}>• Opt out of notifications in your device settings</Text>
          <Text style={styles.bullet}>• Request a copy of your data</Text>

          {/* SECTION 6 */}
          <Text style={styles.sectionTitle}>6. Children's Privacy</Text>
          <Text style={styles.sectionText}>
            CineLink is intended for users aged 18 and above. We do not knowingly collect
            personal information from children under 18. If we discover that a child under
            18 has provided us with personal information, we will delete it immediately.
          </Text>

          {/* SECTION 7 */}
          <Text style={styles.sectionTitle}>7. Third-Party Services</Text>
          <Text style={styles.sectionText}>
            CineLink uses the following third-party services, each with their own privacy policies:
          </Text>
          <Text style={styles.bullet}>• Google Firebase — Authentication and database</Text>
          <Text style={styles.bullet}>• Cloudinary — Media storage and delivery</Text>
          <Text style={styles.bullet}>• Razorpay — Payment processing</Text>
          <Text style={styles.bullet}>• Google Sign In — Optional social login</Text>

          {/* SECTION 8 */}
          <Text style={styles.sectionTitle}>8. Cookies & Tracking</Text>
          <Text style={styles.sectionText}>
            Our mobile app does not use cookies. We may collect anonymous usage analytics
            to improve the app experience. This data cannot be used to identify you personally.
          </Text>

          {/* SECTION 9 */}
          <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
          <Text style={styles.sectionText}>
            We may update this Privacy Policy from time to time. We will notify you of any
            significant changes by posting the new policy in the app. Your continued use of
            CineLink after changes are made constitutes your acceptance of the new policy.
          </Text>

          {/* SECTION 10 */}
          <Text style={styles.sectionTitle}>10. Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions about this Privacy Policy or our data practices,
            please contact us at:
          </Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactText}>📧 cinelink011@gmail.com</Text>
            <Text style={styles.contactText}>🎬 CineLink — India's Cinema Network</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2026 CineLink. All rights reserved.
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: '#0A0A0A', borderBottomWidth: 1, borderBottomColor: '#1C1C1C',
  },
  backBtn: {marginRight: 12},
  backText: {color: '#C9956C', fontSize: 26, fontWeight: 'bold'},
  headerTitle: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},

  scroll: {flex: 1},
  content: {padding: 20, paddingBottom: 60},

  lastUpdated: {
    color: '#A09080', fontSize: 12, marginBottom: 16,
    fontStyle: 'italic',
  },

  intro: {
    color: '#A09080', fontSize: 14, lineHeight: 22,
    marginBottom: 24, backgroundColor: '#1C1C1C',
    borderRadius: 12, padding: 16,
    borderLeftWidth: 3, borderLeftColor: '#C9956C',
  },

  sectionTitle: {
    color: '#C9956C', fontSize: 16, fontWeight: 'bold',
    marginTop: 24, marginBottom: 8,
  },

  sectionText: {
    color: '#A09080', fontSize: 14, lineHeight: 22, marginBottom: 8,
  },

  bullet: {
    color: '#A09080', fontSize: 14, lineHeight: 24,
    paddingLeft: 8, marginBottom: 4,
  },

  contactBox: {
    backgroundColor: '#1C1C1C', borderRadius: 12,
    padding: 16, marginTop: 8,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  contactText: {color: '#FFFFFF', fontSize: 14, marginBottom: 6},

  footer: {marginTop: 40, alignItems: 'center'},
  footerText: {color: '#A09080', fontSize: 12},
});