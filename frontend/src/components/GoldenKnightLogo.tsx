import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';

interface Props {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
}

export const GoldenKnightLogo: React.FC<Props> = ({ size = 'medium', showSubtitle = true }) => {
  const iconSize = size === 'large' ? 68 : size === 'medium' ? 48 : 32;
  const titleSize = size === 'large' ? 24 : size === 'medium' ? 18 : 14;

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { width: iconSize + 24, height: iconSize + 24 }]}>
        <MaterialCommunityIcons name="chess-knight" size={iconSize} color={colors.gold} />
      </View>
      <Text style={[styles.title, { fontSize: titleSize }]}>ROYAL CHESS</Text>
      {showSubtitle && <Text style={styles.subtitle}>MASTER YOUR MOVES</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  iconCircle: {
    borderRadius: 999,
    backgroundColor: '#161d2b',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    color: colors.gold,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 2.5,
    marginTop: 4,
    fontWeight: '600',
  },
});
