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

  // Layered elliptical ground shadow under the base so the piece reads as a 3D
  // object sitting on the board instead of a flat sticker.
  const shadowWidth = renderedWidth * 0.7;
  const shadowHeight = shadowWidth * 0.16;
  const shadowLeft = (size - shadowWidth) / 2;
  const shadowBottom = size * 0.012;
  const innerShadowWidth = shadowWidth * 0.62;
  const innerShadowHeight = shadowHeight * 0.62;
  const innerShadowLeft = shadowLeft + (shadowWidth - innerShadowWidth) / 2;
  const innerShadowBottom = shadowBottom + shadowHeight * 0.2;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${colorName} ${PIECE_NAMES[type]}`}
      style={[styles.container, { width: size, height: size }]}
    >
      {/* Soft outer ground shadow */}
      <View
        style={[
          styles.groundShadowOuter,
          { width: shadowWidth, height: shadowHeight, left: shadowLeft, bottom: shadowBottom },
        ]}
      />
      {/* Denser inner ground shadow near the base */}
      <View
        style={[
          styles.groundShadowInner,
          {
            width: innerShadowWidth,
            height: innerShadowHeight,
            left: innerShadowLeft,
            bottom: innerShadowBottom,
          },
        ]}
      />
      {/* Offset cast silhouette shadow for elevation */}
      <Image
        source={PIECE_IMAGES[color][type]}
        resizeMode={resizeMode}
        style={[
          styles.castShadow,
          { width: renderedWidth, height: renderedHeight, left: left + 0.75, top: top + 1.5 },
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
  groundShadowOuter: ViewStyle;
  groundShadowInner: ViewStyle;
}>({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pieceImage: {
    position: 'absolute',
  },
  castShadow: {
    position: 'absolute',
    tintColor: '#000000',
    opacity: 0.08,
  },
  groundShadowOuter: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  groundShadowInner: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
});