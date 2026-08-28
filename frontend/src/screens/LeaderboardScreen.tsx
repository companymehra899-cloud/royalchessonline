import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { UserProfile } from '../types/chess';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface LeaderboardScreenProps {
  onBack: () => void;
  onOpenSettings: () => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, onOpenSettings }) => {
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (e) {
      console.log('Error fetching leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TOP PLAYERS</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onOpenSettings}>
          <MaterialCommunityIcons name="cog-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const medalColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : colors.textTertiary;

            return (
              <View style={[styles.playerRow, rank === 1 && styles.playerRowFirst]}>
                <View style={styles.rankCol}>
                  {isTop3 ? (
                    <MaterialCommunityIcons name="trophy" size={22} color={medalColor} />
                  ) : (
                    <Text style={styles.rankNum}>{rank}</Text>
                  )}
                </View>

                <View style={styles.avatarMini}>
                  <MaterialCommunityIcons name="chess-knight" size={20} color={colors.gold} />
                </View>

                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{item.username}</Text>
                  <Text style={styles.playerStats}>{item.games_played || 0} games • {item.wins || 0} wins</Text>
                </View>

                <View style={styles.ratingCol}>
                  <Text style={styles.ratingNum}>{item.rating || 1200}</Text>
                  <Text style={styles.ratingSub}>ELO</Text>
                </View>
              </View>
            );
          }}
        />
      )}
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
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerRowFirst: {
    borderColor: colors.gold,
    backgroundColor: '#1b202c',
  },
  rankCol: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '800',
  },
  avatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1b2333',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  playerStats: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  ratingCol: {
    alignItems: 'flex-end',
  },
  ratingNum: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '800',
  },
  ratingSub: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
  },
});
