import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
  TextInput, Linking,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';

// ✅ Change to rzp_live_XXXXXXXXXX for real payments
const RAZORPAY_KEY = 'rzp_test_SuJZOYDYUYgzIY';

export default function PaymentScreen({route, navigation}: any) {
  const {amount, purpose, itemId, itemTitle, videoLink} = route.params;
  const [loading, setLoading] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [upiTxId, setUpiTxId] = useState('');
  const [upiLoading, setUpiLoading] = useState(false);
  const user = auth().currentUser;

  const upiLink = `upi://pay?pa=6303258563-n221-2@ybl&pn=CineLink&am=${amount}&cu=INR`;

  const amountPaise = amount * 100; // No GST — flat amount only
  const currentUserName =
    user?.displayName || user?.email?.split('@')[0] || 'User';

  /* ── CHECK DUPLICATE PAYMENT ── */
  useEffect(() => {
    checkDuplicatePayment();
  }, []);

  const checkDuplicatePayment = async () => {
    try {
      const snapshot = await firestore()
        .collection('payments')
        .where('userId', '==', user?.uid)
        .where('itemId', '==', itemId)
        .where('status', '==', 'success')
        .get();
      if (!snapshot.empty) {setAlreadyPaid(true);}

      if (purpose === 'contest_entry') {
        const entrySnap = await firestore()
          .collection('contestEntries')
          .where('contestId', '==', itemId)
          .where('userId', '==', user?.uid)
          .get();
        if (!entrySnap.empty) setAlreadyPaid(true);
      }
    } catch (e) {
      console.log('CHECK DUPLICATE ERROR:', e);
    } finally {
      setCheckingPayment(false);
    }
  };

  /* ── SAVE PAYMENT RECORD ── */
  const savePayment = async (transactionId: string, status: 'success' | 'failed') => {
    try {
      await firestore().collection('payments').add({
        userId: user?.uid,
        userEmail: user?.email,
        userName: currentUserName,
        amount,
        purpose,
        itemId,
        itemTitle,
        videoLink: videoLink || '',
        status,
        transactionId,
        paidAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.log('SAVE PAYMENT ERROR:', e);
    }
  };

  /* ── HANDLE PAYMENT SUCCESS ── */
  const handlePaymentSuccess = async (transactionId: string) => {
    try {
      await savePayment(transactionId, 'success');

      if (purpose === 'contest_entry') {
        const existing = await firestore()
          .collection('contestEntries')
          .where('contestId', '==', itemId)
          .where('userId', '==', user?.uid)
          .get();

        if (existing.empty) {
          await firestore().collection('contestEntries').add({
            contestId: itemId,
            contestTitle: itemTitle,
            userId: user?.uid,
            userEmail: user?.email,
            userName: currentUserName,
            videoLink: videoLink || '',
            votes: 0,
            juryScore: 0,
            finalScore: 0,
            paid: true,
            transactionId,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
          await firestore().collection('contests').doc(itemId).update({
            entriesCount: firestore.FieldValue.increment(1),
          });
        }
      }

      if (purpose === 'film_upload') {
        await firestore().collection('films').doc(itemId).update({paid: true});
      }

      Alert.alert(
        '✅ Payment Successful!',
        `₹${amount} paid successfully!\n\nTransaction ID: ${transactionId}`,
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (e: any) {
      Alert.alert(
        'Payment Done!',
        'Payment successful but could not save entry. Contact support with Transaction ID: ' + transactionId,
      );
    }
  };

  /* ── UPI FALLBACK ── */
  const handleUpiSubmit = async () => {
    if (!upiTxId.trim()) {
      Alert.alert('Missing ID', 'Please enter your UPI transaction ID.');
      return;
    }
    setUpiLoading(true);
    try {
      await savePayment(upiTxId.trim(), 'success');

      if (purpose === 'contest_entry') {
        const existing = await firestore()
          .collection('contestEntries')
          .where('contestId', '==', itemId)
          .where('userId', '==', user?.uid)
          .get();

        if (existing.empty) {
          await firestore().collection('contestEntries').add({
            contestId: itemId,
            contestTitle: itemTitle,
            userId: user?.uid,
            userEmail: user?.email,
            userName: currentUserName,
            videoLink: videoLink || '',
            votes: 0,
            juryScore: 0,
            finalScore: 0,
            paid: true,
            upiTransactionId: upiTxId.trim(),
            verified: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
          await firestore().collection('contests').doc(itemId).update({
            entriesCount: firestore.FieldValue.increment(1),
          });
        }
      }

      Alert.alert(
        '✅ Entry Submitted!',
        `UPI Transaction ID: ${upiTxId.trim()}\n\nWe'll verify your payment within 24 hours and confirm your spot.`,
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (e: any) {
      Alert.alert('Error', 'Could not save your entry. Please contact support with your transaction ID.');
    } finally {
      setUpiLoading(false);
    }
  };

  /* ── PROCESS PAYMENT ── */
  const processPayment = async () => {
    if (alreadyPaid) {
      Alert.alert('Already Paid', 'You have already paid for this item!');
      return;
    }
    setLoading(true);

    const options = {
      description: itemTitle,
      currency: 'INR',
      key: RAZORPAY_KEY,
      amount: amountPaise,
      name: 'CineLink',
      prefill: {
        email: user?.email || '',
        contact: '',
        name: currentUserName,
      },
      theme: {color: '#C9956C'},
    };

    RazorpayCheckout.open(options)
      .then(async (data: any) => {
        await handlePaymentSuccess(data.razorpay_payment_id);
        setLoading(false);
      })
      .catch(async (error: any) => {
        setLoading(false);
        if (error.code === 2) return; // user cancelled
        await savePayment('FAILED_' + Date.now(), 'failed');
        Alert.alert(
          '❌ Payment Failed',
          (error.description || 'Something went wrong.') + '\n\nYou can pay via UPI instead.',
        );
      });
  };

  if (checkingPayment) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C9956C" />
        <Text style={styles.loadingText}>Checking payment status...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>

        {/* ALREADY PAID WARNING */}
        {alreadyPaid && (
          <View style={styles.alreadyPaidBox}>
            <Text style={styles.alreadyPaidText}>
              ✅ You have already paid for this item!
            </Text>
            <TouchableOpacity
              style={styles.goBackBtn}
              onPress={() => navigation.goBack()}>
              <Text style={styles.goBackBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ORDER SUMMARY */}
        <View style={styles.orderCard}>
          <Text style={styles.orderLabel}>Payment for</Text>
          <Text style={styles.orderTitle}>{itemTitle}</Text>
          <View style={styles.divider} />
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Entry Fee</Text>
            <Text style={styles.amountValue}>₹{amount}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.amountRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalAmount}>₹{amount}</Text>
          </View>
        </View>

        {/* WHAT YOU GET */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>✅ What you get</Text>
          {purpose === 'contest_entry' && (
            <>
              <Text style={styles.benefitItem}>🎬 Your video submitted to contest</Text>
              <Text style={styles.benefitItem}>👍 Public voting on your entry</Text>
              <Text style={styles.benefitItem}>⭐ Jury evaluation</Text>
              <Text style={styles.benefitItem}>🏆 Chance to win the prize</Text>
            </>
          )}
          {purpose === 'film_upload' && (
            <>
              <Text style={styles.benefitItem}>🎬 Your film featured on CineLink</Text>
              <Text style={styles.benefitItem}>👁 Visibility to industry professionals</Text>
              <Text style={styles.benefitItem}>❤️ Likes and comments from users</Text>
            </>
          )}
        </View>

        {/* SECURE BADGE */}
        <View style={styles.secureBox}>
          <Text style={styles.secureText}>🔒 100% Secure Payment</Text>
          <Text style={styles.secureDesc}>
            Powered by Razorpay — encrypted and secure
          </Text>
        </View>

        {/* PAY BUTTON */}
        {!alreadyPaid && (
          <TouchableOpacity
            style={[styles.payBtn, loading && styles.payBtnDisabled]}
            onPress={processPayment}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.payBtnRow}>
                <Text style={styles.payBtnText}>💳 Pay ₹{amount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ── UPI FALLBACK ── */}
        <View style={styles.upiDividerRow}>
          <View style={styles.upiDividerLine} />
          <Text style={styles.upiDividerText}>or</Text>
          <View style={styles.upiDividerLine} />
        </View>

        <View style={styles.upiCard}>
          <Text style={styles.upiCardTitle}>📲 Pay via UPI</Text>
          <Text style={styles.upiCardDesc}>
            Open your UPI app, pay ₹{amount} to the ID below, then paste your transaction ID here.
          </Text>
          <Text style={styles.upiId}>UPI ID: 6303258563-n221-2@ybl</Text>

          <TouchableOpacity
            style={styles.upiOpenBtn}
            onPress={() =>
              Linking.openURL(upiLink).catch(() =>
                Alert.alert('Could not open UPI app', 'Please open PhonePe / GPay manually and pay to the UPI ID above.'),
              )
            }>
            <Text style={styles.upiOpenBtnText}>📱 Open UPI App</Text>
          </TouchableOpacity>

          <Text style={styles.upiInputLabel}>Enter UPI Transaction ID</Text>
          <TextInput
            style={styles.upiInput}
            placeholder="e.g. 4059382716534"
            placeholderTextColor="#5C5048"
            value={upiTxId}
            onChangeText={setUpiTxId}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.upiSubmitBtn, (!upiTxId.trim() || upiLoading) && styles.upiSubmitBtnDisabled]}
            onPress={handleUpiSubmit}
            disabled={!upiTxId.trim() || upiLoading}>
            {upiLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.upiSubmitBtnText}>✅ Submit Entry with UPI</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.upiNote}>
            Your entry will be marked pending until we verify the payment (within 24 hrs).
          </Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  section: {padding: 16, paddingBottom: 40},
  loadingContainer: {flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center'},
  loadingText: {color: '#A09080', marginTop: 16, fontSize: 14},
  alreadyPaidBox: {
    backgroundColor: '#064E3B', borderRadius: 14, padding: 16,
    marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#4ADE80',
  },
  alreadyPaidText: {color: '#4ADE80', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 12},
  goBackBtn: {backgroundColor: '#4ADE80', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8},
  goBackBtnText: {color: '#064E3B', fontWeight: 'bold', fontSize: 14},
  orderCard: {
    backgroundColor: '#1C1C1C', borderRadius: 16, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: '#2A2A2A',
  },
  orderLabel: {color: '#A09080', fontSize: 13, marginBottom: 6},
  orderTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16},
  divider: {height: 1, backgroundColor: '#2A2A2A', marginVertical: 12},
  amountRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4},
  amountLabel: {color: '#A09080', fontSize: 14},
  amountValue: {color: '#FFFFFF', fontSize: 14, fontWeight: '500'},
  totalLabel: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
  totalAmount: {color: '#C9956C', fontSize: 22, fontWeight: 'bold'},
  benefitsCard: {
    backgroundColor: '#1C1C1C', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#2A2A2A',
  },
  benefitsTitle: {color: '#4ADE80', fontSize: 14, fontWeight: 'bold', marginBottom: 10},
  benefitItem: {color: '#A09080', fontSize: 13, marginBottom: 6},
  secureBox: {
    backgroundColor: '#1C1C1C', borderRadius: 12, padding: 14,
    marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A',
  },
  secureText: {color: '#4ADE80', fontSize: 14, fontWeight: 'bold', marginBottom: 4},
  secureDesc: {color: '#A09080', fontSize: 12, textAlign: 'center'},
  payBtn: {
    backgroundColor: '#C9956C', borderRadius: 14,
    padding: 18, alignItems: 'center', marginBottom: 12,
  },
  payBtnDisabled: {opacity: 0.6},
  payBtnRow: {flexDirection: 'row', alignItems: 'center'},
  payBtnText: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold'},
  testNote: {color: '#A09080', fontSize: 12, textAlign: 'center'},

  // ── UPI fallback ─────────────────────────────────────────────
  upiDividerRow: {flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12, gap: 10},
  upiDividerLine: {flex: 1, height: 1, backgroundColor: '#2A2A2A'},
  upiDividerText: {color: '#5C5048', fontSize: 13},

  upiCard: {
    backgroundColor: '#1C1C1C', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#2A2A2A', marginTop: 4,
  },
  upiCardTitle: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 6},
  upiCardDesc: {color: '#A09080', fontSize: 13, lineHeight: 20, marginBottom: 12},
  upiId: {color: '#C9956C', fontSize: 14, fontWeight: '700', marginBottom: 14},

  upiOpenBtn: {
    backgroundColor: '#25D366', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginBottom: 18,
  },
  upiOpenBtnText: {color: '#FFFFFF', fontSize: 15, fontWeight: 'bold'},

  upiInputLabel: {color: '#C9956C', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8},
  upiInput: {
    backgroundColor: '#242424', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    color: '#FFFFFF', fontSize: 15,
    borderWidth: 1, borderColor: '#3A3A3A',
    marginBottom: 14,
  },

  upiSubmitBtn: {
    backgroundColor: '#C9956C', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  upiSubmitBtnDisabled: {opacity: 0.45},
  upiSubmitBtnText: {color: '#FFFFFF', fontSize: 15, fontWeight: 'bold'},

  upiNote: {color: '#5C5048', fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18},

  noticeBanner: {
    borderWidth: 1, borderColor: '#C9956C', borderRadius: 12,
    backgroundColor: 'rgba(201,149,108,0.08)',
    padding: 14, marginBottom: 16,
  },
  noticeText: {color: '#C9956C', fontSize: 13, lineHeight: 20, textAlign: 'center'},
});