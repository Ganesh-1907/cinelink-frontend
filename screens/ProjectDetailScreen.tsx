import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView} from 'react-native';
import {getProject, joinProject} from '../src/services/dataService';

export default function ProjectDetailScreen({route, navigation}: any) {
  const {projectId} = route?.params || {};
  const [project, setProject] = useState<any>(null); const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => { if (projectId) loadProject(); else setLoading(false); }, [projectId]);

  const loadProject = async () => {
    try { const r = await getProject(projectId); setProject(r.project); }
    catch {} finally { setLoading(false); }
  };

  const handleJoin = async () => {
    setJoining(true);
    try { await joinProject(projectId); Alert.alert('Joined!','You are now a member.'); loadProject(); }
    catch (e: any) {Alert.alert('Error', e.message);}
    finally {setJoining(false);}
  };

  if (loading) return <SafeAreaView style={{flex:1,backgroundColor:'#0A0A0A',justifyContent:'center',alignItems:'center'}}><ActivityIndicator color="#C9956C" /></SafeAreaView>;

  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#0A0A0A'}}>
      <ScrollView contentContainerStyle={{padding:20}}>
        {project ? (
          <>
            <Text style={{fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:8}}>{project.title}</Text>
            <Text style={{color:'#A09080', fontSize:14, marginBottom:16}}>{project.type || 'Project'}</Text>
            {project.description ? <Text style={{color:'#FFF', fontSize:15, lineHeight:24, marginBottom:20}}>{project.description}</Text> : null}
            <Text style={{color:'#A09080', fontSize:13, marginBottom:20}}>👥 {project.members?.length || 0} members</Text>
            <TouchableOpacity onPress={handleJoin} disabled={joining} style={{backgroundColor:'#C9956C',paddingVertical:14,borderRadius:12,alignItems:'center',opacity:joining?0.6:1}}>
              {joining ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF',fontSize:16,fontWeight:'bold'}}>Join Project</Text>}
            </TouchableOpacity>
          </>
        ) : <Text style={{color:'#A09080', textAlign:'center'}}>Project not found.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
