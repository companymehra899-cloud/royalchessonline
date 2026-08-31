import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { GameHistoryItem } from '../types/chess';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface ProfileScreenProps {
  onBack: () => void;
  onOpenSettings: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, onOpenSettings }) => {
  const { user, token, logout } = useAuth();
  const [historyModal, setHistoryModal] = useState(false);
  const [achievementsModal, setAchievementsModal] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);

  const rating = user?.rating || 1200;
  const bestRating = user?.best_rating || 1200;
  const games = user?.games_played || 0;
  const wins = user?.wins || 0;
  const losses = user?.losses || 0;
  const draws = user?.draws || 0;

  const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
  const lossRate = games > 0 ? Math.round((losses / games) * 100) : 0;
  const drawRate = games > 0 ? Math.round((draws / games) * 100) : 0;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/games/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setGameHistory(data);
      }
    } catch (e) {
      console.log('Error fetching history:', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROFILE</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onOpenSettings}>
          <MaterialCommunityIcons name="cog-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Big Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarBig}>
            <MaterialCommunityIcons name="chess-pawn" size={54} color={colors.gold} />
            <TouchableOpacity style={styles.editAvatarBtn}>
              <MaterialCommunityIcons name="pencil" size={14} color="#0b0e14" />
            </TouchableOpacity>
          </View>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{user?.username || 'Player'}</Text>
            <MaterialCommunityIcons name="crown" size={20} color={colors.gold} style={{ marginLeft: 6 }} />
          </View>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <Text style={styles.joinedText}>{user?.joined_date || 'Joined May 2024'}</Text>
        </View>

        {/* 6 Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>RATING</Text>
            <Text style={styles.statMain}>{rating}</Text>
            <Text style={styles.statSub}>ELO</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>GAMES</Text>
            <Text style={styles.statMain}>{games}</Text>
            <Text style={styles.statSub}>Total</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>WINS</Text>
            <Text style={[styles.statMain, { color: colors.success }]}>{wins}</Text>
            <Text style={styles.statSub}>{winRate}%</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>LOSSES</Text>
            <Text style={[styles.statMain, { color: colors.danger }]}>{losses}</Text>
            <Text style={styles.statSub}>{lossRate}%</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DRAWS</Text>
            <Text style={styles.statMain}>{draws}</Text>
            <Text style={styles.statSub}>{drawRate}%</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>BEST RATING</Text>
            <Text style={[styles.statMain, { color: colors.gold }]}>{bestRating}</Text>
            <Text style={styles.statSub}>Peak</Text>
          </View>
        </View>

        {/* Menu Rows */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setHistoryModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialCommunityIcons name="clock-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.menuText}>Game History</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setAchievementsModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialCommunityIcons name="trophy-outline" size={22} color={colors.gold} />
              <Text style={styles.menuText}>Achievements</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
              <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.menuText}>Friends</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutRow} onPress={logout} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
              <MaterialCommunityIcons name="logout" size={22} color={colors.danger} />
              <Text style={styles.logoutText}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Game History Modal */}
      <Modal visible={historyModal} animationType="slide" onRequestClose={() => setHistoryModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setHistoryModal(false)}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>GAME HISTORY</Text>
            <View style={{ width: 24 }} />
          </View>

          {gameHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="chess-king" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No games played yet. Play a match to record history!</Text>
            </View>
          ) : (
            <FlatList
              data={gameHistory}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyOpponent}>{item.opponent_name}</Text>
                    <Text
                      style={[
                        styles.historyResult,
                        { color: item.result === 'win' ? colors.success : item.result === 'loss' ? colors.danger : colors.textSecondary },
                      ]}
                    >
                      {item.result.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.historySub}>
                    {item.reason} • {item.moves_count} moves • {item.elo_delta >= 0 ? `+${item.elo_delta}` : item.elo_delta} ELO
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Achievements Modal */}
      <Modal visible={achievementsModal} animationType="slide" onRequestClose={() => setAchievementsModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAchievementsModal(false)}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>ACHIEVEMENTS</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ padding: 16 }}>
            <View style={styles.achievementCard}>
              <MaterialCommunityIcons name="trophy" size={32} color={colors.gold} />
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.achTitle}>First Victory</Text>
                <Text style={styles.achSub}>Win your first chess match</Text>
              </View>
            </View>
            <View style={styles.achievementCard}>
              <MaterialCommunityIcons name="lightning-bolt" size={32} color={colors.gold} />
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.achTitle}>Scholar's Striker</Text>
                <Text style={styles.achSub}>Deliver checkmate in under 10 moves</Text>
              </View>
            </View>
            <View style={styles.achievementCard}>
              <MaterialCommunityIcons name="puzzle" size={32} color={colors.gold} />
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.achTitle}>Tactics Prodigy</Text>
                <Text style={styles.achSub}>Solve 5 tactical chess puzzles</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161d2b',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarBig: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1b2333',
    borderWidth: 2.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.gold,
    borderRadius: 12,
    padding: 6,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  userEmail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  joinedText: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statMain: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  statSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2233',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 14,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161d2b',
  },
  modalTitle: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyOpponent: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  historyResult: {
    fontSize: 14,
    fontWeight: '800',
  },
  historySub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  achTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  achSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
