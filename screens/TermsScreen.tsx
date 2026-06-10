import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';

export default function TermsScreen({navigation}: any) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          <Text style={styles.lastUpdated}>Last updated: June 2026</Text>

          <Text style={styles.intro}>
            These Terms and Conditions govern your use of CineLink — India's Cinema Network.
            By downloading, installing, or using CineLink, you agree to be bound by these
            terms. Please read them carefully before using the app.
          </Text>

          {/* SECTION 1 */}
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By creating an account or using CineLink, you confirm that you are at least
            18 years old, have read and understood these Terms, and agree to be legally
            bound by them. If you do not agree, please do not use our app.
          </Text>

          {/* SECTION 2 */}
          <Text style={styles.sectionTitle}>2. User Accounts</Text>
          <Text style={styles.bullet}>• You must provide accurate and complete information when registering</Text>
          <Text style={styles.bullet}>• You are responsible for maintaining the security of your account</Text>
          <Text style={styles.bullet}>• You must not share your account credentials with others</Text>
          <Text style={styles.bullet}>• You must notify us immediately of any unauthorized account access</Text>
          <Text style={styles.bullet}>• CineLink reserves the right to suspend or terminate accounts that violate these terms</Text>

          {/* SECTION 3 */}
          <Text style={styles.sectionTitle}>3. Acceptable Use</Text>
          <Text style={styles.sectionText}>You agree NOT to:</Text>
          <Text style={styles.bullet}>• Post false, misleading, or fraudulent audition listings</Text>
          <Text style={styles.bullet}>• Harass, threaten, or abuse other users</Text>
          <Text style={styles.bullet}>• Upload inappropriate, offensive, or illegal content</Text>
          <Text style={styles.bullet}>• Create fake accounts or impersonate others</Text>
          <Text style={styles.bullet}>• Spam other users with unsolicited messages</Text>
          <Text style={styles.bullet}>• Use the platform for any illegal activities</Text>
          <Text style={styles.bullet}>• Attempt to hack or disrupt our services</Text>
          <Text style={styles.bullet}>• Collect other users' data without their consent</Text>

          {/* SECTION 4 */}
          <Text style={styles.sectionTitle}>4. Content & Intellectual Property</Text>
          <Text style={styles.sectionText}>
            You retain ownership of content you post on CineLink. However, by posting
            content, you grant CineLink a non-exclusive license to display and distribute
            your content within the app. You are solely responsible for the content you post.
          </Text>
          <Text style={styles.sectionText}>
            CineLink's logo, design, and features are protected by intellectual property
            laws and may not be copied or used without our permission.
          </Text>

          {/* SECTION 5 */}
          <Text style={styles.sectionTitle}>5. Auditions & Applications</Text>
          <Text style={styles.bullet}>• CineLink is a networking platform — we do not guarantee any employment or roles</Text>
          <Text style={styles.bullet}>• Directors are responsible for the accuracy of their audition listings</Text>
          <Text style={styles.bullet}>• CineLink does not verify the legitimacy of every audition posted</Text>
          <Text style={styles.bullet}>• Users should exercise caution and do their own research before attending auditions</Text>
          <Text style={styles.bullet}>• CineLink is not responsible for any disputes between directors and applicants</Text>

          {/* SECTION 6 */}
          <Text style={styles.sectionTitle}>6. Payments & Refunds</Text>
          <Text style={styles.bullet}>• Payments are processed securely through Razorpay</Text>
          <Text style={styles.bullet}>• Contest entry fees are non-refundable once submitted</Text>
          <Text style={styles.bullet}>• In case of technical payment failure, contact us within 48 hours</Text>
          <Text style={styles.bullet}>• CineLink is not responsible for payment failures due to bank issues</Text>
          <Text style={styles.bullet}>• All prices are in Indian Rupees (INR)</Text>

          {/* SECTION 7 */}
          <Text style={styles.sectionTitle}>7. Contests</Text>
          <Text style={styles.bullet}>• Contest rules and prizes are as described in each contest</Text>
          <Text style={styles.bullet}>• Voting manipulation or cheating will result in disqualification</Text>
          <Text style={styles.bullet}>• CineLink's decision on contest winners is final</Text>
          <Text style={styles.bullet}>• Prize distribution timelines may vary</Text>
          <Text style={styles.bullet}>• CineLink reserves the right to cancel contests if necessary</Text>

          {/* SECTION 8 */}
          <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            CineLink is provided "as is" without warranties of any kind. We are not liable for:
          </Text>
          <Text style={styles.bullet}>• Any losses arising from your use of the app</Text>
          <Text style={styles.bullet}>• Content posted by other users</Text>
          <Text style={styles.bullet}>• Technical issues or app downtime</Text>
          <Text style={styles.bullet}>• Disputes between users</Text>
          <Text style={styles.bullet}>• Fraudulent auditions posted by third parties</Text>

          {/* SECTION 9 */}
          <Text style={styles.sectionTitle}>9. Termination</Text>
          <Text style={styles.sectionText}>
            CineLink reserves the right to suspend or permanently ban any account that
            violates these Terms without prior notice. You may delete your account at any
            time by contacting us. Upon termination, your data will be handled as per our
            Privacy Policy.
          </Text>

          {/* SECTION 10 */}
            <Text style={styles.sectionText}>
  These Terms are governed by the laws of India. Any disputes arising from the
  use of CineLink shall be subject to the exclusive jurisdiction of the courts
  in Hyderabad, Telangana, India.
</Text>

          {/* SECTION 11 */}
          <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
          <Text style={styles.sectionText}>
            We may update these Terms from time to time. Continued use of CineLink after
            changes are posted constitutes your acceptance of the updated Terms. We will
            notify users of significant changes through the app.
          </Text>

          {/* SECTION 12 */}
          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.sectionText}>
            For any questions about these Terms, please contact us:
          </Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactText}>📧 cinelink011@gmail.com</Text>
            <Text style={styles.contactText}>📞 +91 7013345950</Text>
            <Text style={styles.contactText}>🎬 CineLink — India's Cinema Network</Text>
            <Text style={styles.contactText}>📍 Hyderabad, Telangana, India</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2026 CineLink. All rights reserved.</Text>
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
  lastUpdated: {color: '#A09080', fontSize: 12, marginBottom: 16, fontStyle: 'italic'},
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
  sectionText: {color: '#A09080', fontSize: 14, lineHeight: 22, marginBottom: 8},
  bullet: {color: '#A09080', fontSize: 14, lineHeight: 24, paddingLeft: 8, marginBottom: 4},
  contactBox: {
    backgroundColor: '#1C1C1C', borderRadius: 12, padding: 16,
    marginTop: 8, borderWidth: 1, borderColor: '#2A2A2A',
  },
  contactText: {color: '#FFFFFF', fontSize: 14, marginBottom: 6},
  footer: {marginTop: 40, alignItems: 'center'},
  footerText: {color: '#A09080', fontSize: 12},
});