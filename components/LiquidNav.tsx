import React from 'react';
import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';

const TABS = [
  {icon: '🏠', label: 'Home', screen: 'Home'},
  {icon: '🏆', label: 'Contests', screen: 'Contests'},
  {icon: '🎥', label: 'Crew', screen: 'Crew'},
  {icon: '✨', label: 'Discover', screen: 'Discover'},
  {icon: '👤', label: 'Profile', screen: 'Profile'},
];

export function LiquidNav({navigation, activeTab}: any) {
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: '#0A0A0A',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(201,149,108,0.45)',
      paddingBottom: 10,
      paddingTop: 8,
    }}>
      {TABS.map((tab, i) => (
        <TouchableOpacity
          key={tab.screen}
          onPress={() => navigation.navigate(tab.screen)}
          activeOpacity={0.7}
          style={{flex: 1, alignItems: 'center', paddingVertical: 4}}>
          <Text style={{fontSize: 22}}>{tab.icon}</Text>
          <Text style={{
            fontSize: 9,
            marginTop: 3,
            color: activeTab === i ? '#C9956C' : '#5C5048',
            fontWeight: activeTab === i ? '700' : '400',
          }}>{tab.label}</Text>
          {activeTab === i && (
            <View style={{
              width: 4, height: 4, borderRadius: 2,
              backgroundColor: '#C9956C',
              marginTop: 2,
            }} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
