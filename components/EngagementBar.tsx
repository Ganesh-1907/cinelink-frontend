import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import api from '../src/api/client';

export default function EngagementBar({item, userId, onComment}: any) {
  const toggleLike = async () => {
    try {
      const endpoint = item?.directorId ? `/auditions/${item._id||item.id}/like` : `/films/${item._id||item.id}/like`;
      await api.post(endpoint);
    } catch {}
  };

  return (
    <View style={{flexDirection:'row', gap:16, paddingVertical:8}}>
      <TouchableOpacity onPress={toggleLike} style={{flexDirection:'row', gap:4}}>
        <Text>❤️</Text>
        <Text style={{color:'#A09080'}}>{item?.likes || 0}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onComment} style={{flexDirection:'row', gap:4}}>
        <Text>💬</Text>
        <Text style={{color:'#A09080'}}>{item?.commentsCount || 0}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{flexDirection:'row', gap:4}}>
        <Text>👁</Text>
        <Text style={{color:'#A09080'}}>{item?.views || 0}</Text>
      </TouchableOpacity>
    </View>
  );
}
