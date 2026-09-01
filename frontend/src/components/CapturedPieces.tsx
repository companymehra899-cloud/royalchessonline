import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CapturedPiecesProps {
  /** Array of captured piece type chars: p, n, b, r, q, k */
  pieces: string[];
  /** Color of the captured pieces (whose pieces were taken) */
  color: 'w' | 'b';
  size?: number;
}

const PIECE_ICON: Record<string, string> = {
  p: 'chess-pawn',
  n: 'chess-knight',
  b: 'chess-bishop',
  r: 'chess-rook',
  q: 'chess-queen',
  k: 'chess-king',
};

// Sort by value so the row reads consistently (pawns first, queen last).
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ pieces, color, size = 20 }) => {
  const list = Array.isArray(pieces) ? pieces : [];
  if (list.length === 0) return null;

  const sorted = [...list].sort((a, b) => PIECE_VALUE[a] - PIECE_VALUE[b]);
  const iconColor = color === 'w' ? '#F0F0F0' : '#4a4a4a';

  return (
    <View style={styles.container}>
      {sorted.map((p, i) => (
        <MaterialCommunityIcons
          key={`${p}-${i}`}
          name={PIECE_ICON[p] || 'chess-pawn'}
          size={size}
          color={iconColor}
          style={styles.piece}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  piece: {
    marginRight: 1,
  },
});
