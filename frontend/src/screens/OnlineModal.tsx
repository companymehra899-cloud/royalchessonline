import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const MATCHMAKING_POLL_MS = 2000;

interface OnlineModalProps {
  visible: boolean;
  onClose: () => void;
  onStartGame: (roomCode: string) => void;
}

export const OnlineModal: React.FC<OnlineModalProps> = ({ visible, onClose, onStartGame }) => {
  const { token } = useAuth();
  const [modeTab, setModeTab] = useState<'quick' | 'create' | 'join'>('quick');
  const [joinCode, setJoinCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick match state
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const pollRef = useRef<any>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const cancelQuickMatch = async () => {
    stopPolling();
    setSearching(false);
    setSearchError(null);
    try {
      await fetch(`${BACKEND_URL}/api/online/matchmaking/cancel`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    } catch (e) {
      // Silent — polling cleanup matters more than the cancel ack
    }
  };

  const handleMatchFound = (roomCode: string) => {
    stopPolling();
    setSearching(false);
    onClose();
    onStartGame(roomCode);
  };

  const startQuickMatch = async () => {
    setSearchError(null);
    setSearching(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/online/matchmaking/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ color_preference: 'random', time_minutes: 10 }),
      });
      const data = await res.json();

      if (data.status === 'matched' && data.room_code) {
        handleMatchFound(data.room_code);
        return;
      }

      if (data.status === 'waiting') {
        // Poll for a match until an opponent joins
        pollRef.current = setInterval(async () => {
          try {
            const sRes = await fetch(`${BACKEND_URL}/api/online/matchmaking/status`, {
              headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            const sData = await sRes.json();
            if (sData.status === 'matched' && sData.room_code) {
              handleMatchFound(sData.room_code);
            }
          } catch (e) {
            // Keep polling — transient network errors retry naturally
          }
        }, MATCHMAKING_POLL_MS);
      } else {
        setSearchError('Matchmaking is unavailable right now. Please try again.');
        setSearching(false);
      }
    } catch (e) {
      setSearchError('Unable to connect. Please check your connection and retry.');
      setSearching(false);
    }
  };

  // Reset + auto-start quick match each time the modal opens
  useEffect(() => {
    if (visible) {
      setModeTab('quick');
      setCreatedRoomCode(null);
      setJoinCode('');
      setSearchError(null);
      startQuickMatch();
    }
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const switchTab = (tab: 'quick' | 'create' | 'join') => {
    if (tab !== 'quick') cancelQuickMatch();
    setModeTab(tab);
    setCreatedRoomCode(null);
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/online/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ color_preference: 'white', time_minutes: 10 }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedRoomCode(data.room_code);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Required', 'Please enter a 6-digit room code');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/online/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ room_code: joinCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        onClose();
        onStartGame(joinCode.trim().toUpperCase());
      } else {
        Alert.alert('Error', data.detail || 'Room not found.');
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to join room.');
    } finally {
      setLoading(false);
    }
  };

  const renderQuickMatch = () => {
    if (searching) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.searchRing}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
          <Text style={styles.searchTitle}>SEARCHING FOR OPPONENT</Text>
          <Text style={styles.searchSub}>Finding a random online player...</Text>
          <TouchableOpacity
            style={styles.cancelBtn}
            testID="quick-match-cancel"
            onPress={cancelQuickMatch}
          >
            <MaterialCommunityIcons name="close" size={16} color={colors.textPrimary} />
            <Text style={styles.cancelBtnText}>CANCEL SEARCH</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <MaterialCommunityIcons name="sword-cross" size={48} color={colors.gold} style={{ marginBottom: 12 }} />
        <Text style={styles.actionDesc}>
          Jump straight into a random match against another online player. First move wins the pairing.
        </Text>
        {!!searchError && <Text style={styles.searchError}>{searchError}</Text>}
        <TouchableOpacity
          style={styles.actionBtn}
          testID="quick-match-button"
          onPress={startQuickMatch}
        >
          {loading ? (
            <ActivityIndicator color="#0b0e14" />
          ) : (
            <Text style={styles.actionBtnText}>FIND OPPONENT</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>PLAY ONLINE</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="online-modal-close">
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, modeTab === 'quick' && styles.tabBtnActive]}
              onPress={() => switchTab('quick')}
            >
              <Text style={[styles.tabText, modeTab === 'quick' && styles.tabTextActive]}>QUICK MATCH</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, modeTab === 'create' && styles.tabBtnActive]}
              onPress={() => switchTab('create')}
            >
              <Text style={[styles.tabText, modeTab === 'create' && styles.tabTextActive]}>CREATE ROOM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, modeTab === 'join' && styles.tabBtnActive]}
              onPress={() => switchTab('join')}
            >
              <Text style={[styles.tabText, modeTab === 'join' && styles.tabTextActive]}>JOIN ROOM</Text>
            </TouchableOpacity>
          </View>

          {modeTab === 'quick' ? (
            renderQuickMatch()
          ) : modeTab === 'create' ? (
            <View style={styles.tabContent}>
              {createdRoomCode ? (
                <View style={styles.createdBox}>
                  <Text style={styles.createdLabel}>SHARE ROOM CODE WITH FRIEND:</Text>
                  <Text style={styles.roomCodeText}>{createdRoomCode}</Text>
                  <Text style={styles.waitingText}>Waiting for opponent to connect...</Text>
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => {
                      onClose();
                      onStartGame(createdRoomCode);
                    }}
                  >
                    <Text style={styles.startBtnText}>ENTER GAME ARENA</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.createActionBox}>
                  <MaterialCommunityIcons name="shield-crown" size={48} color={colors.gold} style={{ marginBottom: 12 }} />
                  <Text style={styles.actionDesc}>
                    Generate a private chess arena room and invite your friends.
                  </Text>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleCreateRoom}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#0b0e14" />
                    ) : (
                      <Text style={styles.actionBtnText}>CREATE PRIVATE ROOM</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.tabContent}>
              <Text style={styles.actionDesc}>Enter the 6-character room code shared by your friend:</Text>
              <TextInput
                style={styles.codeInput}
                placeholder="e.g. ARENA8"
                placeholderTextColor={colors.textTertiary}
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                maxLength={8}
              />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleJoinRoom}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0b0e14" />
                ) : (
                  <Text style={styles.actionBtnText}>JOIN MATCH</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  closeBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: colors.gold,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#0b0e14',
  },
  tabContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: colors.gold,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#0b0e14',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  createdBox: {
    alignItems: 'center',
    width: '100%',
  },
  createdLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  roomCodeText: {
    color: colors.gold,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
    marginVertical: 12,
  },
  waitingText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  startBtn: {
    backgroundColor: colors.gold,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#0b0e14',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  createActionBox: {
    alignItems: 'center',
    width: '100%',
  },
  codeInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    width: '100%',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 4,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1b2333',
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  searchTitle: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  searchSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 18,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  cancelBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 6,
  },
  searchError: {
    color: colors.danger,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
});
