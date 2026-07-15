/**
 * CineLink Typesense Sync Cloud Function
 *
 * Deploy this Cloud Function to automatically sync Firestore collections
 * to Typesense for full-text search.
 *
 * Deployment:
 *   firebase deploy --only functions:syncUserToTypesense,syncAuditionToTypesense
 */

import {onDocumentWritten} from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

interface TypesenseDoc {
  uid: string;
  fullName: string;
  displayName: string;
  bio: string;
  location: string;
  role: string;
  profileTags: string[];
  photoUrl: string;
  createdAt: number;
}

function getTypesenseClient() {
  const Typesense = require('typesense');
  return new Typesense.Client({
    nodes: [{
      host: process.env.TYPESENSE_HOST || '',
      port: parseInt(process.env.TYPESENSE_PORT || '443', 10),
      protocol: process.env.TYPESENSE_PROTOCOL || 'https',
    }],
    apiKey: process.env.TYPESENSE_API_KEY || '',
    connectionTimeoutSeconds: 5,
  });
}

export const syncUserToTypesense = onDocumentWritten(
  {document: 'users/{userId}', region: 'asia-south1'},
  async (event) => {
    const client = getTypesenseClient();
    if (!client) return;

    const {userId} = event.params;
    const data = event.data?.after?.data();
    const prevData = event.data?.before?.data();

    if (!data) {
      try { await client.collections('users').documents(userId).delete(); } catch {}
      return;
    }

    const doc: TypesenseDoc = {
      uid: userId,
      fullName: data.fullName || data.displayName || data.name || '',
      displayName: data.displayName || data.fullName || data.name || '',
      bio: data.bio || '',
      location: data.location || '',
      role: data.role || '',
      profileTags: data.profileTags || [],
      photoUrl: data.photoUrl || data.photoURL || '',
      createdAt: (data.createdAt?.toMillis?.() || Date.now()),
    };

    try {
      await client.collections('users').documents().upsert(doc);
    } catch (e) {
      console.error('[Typesense] Sync error for user', userId, e);
    }
  }
);

export const syncAuditionToTypesense = onDocumentWritten(
  {document: 'auditions/{auditionId}', region: 'asia-south1'},
  async (event) => {
    const client = getTypesenseClient();
    if (!client) return;

    const {auditionId} = event.params;
    const data = event.data?.after?.data();
    const prevData = event.data?.before?.data();

    if (!data) {
      try { await client.collections('auditions').documents(auditionId).delete(); } catch {}
      return;
    }

    const doc = {
      id: auditionId,
      title: data.title || '',
      description: data.description || '',
      location: data.location || '',
      role: data.role || '',
      category: data.category || '',
      language: data.language || '',
      posterUrl: data.posterUrl || '',
      createdAt: (data.createdAt?.toMillis?.() || Date.now()),
    };

    try {
      await client.collections('auditions').documents().upsert(doc);
    } catch (e) {
      console.error('[Typesense] Sync error for audition', auditionId, e);
    }
  }
);
