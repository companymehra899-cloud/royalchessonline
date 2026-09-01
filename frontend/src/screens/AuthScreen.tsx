import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import { GoldenKnightLogo } from '../components/GoldenKnightLogo';
import { useAuth } from '../context/AuthContext';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const { login, register, guestLogin, googleLogin } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Login failed');
        } else if (onSuccess) {
          onSuccess();
        }
      } else {
        const res = await register(email, password, username.trim() || undefined);
        if (!res.success) {
          setErrorMsg(res.error || 'Registration failed');
        } else if (onSuccess) {
          onSuccess();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await guestLogin();
      if (!res.success) {
        setErrorMsg(res.error || 'Guest login failed');
      } else if (onSuccess) {
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await googleLogin();
      if (!res.success) {
        setErrorMsg(res.error || 'Google login failed');
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (e) {
      setErrorMsg('Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <GoldenKnightLogo size="large" showSubtitle />

        {/* Segmented Tab Bar */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'login' && styles.tabButtonActive]}
            onPress={() => {
              setTab('login');
              setErrorMsg('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>LOGIN</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, tab === 'register' && styles.tabButtonActive]}
            onPress={() => {
              setTab('register');
              setErrorMsg('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>REGISTER</Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {!!errorMsg && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Form Inputs */}
        <View style={styles.form}>
          {tab === 'register' && (
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="account-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username (e.g. ChessMaster)"
                placeholderTextColor={colors.textTertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="email-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingRight: 40 }]}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {tab === 'login' && (
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => Alert.alert('Reset Password', 'Please enter your registered email to receive reset instructions.')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#0b0e14" />
            ) : (
              <Text style={styles.submitBtnText}>{tab === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="google" size={20} color="#EA4335" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Guest Button */}
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={handleGuest}
            disabled={loading}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.gold} />
            <Text style={styles.guestBtnText}>Play as Guest (Instant Play)</Text>
          </TouchableOpacity>

          {/* Switch tab footer */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={() => setTab(tab === 'login' ? 'register' : 'login')}>
              <Text style={styles.switchLink}>{tab === 'login' ? 'Register' : 'Login'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#202a3d',
    marginTop: 18,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.gold,
  },
  tabText: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  tabTextActive: {
    color: colors.gold,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  eyeButton: {
    padding: 6,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#0b0e14',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e2636',
  },
  dividerText: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginHorizontal: 12,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  googleBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    marginBottom: 20,
  },
  guestBtnText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  switchText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  switchLink: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
