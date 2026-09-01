import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import { UserProfile } from '../types/chess';
import { useAuth } from '../context/AuthContext';
import { CountryFlag } from '../components/CountryFlag';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface LeaderboardScreenProps {
  onBack: () => void;
  onOpenSettings: () => void;
}

type FilterMode = 'global' | 'national';

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, onOpenSettings }) => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('global');

  const userCountry = user?.country;
  const isNational = filter === 'national' && !!userCountry;

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isNational) params.set('country', userCountry!);
      const url = `${BACKEND_URL}/api/leaderboard?${params.toString()}`;
      const res = await fetch(url);
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
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rankings</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onOpenSettings}>
          <MaterialCommunityIcons name="cog-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Toggle */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'global' && styles.filterTabActive]}
          onPress={() => setFilter('global')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="earth"
            size={18}
            color={filter === 'global' ? '#0b0e14' : colors.textSecondary}
          />
          <Text style={[styles.filterText, filter === 'global' && styles.filterTextActive]}>
            Global
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'national' && styles.filterTabNational]}
          onPress={() => setFilter('national')}
          activeOpacity={0.8}
        >
          {userCountry ? (
            <CountryFlag code={userCountry} size={16} />
          ) : (
            <MaterialCommunityIcons name="flag-outline" size={18} color={colors.textSecondary} />
          )}
          <Text style={[styles.filterText, filter === 'national' && styles.filterTextActive]}>
            National
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leaderboard List */}
      <View style={styles.listContainer}>
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
                <View style={styles.playerRow}>
                  {/* Rank */}
                  <View style={styles.rankCol}>
                    {isTop3 ? (
                      <MaterialCommunityIcons name="trophy" size={20} color={medalColor} />
                    ) : (
                      <Text style={styles.rankNum}>#{rank}</Text>
                    )}
                  </View>

                  {/* Country Flag */}
                  <View style={styles.flagCol}>
                    <CountryFlag code={item.country} size={24} />
                  </View>

                  {/* Player Name */}
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{item.username}</Text>
                    <Text style={styles.playerStats}>
                      {item.games_played || 0} games • {item.wins || 0} wins
                    </Text>
                  </View>

                  {/* Rating */}
                  <View style={styles.ratingCol}>
                    <MaterialCommunityIcons
                      name="chart-bar"
                      size={16}
                      color="#ff5722"
                    />
                    <Text style={styles.ratingNum}>{item.rating || 1200}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
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
    backgroundColor: '#184e68',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerBtn: {
    padding: 6,
  },
  filterBar: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#ffe8c6',
  },
  filterTabNational: {
    backgroundColor: '#ff9800',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#0b0e14',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#fffaf0',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e0d0',
  },
  rankCol: {
    width: 42,
    alignItems: 'center',
  },
  rankNum: {
    color: '#555',
    fontSize: 15,
    fontWeight: '700',
  },
  flagCol: {
    marginLeft: 8,
    marginRight: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  playerStats: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  ratingCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingNum: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
