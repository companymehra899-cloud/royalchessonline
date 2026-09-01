import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';

export type TabType = 'home' | 'games' | 'puzzles' | 'profile' | 'settings';

interface BottomTabBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onSelectTab }) => {
  const tabs: Array<{ id: TabType; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
    { id: 'home', label: 'HOME', icon: 'home' },
    { id: 'games', label: 'GAMES', icon: 'chess-knight' },
    { id: 'puzzles', label: 'PUZZLES', icon: 'puzzle' },
    { id: 'profile', label: 'PROFILE', icon: 'account' },
    { id: 'settings', label: 'SETTINGS', icon: 'cog' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const iconColor = isActive ? colors.gold : colors.textTertiary;
        return (
          <TouchableOpacity
            key={tab.id}
            testID={`tab-${tab.id}`}
            style={styles.tabItem}
            onPress={() => onSelectTab(tab.id)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name={tab.icon} size={24} color={iconColor} />
            <Text style={[styles.tabLabel, { color: iconColor, fontWeight: isActive ? '700' : '500' }]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0c0f17',
    borderTopWidth: 1,
    borderTopColor: '#1a2233',
    paddingTop: 8,
    paddingBottom: 22,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 64,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 24,
    height: 2,
    backgroundColor: colors.gold,
    borderRadius: 1,
  },
});
