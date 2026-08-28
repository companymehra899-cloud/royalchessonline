import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface GameOverModalProps {
  visible: boolean;
  result: 'win' | 'loss' | 'draw';
  reason: string;
  eloDelta: number;
  newRating: number;
  movesCount: number;
  onPlayAgain: () => void;
  onAnalyze?: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  visible,
  result,
  reason,
  eloDelta,
  newRating,
  movesCount,
  onPlayAgain,
  onAnalyze,
  onHome,
}) => {
  const isWin = result === 'win';
  const isDraw = result === 'draw';

  const resultTitle = isWin ? 'VICTORY!' : isDraw ? 'DRAW' : 'DEFEAT';
  const resultColor = isWin ? colors.gold : isDraw ? colors.textSecondary : colors.danger;
  const iconName = isWin ? 'trophy' : isDraw ? 'handshake' : 'flag-variant';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onHome}>
      <View style={styles.overlay}>
        <View style={[styles.card, { borderColor: isWin ? colors.gold : colors.border }]}>
          <View style={[styles.iconBadge, { backgroundColor: isWin ? '#2b2311' : '#1f2430' }]}>
            <MaterialCommunityIcons name={iconName} size={48} color={resultColor} />
          </View>

          <Text style={[styles.title, { color: resultColor }]}>{resultTitle}</Text>
          <Text style={styles.reasonText}>
            {reason ? reason.replace('_', ' ').toUpperCase() : 'GAME OVER'}
          </Text>

          <View style={styles.statsCard}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>RATING</Text>
              <Text style={styles.statVal}>{newRating}</Text>
              <Text style={[styles.eloBadge, { color: eloDelta >= 0 ? colors.success : colors.danger }]}>
                {eloDelta >= 0 ? `+${eloDelta}` : `${eloDelta}`} ELO
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>MOVES</Text>
              <Text style={styles.statVal}>{movesCount}</Text>
              <Text style={styles.movesSub}>Turns</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={onPlayAgain} activeOpacity={0.8}>
            <MaterialCommunityIcons name="refresh" size={20} color="#0b0e14" />
            <Text style={styles.primaryBtnText}>PLAY AGAIN</Text>
          </TouchableOpacity>

          {onAnalyze && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onAnalyze} activeOpacity={0.8}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.gold} />
              <Text style={styles.secondaryBtnText}>ANALYZE GAME</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.textButton} onPress={onHome} activeOpacity={0.8}>
            <Text style={styles.textBtnText}>Return to Home</Text>
          </TouchableOpacity>
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
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 2,
    alignItems: 'center',
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  eloBadge: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  movesSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#0b0e14',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 1.5,
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: colors.gold,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  textButton: {
    paddingVertical: 8,
  },
  textBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
