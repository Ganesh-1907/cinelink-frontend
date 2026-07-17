import api from '../api/client';

// ── Users ──
export const getProfile = () => api.get<any>('/users/profile');
export const updateProfile = (data: any) => api.put<any>('/users/profile', data);
export const searchUsers = (query?: string, role?: string) => api.get<any>(`/users/search?query=${query || ''}&role=${role || 'All'}`);
export const getUser = (userId: string) => api.get<any>(`/users/${userId}`);
export const followUser = (targetUserId: string) => api.post<any>('/users/follow', { targetUserId });
export const getFollowers = (userId: string, type = 'followers') => api.get<any>(`/users/${userId}/followers?type=${type}`);

// ── Auditions ──
export const getAuditions = () => api.get<any>('/auditions');
export const getAudition = (id: string) => api.get<any>(`/auditions/${id}`);
export const createAudition = (data: any) => api.post<any>('/auditions', data);
export const likeAudition = (id: string) => api.post<any>(`/auditions/${id}/like`);
export const commentOnAudition = (id: string, data: any) => api.post<any>(`/auditions/${id}/comment`, data);

// ── Films ──
export const getFilms = () => api.get<any>('/films');
export const getFilm = (id: string) => api.get<any>(`/films/${id}`);
export const createFilm = (data: any) => api.post<any>('/films', data);
export const likeFilm = (id: string) => api.post<any>(`/films/${id}/like`);
export const deleteFilm = (id: string) => api.delete(`/films/${id}`);

// ── Contests ──
export const getContests = () => api.get<any>('/contests');
export const getContest = (id: string) => api.get<any>(`/contests/${id}`);
export const createContest = (data: any) => api.post<any>('/contests', data);
export const enterContest = (id: string, data: any) => api.post<any>(`/contests/${id}/enter`, data);

// ── Reels ──
export const getReels = () => api.get<any>('/reels');
export const createReel = (data: any) => api.post<any>('/reels', data);
export const likeReel = (id: string) => api.post<any>(`/reels/${id}/like`);

// ── Reports ──
export const createReport = (data: any) => api.post<any>('/reports', data);
export const getMyReports = () => api.get<any>('/reports');

// ── Projects ──
export const getProjects = () => api.get<any>('/projects');
export const getProject = (id: string) => api.get<any>(`/projects/${id}`);
export const createProject = (data: any) => api.post<any>('/projects', data);
export const joinProject = (id: string) => api.post<any>(`/projects/${id}/join`);

// ── Crew Marketplace ──
export const getCrewPosts = () => api.get<any>('/crew-marketplace');
export const createCrewPost = (data: any) => api.post<any>('/crew-marketplace', data);

// ── Chats ──
export const getChats = () => api.get<any>('/chat/list');
export const startChat = (otherUserId: string) => api.post<any>('/chat/start', { otherUserId });
export const getMessages = (chatId: string) => api.get<any>(`/chat/${chatId}/messages`);
export const sendMessage = (chatId: string, text: string, type = 'text') => api.post<any>(`/chat/${chatId}/messages`, { text, type });
export const uploadChatImage = (chatId: string, imageUrl: string) => api.post<any>(`/chat/${chatId}/messages`, { type: 'image', imageUrl });
export const deleteMessage = (chatId: string, msgId: string) => api.delete(`/chat/${chatId}/messages/${msgId}`);

// ── Notifications ──
export const getNotifications = () => api.get<any>('/notifications');
export const markNotificationRead = (id: string) => api.put<any>(`/notifications/${id}/read`);
export const sendNotification = (userId: string, title: string, message?: string, type?: string) =>
  api.post<any>('/notifications/push', { userId, title, message, type });

// ── Payments ──
export const createOrder = (amount: number, notes?: any) => api.post<any>('/payments/create-order', { amount, notes });
export const createSubscription = (tier: string) => api.post<any>('/payments/create-subscription', { tier });
export const verifyPayment = (data: any) => api.post<any>('/payments/verify-payment', data);
export const savePayment = (data: any) => api.post<any>('/payments/save-payment', data);
export const checkDuplicatePayment = (itemId: string, purpose: string) =>
  api.get<any>(`/payments/check-duplicate?itemId=${itemId}&purpose=${purpose}`);
export const getPaymentHistory = () => api.get<any>('/payments/history');

// ── Premium ──
export const getPremiumStatus = () => api.get<any>('/premium/active');
export const cancelSubscription = () => api.post<any>('/premium/cancel');
export const getSubscriptionHistory = () => api.get<any>('/premium/history');

// ── Crew Search ──
export const searchCrew = (query?: string, role?: string, limit = 50) =>
  api.get<any>(`/crew/search?query=${query || ''}&role=${role || ''}&limit=${limit}`);
export const getSuggestedUsers = () => api.get<any>('/crew/suggested');

// ── TMDB ──
export const searchMovies = (query: string) => api.get<any>(`/tmdb/search/${query}`);
export const getTrendingMovies = () => api.get<any>('/tmdb/trending');
export const getMovieDetails = (movieId: number) => api.get<any>(`/tmdb/movie/${movieId}`);

// ── Admin ──
export const getAdminStats = () => api.get<any>('/admin/stats');
export const getAdminReports = () => api.get<any>('/admin/reports');
export const updateReport = (reportId: string, status: string) => api.put<any>(`/admin/reports/${reportId}`, { status });
export const getAdminUsers = () => api.get<any>('/admin/users');
export const banUser = (userId: string) => api.post<any>(`/admin/users/${userId}/ban`);
export const updateUserByAdmin = (userId: string, data: any) => api.put<any>(`/admin/users/${userId}`, data);
export const getVerificationRequests = () => api.get<any>('/admin/verification-requests');

// ── AI ──
export const scanAuditionPoster = (imageBase64: string, mimeType?: string) => api.post<any>('/ai/scan-audition-poster', { imageBase64, mimeType });
export const aiChat = (message: string) => api.post<any>('/ai/chat', { message });
export const verifyContent = (text: string) => api.post<any>('/ai/verify-content', { text });

// ── OTP ──
export const sendOtp = (phone: string) => api.post<any>('/otp/send', { phone }, true);
export const verifyOtp = (phone: string, otp: string) => api.post<any>('/otp/verify', { phone, otp }, true);
export const resendOtp = (phone: string) => api.post<any>('/otp/resend', { phone }, true);

// ── Upload FCM Token ──
export const saveNotificationToken = (token: string, platform?: string) => api.post('/upload/notification-token', { token, platform });
