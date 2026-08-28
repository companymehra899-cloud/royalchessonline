import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface ChessPieceProps {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
  size?: number;
  theme?: 'classic' | 'luxury' | 'modern';
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, size = 36, theme = 'classic' }) => {
  const isWhite = color === 'w';

  const iconMap: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    p: 'chess-pawn',
    n: 'chess-knight',
    b: 'chess-bishop',
    r: 'chess-rook',
    q: 'chess-queen',
    k: 'chess-king',
  };

  const iconName = iconMap[type] || 'chess-pawn';

  let pieceColor = isWhite ? '#ffffff' : '#1e2430';
  let strokeColor = isWhite ? '#caa134' : '#0a0d13';

  if (theme === 'luxury') {
    pieceColor = isWhite ? '#ffe79a' : '#2d281e';
    strokeColor = isWhite ? '#c49724' : '#d4af37';
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <MaterialCommunityIcons
        name={iconName}
        size={size}
        color={strokeColor}
        style={styles.shadowPiece}
      />
      <MaterialCommunityIcons
        name={iconName}
        size={size - 2}
        color={pieceColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowPiece: {
    position: 'absolute',
    top: 1,
    left: 1,
    opacity: 0.8,
  },
});
