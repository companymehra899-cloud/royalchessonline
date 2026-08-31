import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { UserProfile } from '../types/chess';
import { soundManager } from '../utils/audio';

WebBrowser.maybeCompleteAuthSession();

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const getRedirectUri = (): string => {
  if (Platform.OS === 'web') {
    return window.location.origin + window.location.pathname;
  }
  return Linking.createURL('');
};

const extractAuthCode = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/[?#&]code=([^&#]+)/);
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
  const processedAuthCodes = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadStoredSession();

    // Mobile: listen for OAuth deep links (hot links). On Android the auth
    // browser often returns "dismiss" with no URL even on success, so this
    // listener is a co-equal source for the callback URL.
    if (Platform.OS !== 'web') {
      const sub = Linking.addEventListener('url', (event) => {
        const code = extractAuthCode(event.url);
        if (code) {
          exchangeGoogleCode(code).catch(() => {});
        }
      });
      return () => sub.remove();
    }
  }, []);

  // Exchange a Google OAuth authorization code for a JWT
  const exchangeGoogleCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (processedAuthCodes.current.has(code)) {
      return { success: true };
    }
    processedAuthCodes.current.add(code);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: getRedirectUri() }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Google login failed' };
      }
      await AsyncStorage.setItem('chess_arena_token', data.token);
      await AsyncStorage.setItem('chess_arena_user', JSON.stringify(data.user));
      setToken(data.token);
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
      // 1) Process a Google OAuth callback code FIRST (before any other session logic)
      if (Platform.OS === 'web') {
        const code = extractAuthCode(window.location.search) || extractAuthCode(window.location.hash);
        if (code) {
          const result = await exchangeGoogleCode(code);
          if (result.success) {
            // Clean only code from the URL, preserve other params
            const cleanedHash = window.location.hash.replace(/[?#&]?code=[^&#]+/, '');
            const cleanedSearch = window.location.search.replace(/[?&]code=[^&#]+/, '');
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
        const code = extractAuthCode(initialUrl);
        if (code) {
          const result = await exchangeGoogleCode(code);
          if (result.success) return;
        }
      }

      // 2) Existing email/password, guest, or Google JWT session
      const savedToken = await AsyncStorage.getItem('chess_arena_token');
      const savedUser = await AsyncStorage.getItem('chess_arena_user');
      if (savedToken && savedUser) {
        // Validate the token against the backend before restoring the session,
        // so stale sessions (e.g. deleted accounts) are dropped.
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setToken(savedToken);
            setUser(data);
            await AsyncStorage.setItem('chess_arena_user', JSON.stringify(data));
            soundManager.setSoundEnabled(data.sound_enabled ?? true);
            soundManager.setVibrationEnabled(data.vibration_enabled ?? true);
          } else {
            await AsyncStorage.removeItem('chess_arena_token');
            await AsyncStorage.removeItem('chess_arena_user');
          }
        } catch (e) {
          console.log('Error validating saved session:', e);
          await AsyncStorage.removeItem('chess_arena_token');
          await AsyncStorage.removeItem('chess_arena_user');
        }
      }
    } catch (e) {
      console.log('Error loading auth session:', e);
    } finally {
      setLoading(false);
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
      // Fetch Google client ID from backend
      const configRes = await fetch(`${BACKEND_URL}/api/auth/google-config`);
      if (!configRes.ok) {
        return { success: false, error: 'Google login is not configured.' };
      }
      const { client_id } = await configRes.json();

      const redirectUri = getRedirectUri();
      const scope = encodeURIComponent('openid email profile');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;

      if (Platform.OS === 'web') {
        // Full-page navigation; code is processed on remount
        window.location.href = authUrl;
        return { success: true };
      }

      // Mobile: capture deep link via listener too (Android may return dismiss with no URL)
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      let code: string | null = null;
      if (result.type === 'success' && result.url) {
        code = extractAuthCode(result.url);
      }
      if (!code) code = extractAuthCode(await Linking.getInitialURL());

      if (!code) {
        return { success: false, error: 'Google sign-in was cancelled.' };
      }
      return await exchangeGoogleCode(code);
    } catch (e) {
      return { success: false, error: 'Google login failed. Please try again.' };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('chess_arena_token');
    await AsyncStorage.removeItem('chess_arena_user');
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
