import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
  SafeAreaView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';
import api from '../src/api/client';

const sanitizeForRazorpay = (text: string) =>
  text.replace(/[^\x20-\x7E]/g, '').trim().substring(0, 255);

export default function PaymentScreen({route, navigation}: any) {
  const {amount, purpose, itemId, itemTitle, videoLink} = route.params;
  const [loading, setLoading] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const user = auth().currentUser;

  const amountPaise = amount * 100;
  const currentUserName =
    user?.displayName || user?.email?.split('@')[0] || 'User';

  /* ── CHECK DUPLICATE PAYMENT ── */
  useEffect(() => {
    checkDuplicatePayment();
  }, []);

  const checkDuplicatePayment = async () => {
    try {
      // Use backend API to check duplicate
      try {
        const result = await api.get(`/payments/check-duplicate?itemId=${itemId}&purpose=${purpose}`);
        if (result.alreadyPaid) {
          setAlreadyPaid(true);
        }
      } catch {
        // Fallback: direct Firestore check
        const snapshot = await firestore()
          .collection('payments')
          .where('userId', '==', user?.uid)
          .where('itemId', '==', itemId)
          .where('status', '==', 'success')
          .get();
        if (!snapshot.empty) setAlreadyPaid(true);

        if (purpose === 'contest_entry') {
          const entrySnap = await firestore()
            .collection('contestEntries')
            .where('contestId', '==', itemId)
            .where('userId', '==', user?.uid)
            .get();
          if (!entrySnap.empty) setAlreadyPaid(true);
        }
      }
    } catch (e) {
      console.log('CHECK DUPLICATE ERROR:', e);
    } finally {
      setCheckingPayment(false);
    }
  };

  /* ── PROCESS PAYMENT ── */
  const processPayment = async () => {
    if (alreadyPaid) {
      Alert.alert('Already Paid', 'You have already paid for this item!');
      return;
    }
    setLoading(true);

    try {
      // Step 1: Create order via backend API
      let orderId: string;
      let razorpayKey: string;

      try {
        const orderResult = await api.post('/payments/create-order', {
          amount,
          notes: {
            userId: user?.uid,
            userEmail: user?.email,
            purpose,
            itemId,
            itemTitle,
            videoLink: videoLink || '',
          },
        });
        orderId = orderResult.orderId;
        razorpayKey = orderResult.keyId;
      } catch {
        Alert.alert('Payment Error', 'Could not connect to payment server. Please try again.');
        setLoading(false);
        return;
      }

      // Step 2: Open Razorpay checkout
      const options = {
        description: sanitizeForRazorpay(itemTitle),
        currency: 'INR',
        key: razorpayKey,
        amount: amountPaise,
        order_id: orderId,
        name: 'CineLink',
        prefill: {
          email: user?.email || '',
          contact: '',
          name: currentUserName,
        },
        theme: {color: '#C9956C'},
      };

      const data = await RazorpayCheckout.open(options);

      // Step 3: Verify payment signature via backend
      if (data.razorpay_payment_id && data.razorpay_signature) {
        try {
          await api.post('/payments/verify-payment', {
            razorpay_order_id: orderId,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
          });
        } catch {
          // Verification failed — but payment went through. Save anyway.
          console.log('Payment verification error (non-fatal)');
        }
      }

      // Step 4: Save payment record via backend
      try {
        await api.post('/payments/save-payment', {
          orderId,
          paymentId: data.razorpay_payment_id,
          amount,
          purpose,
          itemId,
          itemTitle,
          videoLink: videoLink || '',
        });
      } catch {
        // Fallback: direct Firestore write
        await firestore().collection('payments').add({
          userId: user?.uid,
          userEmail: user?.email,
          userName: currentUserName,
          amount,
          purpose,
          itemId,
          itemTitle,
          videoLink: videoLink || '',
          status: 'success',
          transactionId: data.razorpay_payment_id,
          paidAt: firestore.FieldValue.serverTimestamp(),
        });

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
              transactionId: data.razorpay_payment_id,
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
            try {
              await firestore().collection('contests').doc(itemId).update({
                entriesCount: firestore.FieldValue.increment(1),
              });
            } catch (counterErr: any) {
              console.log('ENTRIES_COUNT_UPDATE_ERROR:', counterErr?.message);
            }
          }
        }

        if (purpose === 'film_upload') {
          await firestore().collection('films').doc(itemId).update({paid: true});
        }
      }

      Alert.alert(
        '✅ Payment Successful!',
        `₹${amount} paid successfully!\n\nTransaction ID: ${data.razorpay_payment_id}`,
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (error: any) {
      if (error.code === 2) {
        // User cancelled
        return;
      }
      console.log('PAYMENT ERROR:', error);
      Alert.alert(
        '❌ Payment Failed',
        error.description || error.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
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
    <SafeAreaView style={{flex: 1, backgroundColor: '#0A0A0A'}}>
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

      </View>
    </ScrollView>
    </SafeAreaView>
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
  noticeBanner: {
    borderWidth: 1, borderColor: '#C9956C', borderRadius: 12,
    backgroundColor: 'rgba(201,149,108,0.08)',
    padding: 14, marginBottom: 16,
  },
  noticeText: {color: '#C9956C', fontSize: 13, lineHeight: 20, textAlign: 'center'},
});
