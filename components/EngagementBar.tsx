import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Share} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface Props {
  auditionId: string;
  likes: number;
  likedBy: string[];
  commentCount?: number;
  views?: number;
  shareTitle: string;
}

export default function EngagementBar({
  auditionId,
  likes,
  likedBy,
  commentCount = 0,
  views = 0,
  shareTitle,
}: Props) {
  const currentUser = auth().currentUser;
  const isLiked = currentUser ? (likedBy || []).includes(currentUser.uid) : false;

  const handleLike = async () => {
    if (!currentUser) return;
    try {
      await firestore().collection('auditions').doc(auditionId).update({
        likes: firestore.FieldValue.increment(isLiked ? -1 : 1),
        likedBy: isLiked
          ? firestore.FieldValue.arrayRemove(currentUser.uid)
          : firestore.FieldValue.arrayUnion(currentUser.uid),
      });
    } catch (e) {
      console.log('EngagementBar like error:', e);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎭 Check out this audition on CineLink: ${shareTitle}`,
        title: shareTitle,
      });
    } catch (e) {
      console.log('EngagementBar share error:', e);
    }
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.btn} onPress={handleLike} activeOpacity={0.7}>
        <Text style={[styles.btnText, isLiked && styles.likedText]}>
          {isLiked ? '❤️' : '🤍'} {likes}
        </Text>
      </TouchableOpacity>
      <View style={styles.divider} />
      <View style={styles.btn}>
        <Text style={styles.btnText}>💬 {commentCount}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.btn}>
        <Text style={styles.btnText}>👁 {views}</Text>
      </View>
      <View style={styles.divider} />
      <TouchableOpacity style={styles.btn} onPress={handleShare} activeOpacity={0.7}>
        <Text style={styles.btnText}>↗ Share</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    marginTop: 10,
    paddingTop: 10,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: '#2A2A2A',
  },
  btnText: {
    color: '#A09080',
    fontSize: 13,
    fontWeight: '600',
  },
  likedText: {
    color: '#C9956C',
  },
});
