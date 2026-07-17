import api, { setJwtToken } from '../api/client';
import { saveAuth, getToken, getStoredUser, clearAuth, StoredUser } from './storageService';

export async function signup(email: string, password: string, fullName?: string): Promise<StoredUser> {
  const res = await api.post<{ token: string; user: any }>('/auth/signup', { email, password, fullName }, false);
  const user = mapUser(res.user);
  await saveAuth(res.token, user);
  setJwtToken(res.token);
  return user;
}

export async function login(email: string, password: string): Promise<StoredUser> {
  const res = await api.post<{ token: string; user: any }>('/auth/login', { email, password }, false);
  const user = mapUser(res.user);
  await saveAuth(res.token, user);
  setJwtToken(res.token);
  return user;
}

export async function googleSignIn(idToken: string): Promise<StoredUser> {
  const res = await api.post<{ token: string; user: any }>('/auth/google', { idToken }, false);
  const user = mapUser(res.user);
  await saveAuth(res.token, user);
  setJwtToken(res.token);
  return user;
}

export async function sendEmailOtp(email: string) {
  return api.post('/auth/send-otp', { email }, true);
}

export async function verifyEmailOtp(email: string, otp: string): Promise<StoredUser> {
  const res = await api.post<{ token: string; user: any }>('/auth/verify-otp', { email, otp }, true);
  const user = mapUser(res.user);
  await saveAuth(res.token, user);
  setJwtToken(res.token);
  return user;
}

export async function loadSavedSession(): Promise<StoredUser | null> {
  const token = await getToken();
  if (!token) return null;
  setJwtToken(token);
  
  try {
    const res = await api.get<{ user: any }>('/auth/me');
    const user = mapUser(res.user);
    await saveAuth(token, user);
    return user;
  } catch {
    await clearAuth();
    setJwtToken(null);
    return null;
  }
}

export async function logout() {
  await clearAuth();
  setJwtToken(null);
}

function mapUser(u: any): StoredUser {
  return {
    id: u.id || u._id || '',
    email: u.email,
    fullName: u.fullName || u.displayName || u.name || '',
    displayName: u.displayName || u.fullName || '',
    photoUrl: u.photoUrl || u.photoURL || '',
    role: u.role || 'Actor',
    isAdmin: u.isAdmin === true,
    isApprovedDirector: u.isApprovedDirector === true,
    premiumTier: u.premiumTier || 'none',
  };
}
