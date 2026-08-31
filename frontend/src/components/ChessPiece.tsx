import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';

interface ChessPieceProps {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
  size?: number;
  theme?: 'classic' | 'luxury' | 'modern';
}

type PieceType = ChessPieceProps['type'];

// Full-body transparent product cutouts based on the user's physical Staunton set.
// ChessBoard still owns sizing, placement and every interaction.
const PIECE_IMAGES: Record<'w' | 'b', Record<PieceType, ImageSourcePropType>> = {
  w: {
    k: require('../../assets/pieces/wk.png'),
    q: require('../../assets/pieces/wq.png'),
    r: require('../../assets/pieces/wr.png'),
    b: require('../../assets/pieces/wb.png'),
    n: require('../../assets/pieces/wn.png'),
    p: require('../../assets/pieces/wp.png'),
  },
  b: {
    k: require('../../assets/pieces/bk.png'),
    q: require('../../assets/pieces/bq.png'),
    r: require('../../assets/pieces/br.png'),
    b: require('../../assets/pieces/bb.png'),
    n: require('../../assets/pieces/bn.png'),
    p: require('../../assets/pieces/bp.png'),
  },
};

const PIECE_NAMES: Record<PieceType, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};

export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, size = 36 }) => {
  const colorName = color === 'w' ? 'White' : 'Black';
  const isRoyal = type === 'k' || type === 'q';
  const widthMultiplier = type === 'b' ? 1.1 : 1;
  const renderedWidth = isRoyal ? size * 1.17 : size * 1.19 * widthMultiplier;
  const renderedHeight = isRoyal ? size * 0.819 : size * (type === 'p' ? 0.79 : 0.9);
  const resizeMode = isRoyal ? 'stretch' : 'contain';
  const left = (size - renderedWidth) / 2;
  const top = size - renderedHeight;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${colorName} ${PIECE_NAMES[type]}`}
      style={[styles.container, { width: size, height: size }]}
    >
      <Image
        source={PIECE_IMAGES[color][type]}
        resizeMode={resizeMode}
        style={[
          styles.castShadow,
          { width: renderedWidth, height: renderedHeight, left, top: top + 1.5 },
        ]}
      />
      <Image
        source={PIECE_IMAGES[color][type]}
        resizeMode={resizeMode}
        style={[styles.pieceImage, { width: renderedWidth, height: renderedHeight, left, top }]}
      />
    </View>
  );
};

const styles = StyleSheet.create<{
  container: ViewStyle;
  pieceImage: ImageStyle;
  castShadow: ImageStyle;
}>({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.46,
    shadowRadius: 3,
  },
  pieceImage: {
    position: 'absolute',
  },
  castShadow: {
    position: 'absolute',
    tintColor: '#000000',
    opacity: 0.24,
  },
});