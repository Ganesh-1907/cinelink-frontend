import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, SafeAreaView, StatusBar} from 'react-native';
import {getAdminStats, getAdminReports, updateReport, getAdminUsers, banUser, updateUserByAdmin, getVerificationRequests} from '../src/services/dataService';

type Tab = 'reports' | 'users' | 'approvals';

export default function AdminReportsScreen({navigation}: any) {
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<any[]>([]); const [users, setUsers] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]); const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, r, u, v] = await Promise.all([
        getAdminStats().catch(() => ({})),
        getAdminReports().catch(() => ({reports:[]})),
        getAdminUsers().catch(() => ({users:[]})),
        getVerificationRequests().catch(() => ({requests:[]})),
      ]);
      setStats(s); setReports(r.reports||[]); setUsers(u.users||[]); setVerifications(v.requests||[]);
    } catch {} finally { setLoading(false); }
  };

  const handleReportAction = async (id: string, status: string) => {
    try { await updateReport(id, status); loadAll(); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleBan = async (userId: string) => {
    try { await banUser(userId); loadAll(); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleVerify = async (userId: string, status: string) => {
    try { await updateUserByAdmin(userId, {verificationStatus: status, isApprovedDirector: status === 'approved'}); loadAll(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const tabs = [
    {key:'reports' as Tab, icon:'🚨', label:'Reports', count: reports.length},
    {key:'users' as Tab, icon:'👥', label:'Users', count: users.length},
    {key:'approvals' as Tab, icon:'✅', label:'Verifications', count: verifications.length},
  ];

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <StatusBar barStyle="light-content" />
      <View style={{padding:16}}>
        <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:16}}>🛡️ Admin Dashboard</Text>
        <View style={{flexDirection:'row', gap:8, marginBottom:16}}>
          {tabs.map(t => (
            <TouchableOpacity key={t.key} onPress={()=>setActiveTab(t.key)} style={{flex:1, paddingVertical:10, borderRadius:12, alignItems:'center', backgroundColor:activeTab===t.key?'#C9956C':'#1C1C1C'}}>
              <Text style={{color:activeTab===t.key?'#FFF':'#A09080', fontSize:13, fontWeight:'600'}}>{t.icon} {t.label} ({t.count})</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? <ActivityIndicator color="#C9956C" style={{flex:1}} /> : (
        activeTab === 'reports' ? (
          <FlatList data={reports} keyExtractor={i=>i._id||i.id} contentContainerStyle={{paddingHorizontal:16}}
            ListEmptyComponent={<Text style={{color:'#A09080',textAlign:'center',marginTop:20}}>No reports.</Text>}
            renderItem={({item}) => (
              <View style={{backgroundColor:'#1C1C1C', borderRadius:12, padding:14, marginBottom:8, borderWidth:1, borderColor:'#2A2A2A'}}>
                <Text style={{color:'#FFF', fontWeight:'600'}}>{item.reason}</Text>
                <Text style={{color:'#A09080', fontSize:13, marginTop:4}}>Status: {item.status}</Text>
                <View style={{flexDirection:'row', gap:8, marginTop:8}}>
                  {['reviewed','dismissed','action_taken'].map(s => (
                    <TouchableOpacity key={s} onPress={()=>handleReportAction(item._id||item.id, s)} style={{paddingVertical:6, paddingHorizontal:12, borderRadius:8, backgroundColor: item.status===s ? '#C9956C' : '#2A2A2A'}}>
                      <Text style={{color:'#FFF', fontSize:11}}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          />
        ) : activeTab === 'users' ? (
          <FlatList data={users} keyExtractor={i=>i._id||i.id} contentContainerStyle={{paddingHorizontal:16}}
            renderItem={({item}) => (
              <View style={{flexDirection:'row', alignItems:'center', backgroundColor:'#1C1C1C', padding:14, borderRadius:12, marginBottom:8, borderWidth:1, borderColor:'#2A2A2A'}}>
                <View style={{flex:1}}>
                  <Text style={{color:'#FFF', fontWeight:'600'}}>{item.fullName||item.email||'User'}</Text>
                  <Text style={{color:'#A09080', fontSize:12}}>{item.role || 'Actor'} · {item.email||''}</Text>
                </View>
                <TouchableOpacity onPress={()=>handleBan(item._id||item.id)} style={{paddingVertical:6, paddingHorizontal:12, borderRadius:8, backgroundColor:'rgba(239,68,68,0.2)'}}>
                  <Text style={{color:'#EF4444', fontSize:12}}>Ban</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        ) : (
          <FlatList data={verifications} keyExtractor={i=>i._id||i.id} contentContainerStyle={{paddingHorizontal:16}}
            ListEmptyComponent={<Text style={{color:'#A09080',textAlign:'center',marginTop:20}}>No requests.</Text>}
            renderItem={({item}) => (
              <View style={{backgroundColor:'#1C1C1C', borderRadius:12, padding:14, marginBottom:8, borderWidth:1, borderColor:'#2A2A2A'}}>
                <Text style={{color:'#FFF', fontWeight:'600'}}>{item.fullName||item.email||'User'}</Text>
                <Text style={{color:'#A09080', fontSize:12, marginBottom:8}}>Verification: {item.verificationStatus || 'pending'}</Text>
                <View style={{flexDirection:'row', gap:8}}>
                  <TouchableOpacity onPress={()=>handleVerify(item._id||item.id,'approved')} style={{paddingVertical:6, paddingHorizontal:16, borderRadius:8, backgroundColor:'rgba(74,222,128,0.2)'}}>
                    <Text style={{color:'#4ADE80', fontSize:13}}>✅ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={()=>handleVerify(item._id||item.id,'rejected')} style={{paddingVertical:6, paddingHorizontal:16, borderRadius:8, backgroundColor:'rgba(239,68,68,0.2)'}}>
                    <Text style={{color:'#EF4444', fontSize:13}}>❌ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )
      )}
    </SafeAreaView>
  );
}
