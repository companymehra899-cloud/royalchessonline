import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { ChessPiece } from './ChessPiece';
import { colors } from '../theme/colors';

interface PromotionModalProps {
  visible: boolean;
  color: 'w' | 'b';
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ visible, color, onSelect, onCancel }) => {
  const pieces: Array<'q' | 'r' | 'b' | 'n'> = ['q', 'r', 'b', 'n'];
  const labels = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Promote Pawn</Text>
          <Text style={styles.subtitle}>Choose your promotion piece</Text>

          <View style={styles.pieceRow}>
            {pieces.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.pieceButton}
                onPress={() => onSelect(p)}
                activeOpacity={0.7}
              >
                <ChessPiece type={p} color={color} size={48} />
                <Text style={styles.pieceLabel}>{labels[p]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gold,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  pieceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  pieceButton: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 68,
  },
  pieceLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
});
