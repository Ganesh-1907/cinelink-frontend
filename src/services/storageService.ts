import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = { JWT: 'cinelink_jwt', USER: 'cinelink_user' };

export interface StoredUser {
  id: string; email?: string; fullName?: string; displayName?: string;
  photoUrl?: string; role?: string; isAdmin: boolean;
  isApprovedDirector: boolean; premiumTier: string;
}

export async function saveAuth(token: string, user: StoredUser) {
  await AsyncStorage.multiSet([
    [KEYS.JWT, token],
    [KEYS.USER, JSON.stringify(user)],
  ]);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.JWT);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuth() {
  await AsyncStorage.multiRemove([KEYS.JWT, KEYS.USER]);
}
