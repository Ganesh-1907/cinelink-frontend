import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  TextInput,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {LiquidPress} from '../components/LiquidPress';

const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com';
const ADMIN_UID   = 'moVQIEK5RqhXUOf4wk1L7913kZZ2';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return 'User';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const extractPhoneNumber = (text: string): string | null => {
  if (!text) return null;
  const phoneRegex = /(\+?[\d][\d\s\-]{8,13}[\d])/;
  const match = text.match(phoneRegex);
  if (match) return match[1].replace(/[\s\-]/g, '');
  return null;
};

export default function AuditionDetailScreen({route, navigation}: any) {
  const paramAudition = route?.params?.audition;
  const paramAuditionId = route?.params?.auditionId;

  const [audition, setAudition] = useState<any>(paramAudition || null);
  const [fetching, setFetching] = useState(!paramAudition && !!paramAuditionId);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [directorProfile, setDirectorProfile] = useState<any>(null);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [saved, setSaved] = useState(false);

  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Applicants (visible to director/admin only)
  const [applicants, setApplicants] = useState<any[]>([]);
  const [myRole, setMyRole] = useState<string>('');

  const user = auth().currentUser;
  const currentUserName =
    user?.displayName || user?.email?.split('@')[0] || 'User';
  const phoneNumber = extractPhoneNumber(audition?.description || '');

  const isOwner = !!audition?.directorId && audition.directorId === user?.uid;
  const isAdmin = myRole === 'admin';
  const canSeeApplicants = isOwner || isAdmin;

  // ── Fetch audition by ID (when opened from a notification) ──
  useEffect(() => {
    if (!paramAudition && paramAuditionId) {
      firestore()
        .collection('auditions')
        .doc(paramAuditionId)
        .get()
        .then(doc => {
          if (doc.exists) setAudition({id: doc.id, ...doc.data()});
          setFetching(false);
        })
        .catch(() => setFetching(false));
    }
  }, []);

  useEffect(() => {
    if (!audition?.id) return;
    checkIfApplied();
    loadDirectorProfile();
    checkIfSaved();
    notifyDirector();
    const unsubscribe = loadComments();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [audition?.id]);

  // ── Load my own role (to detect admin) ──
  useEffect(() => {
    if (!user?.uid) return;
    firestore()
      .collection('users')
      .doc(user.uid)
      .get()
      .then(doc => setMyRole(doc.data()?.role || ''))
      .catch(() => {});
  }, []);

  // ── Load applicants (director/admin only) ──
  useEffect(() => {
    if (!audition?.id || !user?.uid) return;
    const own = audition.directorId === user.uid;
    if (!own && myRole !== 'admin') return;
    loadApplicants(own);
  }, [audition?.id, myRole]);

  /* ── LOAD APPLICANTS (no orderBy → no composite index needed) ── */
  const loadApplicants = async (own: boolean) => {
    try {
      let query: any = firestore()
        .collection('applications')
        .where('auditionId', '==', audition.id);
      if (own) query = query.where('directorId', '==', user?.uid);
      const snap = await query.get();
      const data = snap.docs.map((d: any) => ({id: d.id, ...d.data()}));
      data.sort(
        (a: any, b: any) =>
          (b.appliedAt?.toDate?.()?.getTime() || 0) -
          (a.appliedAt?.toDate?.()?.getTime() || 0),
      );
      setApplicants(data);
    } catch (e) {
      console.log('APPLICANTS ERROR:', e);
    }
  };

  const checkIfApplied = async () => {
    try {
      const snapshot = await firestore()
        .collection('applications')
        .where('auditionId', '==', audition.id)
        .where('applicantId', '==', user?.uid)
        .get();
      if (!snapshot.empty) setApplied(true);
    } catch (e) {console.log(e);}
  };

  const checkIfSaved = async () => {
    try {
      const userDoc = await firestore().collection('users').doc(user?.uid).get();
      const savedIds = userDoc.data()?.savedAuditions || [];
      setSaved(savedIds.includes(audition.id));
    } catch (e) {console.log(e);}
  };

  const loadDirectorProfile = async () => {
    try {
      const doc = await firestore().collection('users').doc(audition.directorId).get();
      if (doc.exists) setDirectorProfile(doc.data());
    } catch (e) {console.log(e);}
  };

const notifyDirector = async () => {
  if (audition.directorId === user?.uid) return;
  try {
    // Check if already notified this user for this audition today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await firestore()
      .collection('notifications')
      .where('userId', '==', audition.directorId)
      .where('senderId', '==', user?.uid)
      .where('type', '==', 'profile_view')
      .where('auditionId', '==', audition.id)
      .get();

    if (!existing.empty) return; // Already notified — skip

    await firestore().collection('notifications').add({
      userId:     audition.directorId,
      type:       'profile_view',
      title:      '👀 Someone viewed your audition!',
      message:    `${currentUserName} viewed your audition "${audition.title}"`,
      senderId:   user?.uid,
      auditionId: audition.id,
      read:       false,
      createdAt:  firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {console.log(e);}
};
  /* ── LOAD COMMENTS ── */
const loadComments = () => {
  return firestore()
    .collection('auditions')
    .doc(audition.id)
    .collection('comments')
    .orderBy('createdAt', 'asc')
    .onSnapshot(
      snapshot => {
        const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setComments(data);
      },
      err => console.log('COMMENTS ERROR:', err),
    );
};

  /* ── POST COMMENT ── */
  const postComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      await firestore()
        .collection('auditions')
        .doc(audition.id)
        .collection('comments')
        .add({
          text: commentText.trim(),
          userId: user?.uid,
          userName: currentUserName,
          userEmail: user?.email,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      // Notify director of comment
      if (audition.directorId !== user?.uid) {
        await firestore().collection('notifications').add({
          userId: audition.directorId,
          type: 'comment',
          title: '💬 New Comment!',
          message: `${currentUserName} commented on "${audition.title}"`,
          senderId: user?.uid,
          auditionId: audition.id,
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      setCommentText('');
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Could not post comment.');
    }
    setPostingComment(false);
  };

  /* ── DELETE COMMENT ── */
  const deleteComment = async (commentId: string, commentUserId: string) => {
    if (commentUserId !== user?.uid && audition.directorId !== user?.uid) return;
    Alert.alert('Delete Comment', 'Delete this comment?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await firestore()
              .collection('auditions')
              .doc(audition.id)
              .collection('comments')
              .doc(commentId)
              .delete();
          } catch (e) {console.log(e);}
        },
      },
    ]);
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const toggleSave = async () => {
    try {
      await firestore().collection('users').doc(user?.uid).update({
        savedAuditions: saved
          ? firestore.FieldValue.arrayRemove(audition.id)
          : firestore.FieldValue.arrayUnion(audition.id),
      });
      setSaved(!saved);
    } catch (e) {console.log(e);}
  };

const startChat = async () => {
  if (audition.directorId === user?.uid) {
    Alert.alert('Error', 'You cannot chat with yourself!');
    return;
  }

  const isAdminUser = user?.uid === ADMIN_UID || user?.email === ADMIN_EMAIL;

  if (!isAdminUser) {
    try {
      const connSnap = await firestore()
        .collection('connections')
        .where('users', 'array-contains', user?.uid)
        .get();
      const connected = connSnap.docs.some(doc =>
        doc.data().users?.includes(audition.directorId),
      );
      if (!connected) {
        Alert.alert(
          'Not Connected',
          'Connect with this director first to send a message.',
        );
        return;
      }
    } catch (e) {
      console.log('CONNECTION CHECK ERROR:', e);
    }
  }

  try {
    const chatId = [user?.uid, audition.directorId].sort().join('_');
    const directorName =
      directorProfile?.displayName || directorProfile?.fullName ||
      directorProfile?.name || cleanName(directorProfile?.email) ||
      cleanName(audition.directorEmail) || 'Director';

    await firestore().collection('chats').doc(chatId).set({
      participants: [user?.uid, audition.directorId],
      participantNames: [currentUserName, directorName],
      participantEmails: [user?.email, audition.directorEmail],
      lastMessage: '',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    navigation.navigate('ChatScreen', {
      chat: {id: chatId, participantNames: [currentUserName, directorName]},
    });
  } catch (e) {console.log(e);}
};

  const openWhatsApp = async () => {
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'Could not find contact number in audition description.');
      return;
    }
    try {
      const url = `whatsapp://send?phone=${phoneNumber}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp to contact the director.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open WhatsApp');
    }
  };

  const applyNow = async () => {
    if (applied) {
      Alert.alert('Already Applied!', 'You have already applied to this audition.');
      return;
    }
    if (!showNoteInput) {
      setShowNoteInput(true);
      return;
    }
    setLoading(true);
    try {
      if (audition.contactLink) {
        const supported = await Linking.canOpenURL(audition.contactLink);
        if (supported) await Linking.openURL(audition.contactLink);
      }
      await firestore().collection('applications').add({
        auditionId: audition.id,
        auditionTitle: audition.title,
        applicantId: user?.uid,
        applicantEmail: user?.email,
        applicantName: currentUserName,
        applicantPhone: user?.phoneNumber || '',
        directorId: audition.directorId,
        directorEmail: audition.directorEmail,
        note: note.trim(),
        status: 'Pending',
        appliedAt: firestore.FieldValue.serverTimestamp(),
      });
      await firestore().collection('notifications').add({
        userId: audition.directorId,
        type: 'application',
        title: '📋 New Application Received!',
        message: `${currentUserName} applied for "${audition.title}"`,
        senderId: user?.uid,
        auditionId: audition.id,
        applicationStatus: 'pending',
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      setApplied(true);
      setShowNoteInput(false);
      setNote('');
      Alert.alert('🎉 Applied!', 'Your application has been submitted successfully!');
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Try again.');
    }
    setLoading(false);
  };

  // ── Early returns MUST come after all function definitions ──
  if (fetching) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A'}}>
        <ActivityIndicator size="large" color="#C9956C" />
      </View>
    );
  }

  if (!audition) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A'}}>
        <Text style={{color: '#fff'}}>Audition not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* POSTER */}
      {audition.posterUrl ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ImageViewer', {imageUrl: audition.posterUrl})}>
          <Image source={{uri: audition.posterUrl}} style={styles.poster} />
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>🔍 Tap for fullscreen</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.posterPlaceholder}>
          <Text style={styles.posterPlaceholderText}>🎭</Text>
        </View>
      )}

      <View style={styles.section}>

        {/* STATUS + SAVE ROW */}
        <View style={styles.statusRow}>
          <View style={styles.badgeGreen}>
            <Text style={styles.badgeText}>{audition.status || 'Open'}</Text>
          </View>
          {applied && (
            <View style={styles.badgeBlue}>
              <Text style={styles.badgeBlueText}>✅ Applied</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnActive]}
            onPress={toggleSave}>
            <Text style={styles.saveBtnText}>{saved ? '💾 Saved' : '🔖 Save'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{audition.title}</Text>

        {/* INFO GRID */}
        <View style={styles.infoGrid}>
          {audition.location ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>📍 Location</Text>
              <Text style={styles.infoValue}>{audition.location}</Text>
            </View>
          ) : null}
          {audition.gender ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>👤 Gender</Text>
              <Text style={styles.infoValue}>{audition.gender}</Text>
            </View>
          ) : null}
          {audition.ageRange ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>🎂 Age Range</Text>
              <Text style={styles.infoValue}>{audition.ageRange} yrs</Text>
            </View>
          ) : null}
          {audition.lastDate ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>📅 Last Date</Text>
              <Text style={styles.infoValue}>{audition.lastDate}</Text>
            </View>
          ) : null}
          {audition.role ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>🎬 Role</Text>
              <Text style={styles.infoValue}>{audition.role}</Text>
            </View>
          ) : null}
          {audition.language ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>🗣 Language</Text>
              <Text style={styles.infoValue}>{audition.language}</Text>
            </View>
          ) : null}
        </View>

        {/* DESCRIPTION */}
        {audition.description ? (
          <>
            <Text style={styles.sectionTitle}>About this Audition</Text>
            <Text style={styles.description}>
              {phoneNumber
                ? audition.description.replace(phoneNumber, '').replace(/\s+/g, ' ').trim()
                : audition.description}
            </Text>
          </>
        ) : null}

        {/* CONTACT LINK */}
        {audition.contactLink ? (
          <TouchableOpacity
            style={styles.linkBox}
            onPress={() => {
              const link = audition.contactLink?.trim();
              if (!link) return;
              const cleaned = link.replace(/[\s\-\+]/g, '');
              if (/^\d{10,13}$/.test(cleaned)) {
                Linking.openURL(`whatsapp://send?phone=91${cleaned}`)
                  .catch(() => Linking.openURL(`tel:${cleaned}`).catch(() => Alert.alert('Error', 'Could not open.')));
                return;
              }
              const url = link.startsWith('http') ? link : `https://${link}`;
              Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open this link.'));
            }}>
            <Text style={styles.linkBoxText}>🔗 Apply via Director's Link</Text>
            <Text style={styles.linkBoxUrl} numberOfLines={1}>{audition.contactLink}</Text>
          </TouchableOpacity>
        ) : null}

        {/* DIRECTOR CARD */}
        {directorProfile && (
          <View style={styles.directorCard}>
            <Text style={styles.sectionTitle}>Director</Text>
            <TouchableOpacity
              style={styles.directorRow}
              onPress={() => navigation.navigate('PublicProfile', {userId: audition.directorId})}>
              {directorProfile.photoUrl || directorProfile.photoURL ? (
                <Image
                  source={{uri: directorProfile.photoUrl || directorProfile.photoURL}}
                  style={styles.directorPhoto}
                />
              ) : (
                <View style={styles.directorAvatar}>
                  <Text style={styles.directorAvatarText}>
                    {(directorProfile.fullName || directorProfile.name || 'D').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.directorInfo}>
                <Text style={styles.directorName}>
                  {directorProfile.fullName || directorProfile.displayName || directorProfile.name || 'Director'}
                </Text>
                <Text style={styles.directorRole}>{directorProfile.role || 'Director'}</Text>
                {directorProfile.bio ? (
                  <Text style={styles.directorBio} numberOfLines={2}>{directorProfile.bio}</Text>
                ) : null}
              </View>
            </TouchableOpacity>

            {directorProfile.portfolioPhotos?.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioRow}>
                {directorProfile.portfolioPhotos.map((url: string, index: number) => (
                  <Image key={index} source={{uri: url}} style={styles.portfolioPhoto} />
                ))}
              </ScrollView>
            ) : null}

            {directorProfile.portfolio1 || directorProfile.portfolio2 || directorProfile.portfolio3 ? (
              <View style={styles.portfolioSection}>
                <Text style={styles.portfolioTitle}>Previous Works</Text>
                {[directorProfile.portfolio1, directorProfile.portfolio2, directorProfile.portfolio3]
                  .filter(Boolean)
                  .map((link, i) => (
                    <TouchableOpacity key={i} onPress={() => Linking.openURL(link)}>
                      <Text style={styles.portfolioLink} numberOfLines={1}>🔗 Work {i + 1}: {link}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            ) : null}

            <TouchableOpacity style={styles.messageBtn} onPress={startChat}>
              <Text style={styles.messageBtnText}>💬 Message Director</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* NOTE INPUT */}
        {showNoteInput && !applied && (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Add a note to the director (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Tell the director why you're perfect for this role..."
              placeholderTextColor="#A09080"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              maxLength={300}
            />
            <Text style={styles.noteCount}>{note.length}/300</Text>
          </View>
        )}

        {/* ACTION BUTTONS */}
        <View style={styles.buttonRow}>
          <LiquidPress
            style={[
              styles.applyBtn,
              {flex: phoneNumber ? 0.55 : 1},
              applied && styles.applyBtnDone,
            ]}
            onPress={applyNow}
            disabled={applied || loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.applyBtnText}>
                {applied ? '✅ Applied' : showNoteInput ? '🚀 Submit' : 'Apply Now →'}
              </Text>
            )}
          </LiquidPress>
          {phoneNumber && (
            <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp}>
              <Text style={styles.whatsappBtnText} numberOfLines={1}>📱 WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>

        {showNoteInput && !applied && (
          <TouchableOpacity style={styles.skipBtn} onPress={() => {setNote(''); applyNow();}}>
            <Text style={styles.skipBtnText}>Skip note & apply directly</Text>
          </TouchableOpacity>
        )}

        {/* ✅ APPLICATIONS SECTION — director/admin only */}
        {canSeeApplicants && (
          <View style={styles.applicantsSection}>
            <Text style={styles.sectionTitle}>
              📋 Applications ({applicants.length})
            </Text>
            {applicants.length === 0 ? (
              <View style={styles.noComments}>
                <Text style={styles.noCommentsText}>No applications yet.</Text>
              </View>
            ) : (
              applicants.map((app: any) => (
                <TouchableOpacity
                  key={app.id}
                  style={styles.applicantCard}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('PublicProfile', {
                      userId: app.applicantId,
                    })
                  }>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {(app.applicantName || app.applicantEmail || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.applicantInfo}>
                    <Text style={styles.applicantName}>
                      {app.applicantName || cleanName(app.applicantEmail)}
                    </Text>
                    <Text style={styles.applicantMeta}>
                      {formatTime(app.appliedAt)} · {app.status || 'Pending'}
                    </Text>
                    {app.note ? (
                      <Text style={styles.applicantNote} numberOfLines={2}>
                        "{app.note}"
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.applicantArrow}>›</Text>
                </TouchableOpacity>
              ))
            )}
            <Text style={styles.applicantHint}>
              Tap an applicant to view their profile & portfolio
            </Text>
          </View>
        )}

        {/* ✅ COMMENTS SECTION */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>
            💬 Comments ({comments.length})
          </Text>

          {/* COMMENT INPUT */}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Ask something or leave a comment..."
              placeholderTextColor="#A09080"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={200}
            />
            <LiquidPress
              style={[styles.commentSendBtn, (!commentText.trim() || postingComment) && styles.commentSendBtnDisabled]}
              onPress={postComment}
              disabled={!commentText.trim() || postingComment}>
              {postingComment ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.commentSendText}>Post</Text>
              )}
            </LiquidPress>
          </View>

          {/* COMMENTS LIST */}
          {comments.length === 0 ? (
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>No comments yet. Be the first! 💬</Text>
            </View>
          ) : (
            comments.map((comment: any) => {
              const isOwn = comment.userId === user?.uid;
              const isDirector = audition.directorId === user?.uid;
              const canDelete = isOwn || isDirector;
              return (
                <View key={comment.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {comment.userName?.charAt(0)?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentName}>
                        {comment.userName}
                        {comment.userId === audition.directorId && (
                          <Text style={styles.directorTag}> 🎬 Director</Text>
                        )}
                      </Text>
                      <Text style={styles.commentTime}>{formatTime(comment.createdAt)}</Text>
                    </View>
                    {canDelete && (
                      <TouchableOpacity
                        onPress={() => deleteComment(comment.id, comment.userId)}
                        style={styles.deleteCommentBtn}>
                        <Text style={styles.deleteCommentText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              );
            })
          )}
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0A'},
  poster: {width: '100%', height: 250, resizeMode: 'cover'},
  tapHint: {paddingVertical: 6, alignItems: 'center', backgroundColor: '#1C1C1C'},
  tapHintText: {color: '#A09080', fontSize: 11},
  posterPlaceholder: {width: '100%', height: 150, backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center'},
  posterPlaceholderText: {fontSize: 50},
  section: {padding: 20, paddingBottom: 40},
  statusRow: {flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap'},
  badgeGreen: {backgroundColor: '#064E3B', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4},
  badgeText: {color: '#6EE7B7', fontSize: 12, fontWeight: '600'},
  badgeBlue: {backgroundColor: '#0B2C4F', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4},
  badgeBlueText: {color: '#93C5FD', fontSize: 12, fontWeight: '600'},
  saveBtn: {backgroundColor: '#1C1C1C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: '#2A2A2A', marginLeft: 'auto'},
  saveBtnActive: {backgroundColor: '#2A2A2A', borderColor: '#C9956C'},
  saveBtnText: {color: '#A09080', fontSize: 12, fontWeight: '600'},
  title: {color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 16},
  infoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20},
  infoCard: {backgroundColor: '#141414', borderRadius: 12, padding: 12, width: '47%', borderTopWidth: 2, borderTopColor: '#C9956C44', borderWidth: 1, borderColor: '#2A2A2A', borderBottomWidth: 3, borderBottomColor: '#C9956C22', borderRightWidth: 2, borderRightColor: '#1A1A1A', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8},
  infoLabel: {color: '#A09080', fontSize: 11, marginBottom: 4},
  infoValue: {color: '#FFFFFF', fontSize: 14, fontWeight: '500'},
  sectionTitle: {color: '#C9956C', fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 4},
  description: {color: '#A09080', fontSize: 15, lineHeight: 24, marginBottom: 20},
  linkBox: {backgroundColor: '#141414', borderRadius: 12, padding: 14, marginBottom: 20, borderTopWidth: 2, borderTopColor: '#C9956C44', borderWidth: 1, borderColor: '#2A2A2A', borderBottomWidth: 3, borderBottomColor: '#C9956C22', borderRightWidth: 2, borderRightColor: '#1A1A1A', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8},
  linkBoxText: {color: '#C9956C', fontSize: 13, fontWeight: 'bold', marginBottom: 4},
  linkBoxUrl: {color: '#A09080', fontSize: 12},
  directorCard: {backgroundColor: '#141414', borderRadius: 16, padding: 16, marginBottom: 20, borderTopWidth: 2, borderTopColor: '#C9956C44', borderWidth: 1, borderColor: '#2A2A2A', borderBottomWidth: 3, borderBottomColor: '#C9956C22', borderRightWidth: 2, borderRightColor: '#1A1A1A', shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.6, shadowRadius: 24, elevation: 8},
  directorRow: {flexDirection: 'row', gap: 12, marginBottom: 12},
  directorPhoto: {width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#C9956C'},
  directorAvatar: {width: 60, height: 60, borderRadius: 30, backgroundColor: '#C9956C', justifyContent: 'center', alignItems: 'center'},
  directorAvatarText: {color: '#FFFFFF', fontSize: 24, fontWeight: 'bold'},
  directorInfo: {flex: 1, justifyContent: 'center'},
  directorName: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 2},
  directorRole: {color: '#C9956C', fontSize: 13, marginBottom: 4},
  directorBio: {color: '#A09080', fontSize: 12, lineHeight: 18},
  portfolioRow: {flexDirection: 'row', marginBottom: 12},
  portfolioPhoto: {width: 80, height: 80, borderRadius: 10, marginRight: 8},
  portfolioSection: {borderTopWidth: 1, borderTopColor: '#2A2A2A', paddingTop: 12, marginBottom: 8},
  portfolioTitle: {color: '#A09080', fontSize: 13, fontWeight: '500', marginBottom: 8},
  portfolioLink: {color: '#C9956C', fontSize: 13, marginBottom: 6},
  messageBtn: {backgroundColor: 'rgba(201,149,108,0.08)', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12, borderWidth: 0.5, borderColor: 'rgba(201,149,108,0.3)', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4},
  messageBtnText: {color: '#C9956C', fontSize: 14, fontWeight: 'bold'},
  noteBox: {backgroundColor: '#141414', borderRadius: 12, padding: 14, marginBottom: 16, borderTopWidth: 2, borderTopColor: '#C9956C44', borderWidth: 1, borderColor: '#2A2A2A', borderBottomWidth: 3, borderBottomColor: '#C9956C22', borderRightWidth: 2, borderRightColor: '#1A1A1A', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8},
  noteLabel: {color: '#C9956C', fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5},
  noteInput: {backgroundColor: '#0A0A0A', borderRadius: 10, padding: 12, color: '#FFFFFF', fontSize: 14, borderWidth: 1, borderColor: '#2A2A2A', minHeight: 100, textAlignVertical: 'top'},
  noteCount: {color: '#A09080', fontSize: 11, textAlign: 'right', marginTop: 4},
  buttonRow: {flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8},
  applyBtn: {backgroundColor: '#C9956C', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', borderTopWidth: 2, borderTopColor: '#E8C4A0', borderBottomWidth: 2, borderBottomColor: '#7A5535', borderLeftWidth: 0, borderRightWidth: 0, shadowColor: '#C9956C', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8},
  applyBtnDone: {backgroundColor: '#064E3B', borderTopWidth: 1.5, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: '#4ADE80', shadowColor: '#000', elevation: 4, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
  applyBtnText: {color: '#FFFFFF', fontSize: 15, fontWeight: 'bold'},
  whatsappBtn: {backgroundColor: '#25D366', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flex: 0.45},
  whatsappBtnText: {color: '#FFFFFF', fontSize: 15, fontWeight: 'bold'},
  skipBtn: {alignItems: 'center', marginTop: 12, padding: 8},
  skipBtnText: {color: '#A09080', fontSize: 13, textDecorationLine: 'underline'},

  /* ✅ APPLICANTS */
  applicantsSection: {marginTop: 24},
  applicantCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#141414', borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderTopWidth: 2, borderTopColor: '#C9956C44',
    borderWidth: 1, borderColor: '#2A2A2A',
    borderBottomWidth: 3, borderBottomColor: '#C9956C22',
    borderRightWidth: 2, borderRightColor: '#1A1A1A',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  applicantInfo: {flex: 1},
  applicantName: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  applicantMeta: {color: '#A09080', fontSize: 11, marginTop: 2},
  applicantNote: {color: '#C9956C', fontSize: 12, marginTop: 4, fontStyle: 'italic'},
  applicantArrow: {color: '#C9956C', fontSize: 24, fontWeight: 'bold'},
  applicantHint: {color: '#A09080', fontSize: 11, textAlign: 'center', marginTop: 4, marginBottom: 8},

  /* ✅ COMMENTS */
  commentsSection: {marginTop: 24},
  commentInputRow: {flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'flex-end'},
  commentInput: {
    flex: 1, backgroundColor: '#060606',
    borderRadius: 12, padding: 12,
    color: '#FFFFFF', fontSize: 14,
    borderWidth: 1, borderColor: '#1A1A1A',
    maxHeight: 100, elevation: 0,
  },
  commentSendBtn: {
    backgroundColor: '#C9956C', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 2, borderTopColor: '#E8C4A0',
    borderBottomWidth: 2, borderBottomColor: '#7A5535',
    borderLeftWidth: 0, borderRightWidth: 0,
    shadowColor: '#C9956C', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  commentSendBtnDisabled: {opacity: 0.4},
  commentSendText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 14},
  noComments: {alignItems: 'center', paddingVertical: 20},
  noCommentsText: {color: '#A09080', fontSize: 14},
  commentCard: {
    backgroundColor: '#141414', borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderTopWidth: 2, borderTopColor: '#C9956C44',
    borderWidth: 1, borderColor: '#2A2A2A',
    borderBottomWidth: 3, borderBottomColor: '#C9956C22',
    borderRightWidth: 2, borderRightColor: '#1A1A1A',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  commentHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8},
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center',
  },
  commentAvatarText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 13},
  commentMeta: {flex: 1},
  commentName: {color: '#FFFFFF', fontSize: 13, fontWeight: '600'},
  directorTag: {color: '#C9956C', fontSize: 12},
  commentTime: {color: '#A09080', fontSize: 11, marginTop: 2},
  deleteCommentBtn: {padding: 4},
  deleteCommentText: {color: '#EF4444', fontSize: 14, fontWeight: 'bold'},
  commentText: {color: '#A09080', fontSize: 14, lineHeight: 20},
});