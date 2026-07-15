import React, {useEffect, useState, useCallback} from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, TextInput, Image, Linking,
  SafeAreaView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const STATUS_CONFIG: any = {
  pending:      {label: '⏳ Pending',      color: '#FBBF24'},
  reviewed:     {label: '👁️ Reviewed',     color: '#38BDF8'},
  action_taken: {label: '✅ Action Taken', color: '#4ADE80'},
  dismissed:    {label: '❌ Dismissed',    color: '#A09080'},
};

export default function AdminReportsScreen({navigation}: any) {
  const [reports,    setReports]    = useState<any[]>([]);
  const [users,      setUsers]      = useState<any[]>([]);
  const [approvals,  setApprovals]  = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('pending');
  const [activeTab,  setActiveTab]  = useState<'reports' | 'users' | 'approvals'>('approvals');
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentUser = auth().currentUser;
  const isAdmin = currentUser?.email === 'anilkumardevarakonda03@gmail.com';

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only admins can view this screen.');
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('Main');
      return;
    }
    if (activeTab === 'reports') loadReports();
    else if (activeTab === 'users') loadUsers();
    else loadApprovals();
  }, [filter, activeTab]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const snapshot = await firestore()
        .collection('reports').where('status', '==', filter)
        .orderBy('createdAt', 'desc').get();
      setReports(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    } catch (e) {console.log(e);}
    finally {setLoading(false);}
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const snapshot = await firestore().collection('users').get();
      setUsers(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    } catch (e) {console.log(e);}
    finally {setLoading(false);}
  };

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const snapshot = await firestore()
        .collection('castingRequests')
        .orderBy('createdAt', 'desc').get();
      setApprovals(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    } catch (e) {console.log(e);}
    finally {setLoading(false);}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'reports') await loadReports();
    else if (activeTab === 'users') await loadUsers();
    else await loadApprovals();
    setRefreshing(false);
  }, [filter, activeTab]);

  const approveRequest = async (request: any) => {
    Alert.alert(
      '✅ Approve Casting Director',
      `Approve "${request.userName}" from "${request.companyName || 'N/A'}" to post auditions on CineLink?\n\nMake sure you have verified their ID proof and called them on ${request.phone || 'N/A'}.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve ✅',
          onPress: async () => {
            try {
              await firestore().collection('users').doc(request.userId).update({
                isApprovedDirector: true,
                castingDirectorVerified: true,
                approvedAt: firestore.FieldValue.serverTimestamp(),
                approvedBy: currentUser?.email,
                companyName: request.companyName || '',
              });
              await firestore().collection('castingRequests').doc(request.id).update({
                status: 'approved',
                reviewedAt: firestore.FieldValue.serverTimestamp(),
              });
              await firestore().collection('notifications').add({
                userId:    request.userId,
                type:      'casting_approved',
                title:     '🎉 You are an Approved Casting Director!',
                message:   'Admin approved your request! You can now post auditions on CineLink.',
                read:      false,
                createdAt: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('✅ Approved!', `${request.userName} can now post auditions.`);
              loadApprovals();
            } catch (e) {
              Alert.alert('Error', 'Could not approve. Try again.');
            }
          },
        },
      ],
    );
  };

  const rejectRequest = async (request: any) => {
    Alert.alert(
      '❌ Reject Request',
      `Reject "${request.userName}"'s casting director application?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('castingRequests').doc(request.id).update({
                status: 'rejected',
                reviewedAt: firestore.FieldValue.serverTimestamp(),
              });
              await firestore().collection('notifications').add({
                userId:    request.userId,
                type:      'casting_rejected',
                title:     '❌ Application Rejected',
                message:   'Your casting director application was not approved. Please update your profile and ID proof and try again.',
                read:      false,
                createdAt: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Done', `${request.userName}'s application rejected.`);
              loadApprovals();
            } catch (e) {
              Alert.alert('Error', 'Could not reject. Try again.');
            }
          },
        },
      ],
    );
  };

  const revokeDirector = async (user: any) => {
    Alert.alert(
      '🚫 Revoke Director Access',
      `Remove casting director access from "${user.displayName || user.name}"? They will no longer be able to post auditions.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('users').doc(user.id).update({
                isApprovedDirector: false,
                castingDirectorVerified: false,
              });
              await firestore().collection('notifications').add({
                userId:    user.id,
                type:      'casting_rejected',
                title:     '⚠️ Director Access Revoked',
                message:   'Your casting director access has been revoked by admin.',
                read:      false,
                createdAt: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Done', 'Director access revoked.');
              loadUsers();
            } catch (e) {console.log(e);}
          },
        },
      ],
    );
  };

  const banUser = (user: any) => {
    const userName = user.displayName || user.name || user.email?.split('@')[0] || 'User';
    Alert.alert(
      user.isBanned ? '✅ Unban User' : '🚫 Ban User',
      `${user.isBanned ? 'Remove ban for' : 'Ban'} "${userName}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: user.isBanned ? 'Unban' : 'Ban', style: 'destructive',
          onPress: async () => {
            try {
              if (user.isBanned) {
                await firestore().collection('users').doc(user.id).update({isBanned: false});
                await firestore().collection('bannedUsers').doc(user.id).delete();
              } else {
                await firestore().collection('users').doc(user.id).update({isBanned: true, bannedAt: firestore.FieldValue.serverTimestamp()});
                await firestore().collection('bannedUsers').doc(user.id).set({userId: user.id, userEmail: user.email, userName, bannedAt: firestore.FieldValue.serverTimestamp()});
              }
              loadUsers();
            } catch (e) {console.log(e);}
          },
        },
      ],
    );
  };

  const deleteUserData = (user: any) => {
    const userName = user.displayName || user.name || user.email?.split('@')[0] || 'User';
    Alert.alert('🗑️ Delete User', `Permanently delete all data for "${userName}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete Everything', style: 'destructive',
        onPress: async () => {
          try {
            const batch = firestore().batch();
            batch.delete(firestore().collection('users').doc(user.id));
            const auditions = await firestore().collection('auditions').where('directorId', '==', user.id).get();
            auditions.docs.forEach(doc => batch.delete(doc.ref));
            const applications = await firestore().collection('applications').where('applicantId', '==', user.id).get();
            applications.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            Alert.alert('✅ Deleted');
            loadUsers();
          } catch (e) {Alert.alert('Error', 'Could not delete.');}
        },
      },
    ]);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      await firestore().collection('reports').doc(reportId).update({
        status: newStatus, reviewedAt: firestore.FieldValue.serverTimestamp(), reviewedBy: currentUser?.email,
      });
      loadReports();
    } catch (e) {console.log(e);}
  };

  const deleteContent = async (report: any) => {
    Alert.alert('⚠️ Delete Content', `Delete this ${report.contentType}?`, [
      {text: 'Cancel'},
      {
        text: 'Delete & Resolve', style: 'destructive',
        onPress: async () => {
          try {
            const col = report.contentType === 'audition' ? 'auditions' : report.contentType === 'film' ? 'films' : 'contests';
            await firestore().collection(col).doc(report.contentId).delete();
            await updateReportStatus(report.id, 'action_taken');
          } catch (e) {Alert.alert('Error');}
        },
      },
    ]);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
  };

  const filteredUsers = users.filter(u => {
    if (u.email === 'anilkumardevarakonda03@gmail.com') return false;
    const text = searchText.toLowerCase();
    if (!text) return true;
    const name = (u.displayName || u.fullName || u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(text) || email.includes(text);
  });

  const bannedUsers       = filteredUsers.filter(u => u.isBanned);
  const directorUsers     = filteredUsers.filter(u => !u.isBanned && u.isApprovedDirector);
  const activeUsers       = filteredUsers.filter(u => !u.isBanned && !u.isApprovedDirector);
  const pendingApprovals  = approvals.filter(a => a.status === 'pending');
  const reviewedApprovals = approvals.filter(a => a.status !== 'pending');

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0A0A0A'}}>
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9956C" colors={['#C9956C']} progressBackgroundColor="#1C1C1C" />}>

      <Text style={styles.pageTitle}>🛡️ Admin Dashboard</Text>
      <Text style={styles.pageSubtitle}>Manage your CineLink platform</Text>

      {/* MAIN TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mainTabScroll}>
        <View style={styles.mainTabRow}>
          {[
            {key: 'approvals', label: `📋 Applications${pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ''}`},
            {key: 'reports',   label: '🚩 Reports'},
            {key: 'users',     label: '👥 Users'},
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.mainTab, activeTab === tab.key && styles.mainTabActive]}
              onPress={() => setActiveTab(tab.key as any)}>
              <Text style={[styles.mainTabText, activeTab === tab.key && styles.mainTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ══════════ APPROVALS TAB ══════════ */}
      {activeTab === 'approvals' && (
        <View>
          {loading ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#C9956C" /></View>
          ) : approvals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No casting applications yet</Text>
              <Text style={styles.emptySubtitle}>When directors apply to post auditions, they'll appear here with their ID proof.</Text>
            </View>
          ) : (
            <>
              {pendingApprovals.length > 0 && (
                <>
                  <Text style={styles.userSectionTitle}>⏳ Pending Applications ({pendingApprovals.length})</Text>
                  {pendingApprovals.map(req => (
                    <View key={req.id} style={[styles.approvalCard, styles.approvalCardPending]}>

                      {/* HEADER */}
                      <TouchableOpacity
                        style={styles.approvalHeader}
                        onPress={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                        <View style={styles.approvalAvatar}>
                          <Text style={styles.approvalAvatarText}>{(req.userName || 'U').charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.approvalInfo}>
                          <Text style={styles.approvalName}>{req.userName}</Text>
                          <Text style={styles.approvalEmail}>{req.userEmail}</Text>
                          <Text style={styles.approvalCompany}>🏢 {req.companyName || 'N/A'}</Text>
                          <Text style={styles.approvalRole}>🎭 {req.role} · {req.yearsExperience || '?'} yrs exp</Text>
                          <Text style={styles.approvalPhone}>📱 {req.phone || 'No phone'}</Text>
                          <Text style={styles.approvalDate}>{formatDate(req.createdAt)}</Text>
                        </View>
                        <Text style={styles.expandIcon}>{expandedId === req.id ? '▲' : '▼'}</Text>
                      </TouchableOpacity>

                      {/* EXPANDED DETAILS */}
                      {expandedId === req.id && (
                        <View style={styles.expandedSection}>

                          {req.message ? (
                            <View style={styles.approvalMessage}>
                              <Text style={styles.approvalMessageLabel}>Why they want to post:</Text>
                              <Text style={styles.approvalMessageText}>{req.message}</Text>
                            </View>
                          ) : null}

                          {req.experience ? (
                            <View style={styles.approvalMessage}>
                              <Text style={styles.approvalMessageLabel}>Experience:</Text>
                              <Text style={styles.approvalMessageText}>{req.experience}</Text>
                            </View>
                          ) : null}

                          {req.portfolio ? (
                            <TouchableOpacity onPress={() => Linking.openURL(req.portfolio)}>
                              <Text style={styles.approvalPortfolio}>🔗 Portfolio: {req.portfolio}</Text>
                            </TouchableOpacity>
                          ) : null}

                          {/* ID PROOF */}
                          <Text style={styles.approvalMessageLabel}>
                            🪪 ID Proof ({req.idType || 'Unknown'}):
                          </Text>
                          {req.idProofUrl ? (
                            <TouchableOpacity onPress={() => Linking.openURL(req.idProofUrl)}>
                              <Image source={{uri: req.idProofUrl}} style={styles.idProofImage} resizeMode="cover" />
                              <Text style={styles.viewFullImage}>Tap to view full image →</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.noIdText}>❌ No ID proof uploaded</Text>
                          )}

                          {/* COMPANY DOC */}
                          {req.companyDocUrl ? (
                            <>
                              <Text style={[styles.approvalMessageLabel, {marginTop: 12}]}>🏢 Company Document:</Text>
                              <TouchableOpacity onPress={() => Linking.openURL(req.companyDocUrl)}>
                                <Image source={{uri: req.companyDocUrl}} style={styles.idProofImage} resizeMode="cover" />
                                <Text style={styles.viewFullImage}>Tap to view full image →</Text>
                              </TouchableOpacity>
                            </>
                          ) : null}

                          {/* PHONE VERIFICATION STATUS */}
                          <View style={[styles.approvalMessage, {marginTop: 12, borderLeftWidth: 3, borderLeftColor: req.phoneVerified ? '#4ADE80' : '#FBBF24'}]}>
                            <Text style={styles.approvalMessageLabel}>Phone Verification:</Text>
                            <Text style={[styles.approvalMessageText, {color: req.phoneVerified ? '#4ADE80' : '#FBBF24'}]}>
                              {req.phoneVerified
                                ? `✅ ${req.phone} — Call to verify before approving`
                                : '⚠️ Phone not registered'}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.viewProfileBtn}
                            onPress={() => navigation.navigate('PublicProfile', {userId: req.userId})}>
                            <Text style={styles.viewProfileBtnText}>👤 View Full Profile</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={styles.approvalActions}>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => approveRequest(req)}>
                          <Text style={styles.approveBtnText}>✅ Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(req)}>
                          <Text style={styles.rejectBtnText}>❌ Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {reviewedApprovals.length > 0 && (
                <>
                  <Text style={styles.userSectionTitle}>📁 Reviewed ({reviewedApprovals.length})</Text>
{reviewedApprovals.map(req => (
  <TouchableOpacity
    key={req.id}
    style={[styles.approvalCard, req.status === 'approved' ? styles.approvalCardApproved : styles.approvalCardRejected]}
    onPress={() => navigation.navigate('PublicProfile', { userId: req.userId })}
    activeOpacity={0.8}
  >
    <View style={styles.approvalHeader}>

                        <View style={styles.approvalAvatar}>
                          <Text style={styles.approvalAvatarText}>{(req.userName || 'U').charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.approvalInfo}>
                          <Text style={styles.approvalName}>{req.userName}</Text>
                          <Text style={styles.approvalEmail}>{req.userEmail}</Text>
                          <Text style={styles.approvalCompany}>🏢 {req.companyName || 'N/A'}</Text>
                          <View style={[styles.statusPill, req.status === 'approved' ? styles.statusApproved : styles.statusRejected]}>
                            <Text style={styles.statusPillText}>{req.status === 'approved' ? '✅ Approved' : '❌ Rejected'}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}

      {/* ══════════ REPORTS TAB ══════════ */}
      {activeTab === 'reports' && (
        <View>
          <View style={styles.filterRow}>
            {Object.entries(STATUS_CONFIG).map(([status, config]: any) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterBtn, filter === status && styles.filterBtnActive]}
                onPress={() => setFilter(status)}>
                <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>{config.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {loading ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#C9956C" /></View>
          ) : reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>No {filter} reports</Text>
            </View>
          ) : (
            reports.map((report: any) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.badgeRow}>
                  <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{report.contentType?.toUpperCase()}</Text></View>
                  <Text style={styles.dateText}>{formatDate(report.createdAt)}</Text>
                </View>
                <Text style={styles.reportTitle}>{report.contentTitle}</Text>
                <Text style={styles.reporterText}>Reported by: {report.reportedByEmail}</Text>
                {filter === 'pending' && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteContent(report)}>
                      <Text style={styles.deleteBtnText}>🗑️ Delete Content</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dismissBtn} onPress={() => updateReportStatus(report.id, 'dismissed')}>
                      <Text style={styles.dismissBtnText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* ══════════ USERS TAB ══════════ */}
      {activeTab === 'users' && (
        <View>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search by name or email..."
            placeholderTextColor="#A09080"
            value={searchText}
            onChangeText={setSearchText}
          />
          {loading ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#C9956C" /></View>
          ) : (
            <>
              {/* APPROVED DIRECTORS */}
              {directorUsers.length > 0 && (
                <>
                  <Text style={styles.userSectionTitle}>🎬 Verified Casting Directors ({directorUsers.length})</Text>
                  {directorUsers.map(user => (
                    <View key={user.id} style={[styles.userCard, styles.userCardDirector]}>
                      <View style={[styles.userAvatar, {backgroundColor: '#C9956C'}]}><Text style={styles.userAvatarText}>{(user.displayName || user.name || user.email || 'U').charAt(0).toUpperCase()}</Text></View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.displayName || user.fullName || user.name || user.email?.split('@')[0]}</Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                        <Text style={styles.approvedBadge}>✅ Verified Casting Director</Text>
                        {user.companyName ? <Text style={styles.userRole}>🏢 {user.companyName}</Text> : null}
                      </View>
                      <View style={styles.userActions}>
                        <TouchableOpacity style={styles.revokeBtn} onPress={() => revokeDirector(user)}>
                          <Text style={styles.revokeBtnText}>Revoke</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* BANNED */}
              {bannedUsers.length > 0 && (
                <>
                  <Text style={styles.userSectionTitle}>🚫 Banned Users ({bannedUsers.length})</Text>
                  {bannedUsers.map(user => (
                    <View key={user.id} style={[styles.userCard, styles.userCardBanned]}>
                      <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{(user.displayName || user.name || user.email || 'U').charAt(0).toUpperCase()}</Text></View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.displayName || user.fullName || user.name || user.email?.split('@')[0]}</Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                      </View>
                      <View style={styles.userActions}>
                        <TouchableOpacity style={styles.unbanBtn} onPress={() => banUser(user)}>
                          <Text style={styles.unbanBtnText}>Unban</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* ACTIVE USERS */}
              <Text style={styles.userSectionTitle}>✅ Active Users ({activeUsers.length})</Text>
              {activeUsers.map(user => (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{(user.displayName || user.name || user.email || 'U').charAt(0).toUpperCase()}</Text></View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.displayName || user.fullName || user.name || user.email?.split('@')[0]}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userRole}>🎭 {user.role || 'User'}</Text>
                    {user.verificationStatus === 'verified' && <Text style={styles.verifiedBadge2}>🏅 Verified</Text>}
                  </View>
                  <View style={styles.userActions}>
                    <TouchableOpacity style={styles.banBtn} onPress={() => banUser(user)}>
                      <Text style={styles.banBtnText}>🚫 Ban</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteUserBtn} onPress={() => deleteUserData(user)}>
                      <Text style={styles.deleteUserBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      <View style={{height: 60}} />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   {flex: 1, backgroundColor: '#0A0A0A', padding: 16},
  pageTitle:   {color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 10},
  pageSubtitle:{color: '#A09080', fontSize: 14, marginBottom: 16},

  mainTabScroll:{marginBottom: 16},
  mainTabRow:  {flexDirection: 'row', gap: 8},
  mainTab:     {paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#1C1C1C', borderWidth: 1, borderColor: '#2A2A2A'},
  mainTabActive:{backgroundColor: '#C9956C', borderColor: '#C9956C'},
  mainTabText: {color: '#A09080', fontSize: 13, fontWeight: '600'},
  mainTabTextActive:{color: '#FFFFFF', fontWeight: 'bold'},

  filterRow:   {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16},
  filterBtn:   {backgroundColor: '#1C1C1C', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#2A2A2A'},
  filterBtnActive:{backgroundColor: '#C9956C', borderColor: '#C9956C'},
  filterText:  {color: '#A09080', fontSize: 12, fontWeight: '600'},
  filterTextActive:{color: '#FFFFFF'},

  loadingContainer:{alignItems: 'center', paddingVertical: 60},
  emptyState:  {alignItems: 'center', paddingVertical: 60},
  emptyIcon:   {fontSize: 48, marginBottom: 12},
  emptyTitle:  {color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 6},
  emptySubtitle:{color: '#A09080', fontSize: 14, textAlign: 'center', paddingHorizontal: 20},

  searchInput: {backgroundColor: '#1C1C1C', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, color: '#FFFFFF', fontSize: 14, borderWidth: 1, borderColor: '#2A2A2A', marginBottom: 16},
  userSectionTitle:{color: '#C9956C', fontSize: 13, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5},

  userCard:        {backgroundColor: '#1C1C1C', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A', flexDirection: 'row', alignItems: 'center'},
  userCardBanned:  {borderColor: '#DC2626', backgroundColor: '#2A0A0A'},
  userCardDirector:{borderColor: '#C9956C', backgroundColor: '#1A1208'},
  userAvatar:      {width: 48, height: 48, borderRadius: 24, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', marginRight: 12},
  userAvatarText:  {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
  userInfo:        {flex: 1},
  userName:        {color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 2},
  userEmail:       {color: '#A09080', fontSize: 12, marginBottom: 2},
  userRole:        {color: '#A09080', fontSize: 11},
  approvedBadge:   {color: '#4ADE80', fontSize: 11, marginTop: 2},
  verifiedBadge2:  {color: '#FBBF24', fontSize: 11, marginTop: 2},
  userActions:     {alignItems: 'flex-end', gap: 6},
  banBtn:          {backgroundColor: '#450A0A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#DC2626'},
  banBtnText:      {color: '#FCA5A5', fontSize: 12, fontWeight: 'bold'},
  unbanBtn:        {backgroundColor: '#064E3B', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#4ADE80'},
  unbanBtnText:    {color: '#4ADE80', fontSize: 12, fontWeight: 'bold'},
  revokeBtn:       {backgroundColor: '#451A03', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#C9956C'},
  revokeBtnText:   {color: '#C9956C', fontSize: 12, fontWeight: 'bold'},
  deleteUserBtn:   {backgroundColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6},
  deleteUserBtnText:{fontSize: 16},

  // Approval cards
  approvalCard:         {backgroundColor: '#1C1C1C', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#2A2A2A'},
  approvalCardPending:  {borderColor: '#FBBF24'},
  approvalCardApproved: {borderColor: '#4ADE80'},
  approvalCardRejected: {borderColor: '#A09080'},
  approvalHeader:       {flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start'},
  approvalAvatar:       {width: 52, height: 52, borderRadius: 26, backgroundColor: '#C9956C', justifyContent: 'center', alignItems: 'center'},
  approvalAvatarText:   {color: '#FFFFFF', fontSize: 22, fontWeight: 'bold'},
  approvalInfo:         {flex: 1},
  approvalName:         {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 2},
  approvalEmail:        {color: '#A09080', fontSize: 12, marginBottom: 2},
  approvalCompany:      {color: '#C9956C', fontSize: 12, marginBottom: 2},
  approvalRole:         {color: '#A09080', fontSize: 12, marginBottom: 2},
  approvalPhone:        {color: '#4ADE80', fontSize: 12, marginBottom: 2},
  approvalDate:         {color: '#A09080', fontSize: 11},
  expandIcon:           {color: '#C9956C', fontSize: 16},

  expandedSection:      {marginBottom: 12},
  approvalMessage:      {backgroundColor: '#2A2A2A', borderRadius: 10, padding: 12, marginBottom: 8},
  approvalMessageLabel: {color: '#C9956C', fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase'},
  approvalMessageText:  {color: '#A09080', fontSize: 13, lineHeight: 20},
  approvalPortfolio:    {color: '#38BDF8', fontSize: 12, marginBottom: 8},

  idProofImage:   {width: '100%', height: 180, borderRadius: 12, marginTop: 8, marginBottom: 4},
  viewFullImage:  {color: '#38BDF8', fontSize: 11, textAlign: 'right', marginBottom: 8},
  noIdText:       {color: '#EF4444', fontSize: 13, marginBottom: 8},

  viewProfileBtn:     {backgroundColor: '#2A2A2A', borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#C9956C'},
  viewProfileBtnText: {color: '#C9956C', fontSize: 13, fontWeight: '600'},
  approvalActions:    {flexDirection: 'row', gap: 10},
  approveBtn:         {flex: 1, backgroundColor: '#064E3B', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#4ADE80'},
  approveBtnText:     {color: '#4ADE80', fontWeight: 'bold', fontSize: 14},
  rejectBtn:          {flex: 1, backgroundColor: '#450A0A', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#DC2626'},
  rejectBtnText:      {color: '#FCA5A5', fontWeight: 'bold', fontSize: 14},
  statusPill:         {borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 4},
  statusApproved:     {backgroundColor: '#064E3B'},
  statusRejected:     {backgroundColor: '#450A0A'},
  statusPillText:     {color: '#FFFFFF', fontSize: 11, fontWeight: 'bold'},

  reportCard:    {backgroundColor: '#1C1C1C', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#2A2A2A'},
  badgeRow:      {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  typeBadge:     {backgroundColor: '#2A2A2A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3},
  typeBadgeText: {color: '#A09080', fontSize: 10, fontWeight: '700', letterSpacing: 1},
  dateText:      {color: '#A09080', fontSize: 11},
  reportTitle:   {color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 10},
  reporterText:  {color: '#A09080', fontSize: 12, marginBottom: 12},
  actionsRow:    {flexDirection: 'row', gap: 10},
  deleteBtn:     {flex: 1, backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#DC2626'},
  deleteBtnText: {color: '#FCA5A5', fontWeight: '700', fontSize: 13},
  dismissBtn:    {flex: 1, backgroundColor: '#2A2A2A', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333333'},
  dismissBtnText:{color: '#A09080', fontWeight: '600', fontSize: 13},
});