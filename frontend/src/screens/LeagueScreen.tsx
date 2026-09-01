import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const ADMIN_EMAIL = 'hackerabcd001@gmail.com';

interface LeagueScreenProps {
  onBack: () => void;
  onOpenSettings: () => void;
}

interface LeaderRow {
  rank: number;
  user_id: string;
  username: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  games_played: number;
}

interface Winning {
  league_id: string;
  rank: number;
  prize: number;
  points: number;
  message: string;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatCountdown(totalSeconds: number) {
  if (totalSeconds <= 0) return 'Ending soon';
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
}

export const LeagueScreen: React.FC<LeagueScreenProps> = ({ onBack, onOpenSettings }) => {
  const { user, token } = useAuth();
  const isAdmin = (user?.email || '').toLowerCase() === ADMIN_EMAIL;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [current, setCurrent] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [winnings, setWinnings] = useState<Winning[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const loadAll = useCallback(async () => {
    try {
      const [curRes, lbRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/league/current`, { headers: { ...authHeaders } }),
        fetch(`${BACKEND_URL}/api/league/leaderboard?limit=100`, { headers: { ...authHeaders } }),
      ]);
      if (curRes.ok) {
        const cur = await curRes.json();
        setCurrent(cur);
        setSecondsLeft(cur.time_left_seconds || 0);
      }
      if (lbRes.ok) {
        const lb = await lbRes.json();
        setLeaderboard(lb.leaderboard || []);
        setMyRank(lb.my_rank ?? null);
      }
      if (token) {
        const wRes = await fetch(`${BACKEND_URL}/api/league/my-winnings`, { headers: { ...authHeaders } });
        if (wRes.ok) {
          const w = await wRes.json();
          setWinnings(w.winnings || []);
        }
      }
    } catch {
      // network error - keep prior state
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadAll();
      setLoading(false);
    })();
  }, [loadAll]);

  // Live countdown tick
  const tickRef = useRef<any>(null);
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleJoin = async () => {
    if (!token) {
      Alert.alert('Sign in required', 'Please log in to join the league.');
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/league/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
      });
      if (res.ok) {
        await loadAll();
      } else {
        Alert.alert('Could not join', 'Please try again in a moment.');
      }
    } catch {
      Alert.alert('Network error', 'Please check your connection.');
    } finally {
      setJoining(false);
    }
  };

  const handleClaim = (url: string) => {
    const full = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(full).catch(() => {
      Alert.alert('Claim your prize', `Visit ${url} to complete verification and claim your prize.`);
    });
  };

  const handleAdminForceComplete = () => {
    Alert.alert(
      'End season now?',
      'This will freeze the current league, award Top 3, and start a new one. (Admin/testing)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Season',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${BACKEND_URL}/api/admin/league/force-complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
              });
              if (res.ok) {
                await loadAll();
                Alert.alert('Season ended', 'Winners have been finalized and a new league started.');
              } else {
                Alert.alert('Failed', 'Only admin can perform this action.');
              }
            } catch {
              Alert.alert('Network error', 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const league = current?.league;
  const joined = current?.joined;
  const myPoints = current?.my_points || 0;
  const participantCount = current?.participant_count || 0;
  const minPlayers = current?.min_players || 0;
  const prizes: { rank: number; prize: number }[] = current?.prizes || [];
  const podium = leaderboard.slice(0, 3);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={onBack} testID="league-back">
            <MaterialCommunityIcons name="arrow-left" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CHESS LEAGUE</Text>
          <View style={styles.headerIconBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
          <Text style={styles.loadingText}>Loading league...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={onBack} testID="league-back">
          <MaterialCommunityIcons name="arrow-left" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHESS LEAGUE</Text>
        <TouchableOpacity style={styles.headerIconBtn} onPress={onOpenSettings}>
          <MaterialCommunityIcons name="cog-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* Winner congrats banner(s) */}
        {winnings.map((w) => (
          <View key={w.league_id} style={styles.winBanner} testID="league-win-banner">
            <View style={styles.winTop}>
              <Text style={styles.winMedal}>{MEDALS[w.rank] || '🏆'}</Text>
              <Text style={styles.winTitle}>Congratulations!</Text>
            </View>
            <Text style={styles.winPrize}>You won ₹{w.prize}</Text>
            <Text style={styles.winMsg}>
              Please complete your verification on our official message box to claim your prize.
            </Text>
            <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaim('yourdomain.com')} testID="league-claim-btn">
              <MaterialCommunityIcons name="shield-check" size={18} color="#0b0e14" />
              <Text style={styles.claimBtnText}>Complete Verification (yourdomain.com)</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Active league card */}
        <View style={styles.leagueCard}>
          <View style={styles.leagueTopRow}>
            <View style={styles.trophyCircle}>
              <MaterialCommunityIcons name="trophy-variant" size={26} color={colors.gold} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.leagueTitle}>{league?.title || 'Royal Chess League'}</Text>
              <Text style={styles.leagueSub}>Recurring 3-day season</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          {/* Countdown */}
          <View style={styles.timerBox}>
            <MaterialCommunityIcons name="timer-sand" size={18} color={colors.gold} />
            <Text style={styles.timerLabel}>Ends in</Text>
            <Text style={styles.timerValue} testID="league-countdown">{formatCountdown(secondsLeft)}</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <MaterialCommunityIcons name="account-group" size={20} color={colors.textSecondary} />
              <Text style={styles.statValue}>{participantCount}</Text>
              <Text style={styles.statLabel}>Players</Text>
            </View>
            <View style={styles.statBox}>
              <MaterialCommunityIcons name="flag-checkered" size={20} color={colors.textSecondary} />
              <Text style={styles.statValue}>{minPlayers}</Text>
              <Text style={styles.statLabel}>Min Threshold</Text>
            </View>
            <View style={styles.statBox}>
              <MaterialCommunityIcons name="medal" size={20} color={colors.gold} />
              <Text style={styles.statValue}>Top 3</Text>
              <Text style={styles.statLabel}>Win Prizes</Text>
            </View>
          </View>

          {/* Points rule */}
          <View style={styles.ruleRow}>
            <Text style={styles.ruleChipWin}>Win +10</Text>
            <Text style={styles.ruleChipDraw}>Draw +4</Text>
            <Text style={styles.ruleChipLoss}>Loss 0</Text>
          </View>

          {/* Prize table */}
          <View style={styles.prizeRow}>
            {prizes.map((p) => (
              <View key={p.rank} style={styles.prizeBox}>
                <Text style={styles.prizeMedal}>{MEDALS[p.rank]}</Text>
                <Text style={styles.prizeAmount}>₹{p.prize}</Text>
                <Text style={styles.prizeRank}>Rank {p.rank}</Text>
              </View>
            ))}
          </View>

          {/* Join / joined status */}
          {joined ? (
            <View style={styles.joinedBox}>
              <MaterialCommunityIcons name="check-decagram" size={20} color={colors.success} />
              <Text style={styles.joinedText}>
                You&apos;re in! {myRank ? `Rank #${myRank}` : ''} · {myPoints} pts
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={handleJoin}
              disabled={joining}
              activeOpacity={0.85}
              testID="league-join-btn"
            >
              {joining ? (
                <ActivityIndicator color="#0b0e14" />
              ) : (
                <>
                  <MaterialCommunityIcons name="sword-cross" size={20} color="#0b0e14" />
                  <Text style={styles.joinBtnText}>JOIN LEAGUE (FREE)</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <Text style={styles.claimNote}>
            Prizes are verified & paid outside the app. Winners get instructions to claim.
          </Text>
        </View>

        {/* Top 3 podium */}
        {podium.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>TOP 3</Text>
            <View style={styles.podiumRow}>
              {podium.map((p) => (
                <View
                  key={p.user_id}
                  style={[styles.podiumCard, p.rank === 1 && styles.podiumFirst]}
                >
                  <Text style={styles.podiumMedal}>{MEDALS[p.rank]}</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>{p.username}</Text>
                  <Text style={styles.podiumPoints}>{p.points} pts</Text>
                  <Text style={styles.podiumWins}>{p.wins}W</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Full leaderboard */}
        <Text style={styles.sectionTitle}>LEADERBOARD</Text>
        {leaderboard.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="account-off-outline" size={36} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No players yet. Join and play online games to earn points!</Text>
          </View>
        ) : (
          <View style={styles.lbList}>
            {leaderboard.map((p) => {
              const isMe = p.user_id === user?.id;
              return (
                <View key={p.user_id} style={[styles.lbRow, isMe && styles.lbRowMe]}>
                  <Text style={[styles.lbRank, p.rank <= 3 && styles.lbRankTop]}>
                    {MEDALS[p.rank] || p.rank}
                  </Text>
                  <Text style={[styles.lbName, isMe && styles.lbNameMe]} numberOfLines={1}>
                    {p.username}{isMe ? ' (You)' : ''}
                  </Text>
                  <Text style={styles.lbWdl}>{p.wins}/{p.draws}/{p.losses}</Text>
                  <Text style={styles.lbPoints}>{p.points}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Admin section */}
        {isAdmin && (
          <View style={styles.adminBox}>
            <View style={styles.adminHeader}>
              <MaterialCommunityIcons name="shield-crown" size={18} color={colors.gold} />
              <Text style={styles.adminTitle}>ADMIN</Text>
            </View>
            <Text style={styles.adminNote}>
              KYC verification and UPI payouts are handled externally. Use this only to finalize a season.
            </Text>
            <TouchableOpacity style={styles.adminBtn} onPress={handleAdminForceComplete} testID="league-admin-complete">
              <MaterialCommunityIcons name="flag-checkered" size={18} color={colors.danger} />
              <Text style={styles.adminBtnText}>End Season Now &amp; Distribute Prizes</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161d2b',
  },
  headerTitle: { color: colors.gold, fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  headerIconBtn: { padding: 6, width: 38 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },

  // Winner banner
  winBanner: {
    backgroundColor: '#241d0c',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: 18,
    marginBottom: 16,
  },
  winTop: { flexDirection: 'row', alignItems: 'center' },
  winMedal: { fontSize: 26, marginRight: 8 },
  winTitle: { color: colors.gold, fontSize: 18, fontWeight: '800' },
  winPrize: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', marginTop: 6 },
  winMsg: { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  claimBtnText: { color: '#0b0e14', fontWeight: '800', fontSize: 13, marginLeft: 8 },

  // League card
  leagueCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 18,
  },
  leagueTopRow: { flexDirection: 'row', alignItems: 'center' },
  trophyCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2e2612',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  leagueTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  leagueSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12241a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success, marginRight: 5 },
  liveText: { color: colors.success, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b2114',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  timerLabel: { color: colors.textSecondary, fontSize: 13, marginLeft: 8, flex: 1 },
  timerValue: { color: colors.gold, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#141b28',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  statValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 4 },
  statLabel: { color: colors.textTertiary, fontSize: 10, marginTop: 2 },
  ruleRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 14, gap: 8 },
  ruleChipWin: {
    color: colors.success, backgroundColor: '#12241a', borderColor: colors.success, borderWidth: 1,
    fontSize: 12, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, overflow: 'hidden',
  },
  ruleChipDraw: {
    color: colors.gold, backgroundColor: '#241d0c', borderColor: colors.gold, borderWidth: 1,
    fontSize: 12, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, overflow: 'hidden',
  },
  ruleChipLoss: {
    color: colors.textTertiary, backgroundColor: '#171d2a', borderColor: colors.border, borderWidth: 1,
    fontSize: 12, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, overflow: 'hidden',
  },
  prizeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  prizeBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#141b28',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prizeMedal: { fontSize: 22 },
  prizeAmount: { color: colors.gold, fontSize: 16, fontWeight: '900', marginTop: 4 },
  prizeRank: { color: colors.textTertiary, fontSize: 10, marginTop: 2 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  joinBtnText: { color: '#0b0e14', fontWeight: '900', fontSize: 15, letterSpacing: 1, marginLeft: 8 },
  joinedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12241a',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.success,
  },
  joinedText: { color: colors.success, fontWeight: '800', fontSize: 14, marginLeft: 8 },
  claimNote: { color: colors.textTertiary, fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 15 },

  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 4,
  },
  podiumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  podiumFirst: { borderColor: colors.gold, backgroundColor: '#1f1a0c' },
  podiumMedal: { fontSize: 26 },
  podiumName: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 6, maxWidth: '100%' },
  podiumPoints: { color: colors.gold, fontSize: 14, fontWeight: '800', marginTop: 4 },
  podiumWins: { color: colors.textTertiary, fontSize: 10, marginTop: 2 },

  lbList: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161d2b',
  },
  lbRowMe: { backgroundColor: '#1f1a0c' },
  lbRank: { color: colors.textSecondary, fontSize: 14, fontWeight: '800', width: 34 },
  lbRankTop: { fontSize: 18 },
  lbName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', flex: 1, marginLeft: 4 },
  lbNameMe: { color: colors.gold, fontWeight: '800' },
  lbWdl: { color: colors.textTertiary, fontSize: 12, marginRight: 14 },
  lbPoints: { color: colors.gold, fontSize: 16, fontWeight: '900', width: 44, textAlign: 'right' },

  emptyBox: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: colors.textTertiary, fontSize: 13, textAlign: 'center', marginTop: 10, paddingHorizontal: 20, lineHeight: 18 },

  adminBox: {
    marginTop: 22,
    backgroundColor: '#171017',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a2a2a',
    padding: 14,
  },
  adminHeader: { flexDirection: 'row', alignItems: 'center' },
  adminTitle: { color: colors.gold, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginLeft: 6 },
  adminNote: { color: colors.textTertiary, fontSize: 11, marginTop: 6, lineHeight: 15 },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#241014',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  adminBtnText: { color: colors.danger, fontWeight: '800', fontSize: 13, marginLeft: 8 },
});
