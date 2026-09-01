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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

type ModeTab = 'create' | 'join' | 'quick';

interface OnlineModalProps {
  visible: boolean;
  onClose: () => void;
  onStartGame: (roomCode: string) => void;
}

export const OnlineModal: React.FC<OnlineModalProps> = ({ visible, onClose, onStartGame }) => {
  const { token } = useAuth();
  const [modeTab, setModeTab] = useState<ModeTab>('create');
  const [joinCode, setJoinCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick match state
  const [quickTime, setQuickTime] = useState<5 | 10 | 15>(10);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState('Searching for opponent...');
  const pollRef = useRef<any>(null);
  const searchActiveRef = useRef(false);

  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleQuickMatchEnd = (data: any) => {
    clearPoll();
    searchActiveRef.current = false;
    setSearching(false);
    onClose();
    onStartGame(data.room_code);
  };

  const stopSearch = async (silent = false) => {
    clearPoll();
    if (searchActiveRef.current) {
      searchActiveRef.current = false;
      try {
        await fetch(`${BACKEND_URL}/api/online/matchmaking/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
        });
      } catch (e) {
        // ignore
      }
    }
    setSearching(false);
    if (!silent) setSearchMsg('Searching for opponent...');
  };

  const pollStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/online/matchmaking/status`, {
        headers: authHeaders,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'matched') {
        handleQuickMatchEnd(data);
      } else if (data.status === 'expired') {
        stopSearch(true);
        Alert.alert('No Opponent Found', 'We could not find an opponent right now. Please try again.');
      } else if (data.status === 'waiting') {
        setSearchMsg('Searching for opponent...');
      }
    } catch (e) {
      // keep polling
    }
  };

  const handleQuickMatch = async () => {
    setSearching(true);
    searchActiveRef.current = true;
    setSearchMsg('Searching for opponent...');
    try {
      const res = await fetch(`${BACKEND_URL}/api/online/matchmaking/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ time_minutes: quickTime, color_preference: 'random' }),
      });
      const data = await res.json();
      if (data.status === 'matched') {
        handleQuickMatchEnd(data);
        return;
      }
      if (data.status === 'waiting') {
        pollRef.current = setInterval(pollStatus, 3000);
      } else {
        searchActiveRef.current = false;
        setSearching(false);
        Alert.alert('Error', 'Unable to start matchmaking. Please try again.');
      }
    } catch (e) {
      searchActiveRef.current = false;
      setSearching(false);
      Alert.alert('Error', 'Unable to start matchmaking. Please try again.');
    }
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

  // Cleanup when the modal is dismissed
  useEffect(() => {
    if (!visible) {
      clearPoll();
      if (searchActiveRef.current) {
        fetch(`${BACKEND_URL}/api/online/matchmaking/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
        }).catch(() => {});
        searchActiveRef.current = false;
      }
      setSearching(false);
      setCreatedRoomCode(null);
    }
  }, [visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPoll();
      if (searchActiveRef.current) {
        fetch(`${BACKEND_URL}/api/online/matchmaking/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
        }).catch(() => {});
        searchActiveRef.current = false;
      }
    };
  }, []);

  const switchTab = (tab: ModeTab) => {
    stopSearch(true);
    setModeTab(tab);
    if (tab === 'create') setCreatedRoomCode(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>PLAY ONLINE</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab */}
          <View style={styles.tabRow}>
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
            <TouchableOpacity
              style={[styles.tabBtn, modeTab === 'quick' && styles.tabBtnActive]}
              onPress={() => switchTab('quick')}
            >
              <Text style={[styles.tabText, modeTab === 'quick' && styles.tabTextActive]}>QUICK MATCH</Text>
            </TouchableOpacity>
          </View>

          {modeTab === 'create' ? (
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
          ) : modeTab === 'join' ? (
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
          ) : (
            <View style={styles.tabContent}>
              {searching ? (
                <View style={styles.createActionBox}>
                  <ActivityIndicator size="large" color={colors.gold} />
                  <Text style={styles.searchTitle}>SEARCHING FOR OPPONENT...</Text>
                  <Text style={styles.searchSub}>{searchMsg}</Text>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => stopSearch(false)}
                  >
                    <Text style={styles.cancelBtnText}>CANCEL SEARCH</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.createActionBox}>
                  <MaterialCommunityIcons name="sword-cross" size={48} color={colors.gold} style={{ marginBottom: 12 }} />
                  <Text style={styles.actionDesc}>
                    Instantly match with a random online opponent. Winner climbs the leaderboard.
                  </Text>
                  <Text style={styles.timeLabel}>TIME CONTROL</Text>
                  <View style={styles.timeRow}>
                    {([5, 10, 15] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.timeChip, quickTime === t && styles.timeChipActive]}
                        onPress={() => setQuickTime(t)}
                      >
                        <Text style={[styles.timeChipText, quickTime === t && styles.timeChipTextActive]}>
                          {t} MIN
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleQuickMatch}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#0b0e14" />
                    ) : (
                      <Text style={styles.actionBtnText}>FIND ONLINE OPPONENT</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
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
  timeLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 16,
  },
  timeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
  },
  timeChipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  timeChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeChipTextActive: {
    color: '#0b0e14',
  },
  searchTitle: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 18,
  },
  searchSub: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginVertical: 10,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
