import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { UserProfile } from '../types/chess';
import { soundManager } from '../utils/audio';

WebBrowser.maybeCompleteAuthSession();

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const SESSION_TOKEN_KEY = 'chess_session_token';

// Secure storage helpers: SecureStore on mobile, localStorage on web
const saveSessionToken = async (token: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  }
};
const getSessionToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
};
const clearSessionToken = async () => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  }
};

const extractSessionId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/[?#&]session_id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  guestLogin: (username?: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserStats: (eloDelta: number, result: 'win' | 'loss' | 'draw') => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const processedSessionIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadStoredSession();

    // Mobile: listen for OAuth deep links (hot links). On Android the auth
    // browser often returns "dismiss" with no URL even on success, so this
    // listener is a co-equal source for the callback URL.
    if (Platform.OS !== 'web') {
      const sub = Linking.addEventListener('url', (event) => {
        const sessionId = extractSessionId(event.url);
        if (sessionId) {
          exchangeSession(sessionId).catch(() => {});
        }
      });
      return () => sub.remove();
    }
  }, []);

  // Exchange one-time session_id (from Google redirect) for a 7-day session token
  const exchangeSession = async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
    if (processedSessionIds.current.has(sessionId)) {
      return { success: true };
    }
    processedSessionIds.current.add(sessionId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Google login failed' };
      }
      await saveSessionToken(data.session_token);
      await AsyncStorage.setItem('chess_arena_user', JSON.stringify(data.user));
      await AsyncStorage.removeItem('chess_arena_token');
      setToken(data.session_token);
      setUser(data.user);
      soundManager.setSoundEnabled(data.user.sound_enabled ?? true);
      soundManager.setVibrationEnabled(data.user.vibration_enabled ?? true);
      setLoading(false);
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Google login failed. Please try again.' };
    }
  };

  const loadStoredSession = async () => {
    try {
      // 1) Process a Google OAuth callback session_id FIRST (before any other session logic)
      if (Platform.OS === 'web') {
        const sessionId =
          extractSessionId(window.location.hash) || extractSessionId(window.location.search);
        if (sessionId) {
          const result = await exchangeSession(sessionId);
          if (result.success) {
            // Clean only session_id from the URL, preserve other params
            const cleanedHash = window.location.hash.replace(/[?#&]?session_id=[^&#]+/, '');
            const cleanedSearch = window.location.search.replace(/[?&]session_id=[^&#]+/, '');
            window.history.replaceState(
              window.history.state,
              '',
              window.location.pathname + cleanedSearch + cleanedHash
            );
            return;
          }
        }
      } else {
        const initialUrl = await Linking.getInitialURL();
        const sessionId = extractSessionId(initialUrl);
        if (sessionId) {
          const result = await exchangeSession(sessionId);
          if (result.success) return;
        }
      }

      // 2) Google session token (7-day) stored securely
      const googleToken = await getSessionToken();
      const savedUser = await AsyncStorage.getItem('chess_arena_user');
      if (googleToken && savedUser) {
        setToken(googleToken);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        soundManager.setSoundEnabled(parsedUser.sound_enabled ?? true);
        soundManager.setVibrationEnabled(parsedUser.vibration_enabled ?? true);
        return;
      }

      // 3) Existing email/password or guest JWT session
      const savedToken = await AsyncStorage.getItem('chess_arena_token');
      if (savedToken && savedUser) {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        soundManager.setSoundEnabled(parsedUser.sound_enabled ?? true);
        soundManager.setVibrationEnabled(parsedUser.vibration_enabled ?? true);
      } else {
        // Automatically load demo account by default for instant play experience
        await autoDemoLogin();
      }
    } catch (e) {
      console.log('Error loading auth session:', e);
    } finally {
      setLoading(false);
    }
  };

  const autoDemoLogin = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'chessplayer@gmail.com', password: 'password123' }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem('chess_arena_token', data.token);
        await AsyncStorage.setItem('chess_arena_user', JSON.stringify(data.user));
      }
    } catch (err) {
      // Fallback local demo profile
      const demo: UserProfile = {
        id: 'user_demo_chessplayer',
        email: 'chessplayer@gmail.com',
        username: 'ChessPlayer',
        rating: 1200,
        best_rating: 1200,
        games_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        avatar_id: 'knight_gold',
        joined_date: 'Joined May 2024',
      };
      setUser(demo);
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Login failed' };
      }
      setToken(data.token);
      setUser(data.user);
      await AsyncStorage.setItem('chess_arena_token', data.token);
      await AsyncStorage.setItem('chess_arena_user', JSON.stringify(data.user));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (email: string, pass: string, username?: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: pass, username }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Registration failed' };
      }
      setToken(data.token);
      setUser(data.user);
      await AsyncStorage.setItem('chess_arena_token', data.token);
      await AsyncStorage.setItem('chess_arena_user', JSON.stringify(data.user));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const guestLogin = async (username?: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Guest login failed' };
      }
      setToken(data.token);
      setUser(data.user);
      await AsyncStorage.setItem('chess_arena_token', data.token);
      await AsyncStorage.setItem('chess_arena_user', JSON.stringify(data.user));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'Guest login failed.' };
    }
  };

  const googleLogin = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (Platform.OS === 'web') {
        const redirectUrl = window.location.origin + '/';
        const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
        // Full-page navigation; session_id is processed on remount
        window.location.href = authUrl;
        return { success: true };
      }

      // Mobile: capture deep link via listener too (Android may return dismiss with no URL)
      let capturedUrl: string | null = null;
      const sub = Linking.addEventListener('url', (event) => {
        if (extractSessionId(event.url)) capturedUrl = event.url;
      });

      const redirectUrl = Linking.createURL('');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      sub.remove();

      let sessionId: string | null = null;
      if (result.type === 'success' && result.url) {
        sessionId = extractSessionId(result.url);
      }
      if (!sessionId) sessionId = extractSessionId(capturedUrl);
      if (!sessionId) sessionId = extractSessionId(await Linking.getInitialURL());

      if (!sessionId) {
        return { success: false, error: 'Google sign-in was cancelled.' };
      }
      return await exchangeSession(sessionId);
    } catch (e) {
      return { success: false, error: 'Google login failed. Please try again.' };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('chess_arena_token');
    await AsyncStorage.removeItem('chess_arena_user');
    await clearSessionToken();
    setToken(null);
    setUser(null);
  };

  const updateUserStats = (eloDelta: number, result: 'win' | 'loss' | 'draw') => {
    if (!user) return;
    const newRating = Math.max(400, user.rating + eloDelta);
    const updatedUser: UserProfile = {
      ...user,
      rating: newRating,
      best_rating: Math.max(user.best_rating, newRating),
      games_played: user.games_played + 1,
      wins: result === 'win' ? user.wins + 1 : user.wins,
      losses: result === 'loss' ? user.losses + 1 : user.losses,
      draws: result === 'draw' ? user.draws + 1 : user.draws,
    };
    setUser(updatedUser);
    AsyncStorage.setItem('chess_arena_user', JSON.stringify(updatedUser)).catch(() => {});
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        await AsyncStorage.setItem('chess_arena_user', JSON.stringify(data));
      }
    } catch (e) {
      console.log('Error refreshing user:', e);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser((prev) => (prev ? { ...prev, ...updated } : updated));
        await AsyncStorage.setItem('chess_arena_user', JSON.stringify(updated));
        return true;
      }
      return false;
    } catch (e) {
      console.log('Update profile error:', e);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        guestLogin,
        googleLogin,
        logout,
        updateUserStats,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};