import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import { GameMode } from '../types/chess';

interface HomeScreenProps {
  onSelectMode: (mode: GameMode, options?: any) => void;
  onOpenPuzzles: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenLeague: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectMode,
  onOpenPuzzles,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenProfile,
  onOpenLeague,
}) => {
  const { user } = useAuth();

  const username = user?.username || 'Player';
  const rating = user?.rating || 1200;
  const gamesPlayed = user?.games_played || 0;

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={onOpenSettings}>
          <MaterialCommunityIcons name="menu" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ROYAL CHESS</Text>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => {}}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={colors.textPrimary} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <TouchableOpacity style={styles.userCard} testID="user-profile-card" onPress={onOpenProfile} activeOpacity={0.85}>
          <UserAvatar
            avatarId={user?.avatar_id}
            avatarUrl={user?.avatar_url}
            size={52}
            iconSize={32}
            borderColor={colors.gold}
            borderWidth={2}
          />
          <View style={styles.userInfo}>
            <Text style={styles.welcomeSub}>Welcome back,</Text>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{username}</Text>
              <MaterialCommunityIcons name="crown" size={18} color={colors.gold} style={{ marginLeft: 6 }} />
            </View>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingLabel}>RATING</Text>
            <View style={styles.ratingValRow}>
              <MaterialCommunityIcons name="trophy-outline" size={16} color={colors.gold} />
              <Text style={styles.ratingVal}>{rating}</Text>
            </View>
            <Text style={styles.gamesCount}>{gamesPlayed} games</Text>
          </View>
        </TouchableOpacity>

        {/* Play Online Gold Hero Banner */}
        <TouchableOpacity
          style={styles.onlineHeroBanner}
          testID="play-online-button"
          onPress={() => onSelectMode('online')}
          activeOpacity={0.85}
        >
          <View style={styles.onlineIconCircle}>
            <MaterialCommunityIcons name="earth" size={30} color={colors.gold} />
          </View>
          <View style={styles.onlineTextCol}>
            <Text style={styles.onlineHeroTitle}>PLAY ONLINE</Text>
            <Text style={styles.onlineHeroSub}>Challenge real players</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={28} color={colors.gold} />
        </TouchableOpacity>

        {/* Chess League Banner */}
        <TouchableOpacity
          style={styles.leagueBanner}
          testID="open-league-button"
          onPress={onOpenLeague}
          activeOpacity={0.85}
        >
          <View style={styles.leagueIconCircle}>
            <MaterialCommunityIcons name="trophy-variant" size={28} color={colors.gold} />
          </View>
          <View style={styles.onlineTextCol}>
            <Text style={styles.onlineHeroTitle}>CHESS LEAGUE</Text>
            <Text style={styles.onlineHeroSub}>3-day season · 1st: 1000 badges</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={28} color={colors.gold} />
        </TouchableOpacity>

        <View style={styles.grid}>
          {/* Play Computer */}
          <TouchableOpacity
            style={styles.gridCard}
            testID="play-computer-button"
            onPress={() => onSelectMode('computer')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="robot" size={36} color={colors.textPrimary} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>PLAY COMPUTER</Text>
            <Text style={styles.cardSub}>Play vs AI</Text>
          </TouchableOpacity>

          {/* Play with Friend */}
          <TouchableOpacity
            style={styles.gridCard}
            testID="play-friend-button"
            onPress={() => onSelectMode('friend')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="account-multiple" size={36} color={colors.textPrimary} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>PLAY WITH FRIEND</Text>
            <Text style={styles.cardSub}>Local multiplayer</Text>
          </TouchableOpacity>

          {/* Puzzles */}
          <TouchableOpacity
            style={styles.gridCard}
            testID="puzzles-button"
            onPress={onOpenPuzzles}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="puzzle" size={36} color={colors.textPrimary} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>PUZZLES</Text>
            <Text style={styles.cardSub}>Improve your skills</Text>
          </TouchableOpacity>

          {/* Leaderboard */}
          <TouchableOpacity
            style={styles.gridCard}
            testID="leaderboard-button"
            onPress={onOpenLeaderboard}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="trophy" size={36} color={colors.gold} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>LEADERBOARD</Text>
            <Text style={styles.cardSub}>Top players</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Challenge Card */}
        <TouchableOpacity
          style={styles.dailyCard}
          testID="daily-challenge-button"
          onPress={() => onSelectMode('daily')}
          activeOpacity={0.85}
        >
          <View style={styles.dailyIconBox}>
            <MaterialCommunityIcons name="calendar-check" size={28} color={colors.gold} />
          </View>
          <View style={styles.dailyTextCol}>
            <Text style={styles.dailyTitle}>DAILY CHALLENGE</Text>
            <Text style={styles.dailySub}>Solve puzzle and earn rewards!</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
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
    color: colors.gold,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerIconBtn: {
    padding: 6,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1b2333',
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  welcomeSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  ratingBadge: {
    alignItems: 'flex-end',
  },
  ratingLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  ratingValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingVal: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 4,
  },
  gamesCount: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  onlineHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b2114',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  onlineIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2e2612',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  onlineTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  leagueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161d2b',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  leagueIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2e2612',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  onlineHeroTitle: {
    color: colors.gold,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  onlineHeroSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIcon: {
    marginBottom: 10,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dailyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#242014',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dailyTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  dailyTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dailySub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
