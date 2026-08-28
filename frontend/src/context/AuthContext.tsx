import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types/chess';
import { soundManager } from '../utils/audio';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  guestLogin: (username?: string) => Promise<{ success: boolean; error?: string }>;
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

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('chess_arena_token');
      const savedUser = await AsyncStorage.getItem('chess_arena_user');
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