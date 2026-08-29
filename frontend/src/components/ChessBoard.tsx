import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Chess, Square, Move } from 'chess.js';
import { ChessPiece } from './ChessPiece';
import { PromotionModal } from './PromotionModal';
import { colors, BoardThemeKey } from '../theme/colors';
import { soundManager } from '../utils/audio';

interface ChessBoardProps {
  game: Chess;
  flipped?: boolean;
  boardTheme?: BoardThemeKey;
  pieceTheme?: 'classic' | 'luxury' | 'modern';
  lastMove?: { from: string; to: string } | null;
  hintMove?: { from: string; to: string } | null;
  interactive?: boolean;
  onMove: (move: { from: string; to: string; promotion?: string }) => void;
  confirmMoveEnabled?: boolean;
  onPendingMove?: (move: { from: string; to: string; promotion?: string } | null) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
// Frame thickness around the play area (the wooden border). Subtracted from the
// available width so the whole framed board stays within the viewport on mobile.
const FRAME_WIDTH = Math.max(7, Math.round(Math.min(SCREEN_WIDTH - 24, 390) * 0.028));
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 24 - FRAME_WIDTH * 2, 390);
const SQUARE_SIZE = Math.floor(BOARD_SIZE / 8);

export const ChessBoard: React.FC<ChessBoardProps> = ({
  game,
  flipped = false,
  boardTheme = 'wood',
  pieceTheme = 'classic',
  lastMove,
  hintMove,
  interactive = true,
  onMove,
  confirmMoveEnabled = false,
  onPendingMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  const currentBoardTheme = colors.boards[boardTheme] || colors.boards.wood;
  const boardState = game.board();
  const inCheck = game.inCheck();
  const currentTurn = game.turn();

  // Get King position if in check
  let checkKingSquare: string | null = null;
  if (inCheck) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = boardState[r][c];
        if (p && p.type === 'k' && p.color === currentTurn) {
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          checkKingSquare = `${files[c]}${8 - r}`;
        }
      }
    }
  }

  const handleSquarePress = (sqName: Square) => {
    if (!interactive) return;

    // If already selected a square and tapping a legal target square
    if (selectedSquare) {
      const isLegal = legalMoves.find((m) => m.to === sqName);

      if (isLegal) {
        // Check for promotion
        const piece = game.get(selectedSquare);
        const isPawn = piece?.type === 'p';
        const isPromoRank = (piece?.color === 'w' && sqName.endsWith('8')) || (piece?.color === 'b' && sqName.endsWith('1'));

        if (isPawn && isPromoRank) {
          setPendingPromotion({ from: selectedSquare, to: sqName });
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }

        executeMove({ from: selectedSquare, to: sqName });
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
    }

    // Tapping on own piece
    const piece = game.get(sqName);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(sqName);
      const moves = game.moves({ square: sqName, verbose: true }) as Move[];
      setLegalMoves(moves);
      soundManager.playMove();
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
      if (onPendingMove) onPendingMove(null);
    }
  };

  const executeMove = (mv: { from: string; to: string; promotion?: string }) => {
    if (confirmMoveEnabled && onPendingMove) {
      onPendingMove(mv);
      return;
    }
    onMove(mv);
  };

  const handlePromotionSelect = (promotedPiece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;
    executeMove({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: promotedPiece });
    setPendingPromotion(null);
  };

  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  return (
    <View style={styles.boardWrapper}>
      <LinearGradient
        colors={['#5b3e25', '#3e2719', '#2c1a0d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.frame, { padding: FRAME_WIDTH }]}
      >
      <View style={[styles.boardContainer, { width: SQUARE_SIZE * 8, height: SQUARE_SIZE * 8 }]}>
        {ranks.map((rank, rankIdx) => (
          <View key={`rank-${rank}`} style={styles.row}>
            {files.map((file, fileIdx) => {
              const sqName = `${file}${rank}` as Square;
              const isLight = (rankIdx + fileIdx) % 2 === 0;
              const squareBg = isLight ? currentBoardTheme.light : currentBoardTheme.dark;
              const piece = game.get(sqName);

              const isSelected = selectedSquare === sqName;
              const isLastMove = lastMove && (lastMove.from === sqName || lastMove.to === sqName);
              const isHint = hintMove && (hintMove.from === sqName || hintMove.to === sqName);
              const isCheckKing = checkKingSquare === sqName;

              const legalMoveTarget = legalMoves.find((m) => m.to === sqName);
              const isCaptureTarget = legalMoveTarget && piece && piece.color !== game.turn();

              return (
                <TouchableOpacity
                  key={sqName}
                  testID={`square-${sqName}`}
                  activeOpacity={0.85}
                  onPress={() => handleSquarePress(sqName)}
                  style={[
                    styles.square,
                    styles.squareBevel,
                    {
                      width: SQUARE_SIZE,
                      height: SQUARE_SIZE,
                      backgroundColor: squareBg,
                    },
                    isLastMove && { backgroundColor: currentBoardTheme.highlight },
                    isSelected && { backgroundColor: currentBoardTheme.selected },
                    isCheckKing && styles.checkSquare,
                    isHint && styles.hintSquare,
                  ]}
                >
                  {/* Piece Render */}
                  {piece && (
                    <ChessPiece
                      type={piece.type}
                      color={piece.color}
                      size={SQUARE_SIZE * 0.9}
                      theme={pieceTheme}
                    />
                  )}

                  {/* Legal Move Dot */}
                  {legalMoveTarget && !piece && <View style={styles.legalDot} />}

                  {/* Legal Capture Ring */}
                  {isCaptureTarget && <View style={styles.captureRing} />}

                  {/* Rank & File coordinate notation labels */}
                  {fileIdx === 0 && (
                    <Text
                      style={[
                        styles.coordRank,
                        { color: isLight ? currentBoardTheme.dark : currentBoardTheme.light },
                      ]}
                    >
                      {rank}
                    </Text>
                  )}
                  {rankIdx === 7 && (
                    <Text
                      style={[
                        styles.coordFile,
                        { color: isLight ? currentBoardTheme.dark : currentBoardTheme.light },
                      ]}
                    >
                      {file}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
      </LinearGradient>

      {/* Promotion Modal */}
      <PromotionModal
        visible={!!pendingPromotion}
        color={game.turn()}
        onSelect={handlePromotionSelect}
        onCancel={() => setPendingPromotion(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  boardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  // Rich walnut wooden frame with a polished beveled edge and premium drop shadow.
  frame: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 220, 170, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  boardContainer: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(20, 12, 4, 0.55)', // thin inner groove between frame and play area
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // Slight 3D bevel between tiles: a light top-left edge, a dark bottom-right edge.
  squareBevel: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 240, 210, 0.07)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 240, 210, 0.07)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.11)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 0, 0, 0.11)',
  },
  checkSquare: {
    backgroundColor: 'rgba(210, 55, 45, 0.48)',
  },
  hintSquare: {
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.6)',
  },
  legalDot: {
    width: Math.max(10, SQUARE_SIZE * 0.22),
    height: Math.max(10, SQUARE_SIZE * 0.22),
    borderRadius: Math.max(5, SQUARE_SIZE * 0.11),
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
  },
  captureRing: {
    position: 'absolute',
    width: SQUARE_SIZE - 6,
    height: SQUARE_SIZE - 6,
    borderRadius: (SQUARE_SIZE - 6) / 2,
    borderWidth: 2.5,
    borderColor: 'rgba(0, 0, 0, 0.38)',
  },
  coordRank: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.72,
  },
  coordFile: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.72,
  },
});
