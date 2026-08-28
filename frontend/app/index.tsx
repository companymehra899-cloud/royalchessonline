import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { GameSettingsProvider, useGameSettings } from '../src/context/GameSettingsContext';
import { AuthScreen } from '../src/screens/AuthScreen';
import { HomeScreen } from '../src/screens/HomeScreen';
import { MatchScreen } from '../src/screens/MatchScreen';
import { ProfileScreen } from '../src/screens/ProfileScreen';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { PuzzlesScreen } from '../src/screens/PuzzlesScreen';
import { LeaderboardScreen } from '../src/screens/LeaderboardScreen';
import { OnlineModal } from '../src/screens/OnlineModal';
import { BottomTabBar, TabType } from '../src/components/BottomTabBar';
import { colors } from '../src/theme/colors';
import { GameMode, AIDifficulty } from '../src/types/chess';

function MainApp() {
  const { user, loading } = useAuth();
  const { difficulty } = useGameSettings();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [currentMatch, setCurrentMatch] = useState<{
    mode: GameMode;
    difficulty?: AIDifficulty;
    roomCode?: string;
  } | null>(null);
  const [onlineModalVisible, setOnlineModalVisible] = useState(false);

  // If in active match
  if (currentMatch) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <MatchScreen
          mode={currentMatch.mode}
          difficulty={currentMatch.difficulty || difficulty}
          onBack={() => setCurrentMatch(null)}
          onOpenSettings={() => {
            setCurrentMatch(null);
            setActiveTab('settings');
          }}
        />
      </View>
    );
  }

  // If unauthenticated and no demo/guest user
  if (!user && !loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <AuthScreen />
      </View>
    );
  }

  const handleSelectGameMode = (mode: GameMode) => {
    if (mode === 'online') {
      setOnlineModalVisible(true);
    } else if (mode === 'daily') {
      setActiveTab('puzzles');
    } else {
      setCurrentMatch({ mode, difficulty });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            onSelectMode={handleSelectGameMode}
            onOpenPuzzles={() => setActiveTab('puzzles')}
            onOpenLeaderboard={() => setActiveTab('games')}
            onOpenSettings={() => setActiveTab('settings')}
            onOpenProfile={() => setActiveTab('profile')}
          />
        );
      case 'games':
        return (
          <LeaderboardScreen
            onBack={() => setActiveTab('home')}
            onOpenSettings={() => setActiveTab('settings')}
          />
        );
      case 'puzzles':
        return (
          <PuzzlesScreen
            onBack={() => setActiveTab('home')}
            onOpenSettings={() => setActiveTab('settings')}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            onBack={() => setActiveTab('home')}
            onOpenSettings={() => setActiveTab('settings')}
          />
        );
      case 'settings':
        return <SettingsScreen onBack={() => setActiveTab('home')} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.contentArea}>{renderTabContent()}</View>
      <BottomTabBar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Online Matchmaking / Room Modal */}
      <OnlineModal
        visible={onlineModalVisible}
        onClose={() => setOnlineModalVisible(false)}
        onStartGame={(roomCode) => {
          setCurrentMatch({ mode: 'online', roomCode });
        }}
      />
    </View>
  );
}

export default function Index() {
  return (
    <AuthProvider>
      <GameSettingsProvider>
        <MainApp />
      </GameSettingsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentArea: {
    flex: 1,
  },
});