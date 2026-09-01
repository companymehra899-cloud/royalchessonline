import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Chess } from 'chess.js';
import { colors } from '../theme/colors';
import { ChessBoard } from '../components/ChessBoard';
import { GameOverModal } from '../components/GameOverModal';
import { GameChat } from '../components/GameChat';
import { CapturedPieces } from '../components/CapturedPieces';
import { ConfirmBackModal } from '../components/ConfirmBackModal';
import { useAuth } from '../context/AuthContext';
import { useGameSettings } from '../context/GameSettingsContext';
import { soundManager } from '../utils/audio';
import { UserAvatar } from '../components/UserAvatar';
import { GameMode, AIDifficulty } from '../types/chess';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface MatchScreenProps {
  mode: GameMode;
  difficulty?: AIDifficulty;
  roomCode?: string;
  onBack: () => void;
  onOpenSettings: () => void;
}

export const MatchScreen: React.FC<MatchScreenProps> = ({
  mode,
  difficulty = 'easy',
  roomCode,
  onBack,
  onOpenSettings,
}) => {
  const { user, token, updateUserStats } = useAuth();
  const { boardTheme, pieceTheme, moveConfirm } = useGameSettings();

  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(() => game.fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveHistory, setMoveHistory] = useState<Array<{ from: string; to: string; san: string }>>([]);

  // Timers (in seconds)
  const [playerTime, setPlayerTime] = useState(10 * 60);
  const [opponentTime, setOpponentTime] = useState(10 * 60);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Game Over state
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<'win' | 'loss' | 'draw'>('draw');
  const [gameReason, setGameReason] = useState('');
  const [eloDelta, setEloDelta] = useState(0);

  // Move confirm pending move
  const [pendingConfirmMove, setPendingConfirmMove] = useState<{ from: string; to: string; promotion?: string } | null>(null);

  // Captured pieces, keyed by the color that captured them.
  // capturedPieces.white = black pieces taken by the player; capturedPieces.black = white pieces taken by the opponent.
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[]; black: string[] }>({ white: [], black: [] });

  // Back-navigation confirmation popup
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const timerRef = useRef<any>(null);

  // Clock timer countdown
  useEffect(() => {
    if (gameOver) return;

    timerRef.current = setInterval(() => {
      if (game.turn() === 'w') {
        setPlayerTime((prev) => {
          if (prev <= 1) {
            handleTimeout('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setOpponentTime((prev) => {
          if (prev <= 1) {
            handleTimeout('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [game, gameOver]);

  const handleTimeout = (timedOutColor: 'w' | 'b') => {
    const result = timedOutColor === 'w' ? 'loss' : 'win';
    finishGame(result, 'Time Out');
  };

  // Trigger AI move if it's black's turn in computer mode
  useEffect(() => {
    if (mode === 'computer' && game.turn() === 'b' && !gameOver) {
      makeAiMove();
    }
  }, [fen, gameOver]);

  const makeAiMove = async () => {
    setIsAiThinking(true);
    try {
      // Short artificial delay for natural feel
      await new Promise((resolve) => setTimeout(resolve, 500));

      const res = await fetch(`${BACKEND_URL}/api/chess/ai-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: game.fen(), difficulty }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.move) {
          executeMove(data.move, true);
        }
      } else {
        // Fallback random legal move
        const moves = game.moves({ verbose: true });
        if (moves.length > 0) {
          const rnd = moves[Math.floor(Math.random() * moves.length)];
          executeMove({ from: rnd.from, to: rnd.to, promotion: rnd.promotion }, true);
        }
      }
    } catch (e) {
      console.log('AI Move error:', e);
      const moves = game.moves({ verbose: true });
      if (moves.length > 0) {
        const rnd = moves[0];
        executeMove({ from: rnd.from, to: rnd.to, promotion: rnd.promotion }, true);
      }
    } finally {
      setIsAiThinking(false);
    }
  };

  const executeMove = (mv: { from: string; to: string; promotion?: string }, isOpponent: boolean = false) => {
    try {
      const moveResult = game.move({
        from: mv.from,
        to: mv.to,
        promotion: mv.promotion || 'q',
      });

      if (!moveResult) return;

      setLastMove({ from: mv.from, to: mv.to });
      setFen(game.fen());
      setMoveHistory((prev) => [...prev, { from: mv.from, to: mv.to, san: moveResult.san }]);

      // Track captured pieces for the captured-pieces tray.
      if (moveResult.captured) {
        const mover = moveResult.color as 'w' | 'b';
        setCapturedPieces((prev) => ({
          ...prev,
          [mover]: [...prev[mover], moveResult.captured as string],
        }));
      }

      // Audio / Haptic feedback
      if (moveResult.captured) {
        soundManager.playCapture();
      } else if (game.inCheck()) {
        soundManager.playCheck();
      } else {
        soundManager.playMove();
      }

      // Check Game Over conditions
      if (game.isGameOver()) {
        if (game.isCheckmate()) {
          const winner = game.turn() === 'b' ? 'win' : 'loss';
          finishGame(winner, 'Checkmate');
        } else if (game.isDraw()) {
          finishGame('draw', 'Draw by Stalemate / Repetition');
        }
      }
    } catch (e) {
      console.log('Move error:', e);
    }
  };

  const finishGame = async (result: 'win' | 'loss' | 'draw', reason: string) => {
    setGameOver(true);
    setGameResult(result);
    setGameReason(reason);

    if (result === 'win') soundManager.playWin();
    else if (result === 'loss') soundManager.playLoss();

    const delta = result === 'win' ? 15 : result === 'loss' ? -10 : 2;
    setEloDelta(delta);
    updateUserStats(delta, result);

    // Record to MongoDB backend
    try {
      await fetch(`${BACKEND_URL}/api/games/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode,
          opponent_name: mode === 'computer' ? `Computer (${difficulty.toUpperCase()})` : 'Friend',
          player_color: 'white',
          result,
          reason,
          moves_count: moveHistory.length + 1,
          difficulty,
          pgn: game.pgn(),
        }),
      });
    } catch (e) {
      console.log('Record match error:', e);
    }
  };

  const handleUserMove = (mv: { from: string; to: string; promotion?: string }) => {
    if (mode === 'computer' && (game.turn() !== 'w' || isAiThinking)) return;
    executeMove(mv, false);
  };

  const restartGame = () => {
    const newG = new Chess();
    setGame(newG);
    setFen(newG.fen());
    setLastMove(null);
    setMoveHistory([]);
    setPlayerTime(10 * 60);
    setOpponentTime(10 * 60);
    setGameOver(false);
    setPendingConfirmMove(null);
    setCapturedPieces({ white: [], black: [] });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const opponentTitle =
    mode === 'computer'
      ? `Computer (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`
      : mode === 'friend'
      ? 'Friend (Local)'
      : 'Online Opponent';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} testID="match-back-button" onPress={() => setShowBackConfirm(true)}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>vs {opponentTitle}</Text>
        <TouchableOpacity style={styles.settingsBtn} testID="match-settings-button" onPress={onOpenSettings}>
          <MaterialCommunityIcons name="cog-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Opponent Bar */}
      <View style={styles.playerBar}>
        <View style={styles.playerInfoRow}>
          <View style={styles.avatarMini}>
            <MaterialCommunityIcons
              name={mode === 'computer' ? 'robot' : 'account'}
              size={20}
              color={colors.textSecondary}
            />
          </View>
          <View style={styles.playerNameCol}>
            <View style={styles.nameStatusRow}>
              <Text style={styles.playerName}>{opponentTitle}</Text>
              <View style={styles.greenDot} />
            </View>
            {isAiThinking && (
              <Text style={styles.thinkingText}>Thinking move...</Text>
            )}
            <CapturedPieces pieces={capturedPieces.black} color="w" size={15} />
          </View>
        </View>
        <View style={styles.timerBadge}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.timerText}>{formatTime(opponentTime)}</Text>
        </View>
      </View>

      {/* Interactive Chess Board */}
      <ChessBoard
        game={game}
        boardTheme={boardTheme}
        pieceTheme={pieceTheme}
        lastMove={lastMove}
        interactive={!gameOver && !isAiThinking}
        onMove={handleUserMove}
        confirmMoveEnabled={moveConfirm}
        onPendingMove={setPendingConfirmMove}
      />

      {/* Move Confirm Banner */}
      {!!pendingConfirmMove && (
        <View style={styles.confirmBanner}>
          <Text style={styles.confirmText}>Confirm Move: {pendingConfirmMove.from} → {pendingConfirmMove.to}?</Text>
          <View style={styles.confirmBtnRow}>
            <TouchableOpacity
              style={styles.confirmBtnCancel}
              onPress={() => setPendingConfirmMove(null)}
            >
              <Text style={styles.confirmBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtnOk}
              onPress={() => {
                executeMove(pendingConfirmMove, false);
                setPendingConfirmMove(null);
              }}
            >
              <Text style={styles.confirmBtnOkText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Player (You) Bar */}
      <View style={styles.playerBar}>
        <View style={styles.playerInfoRow}>
          <UserAvatar
            avatarId={user?.avatar_id}
            avatarUrl={user?.avatar_url}
            size={38}
            iconSize={20}
            borderColor={colors.gold}
            borderWidth={1.5}
          />
          <View style={styles.playerNameCol}>
            <View style={styles.nameStatusRow}>
              <Text style={styles.playerName}>You</Text>
              <View style={styles.greenDot} />
            </View>
            <Text style={styles.userRatingSub}>{user?.rating || 1200}</Text>
            <CapturedPieces pieces={capturedPieces.white} color="b" size={15} />
          </View>
        </View>
        <View style={[styles.timerBadge, game.turn() === 'w' && styles.timerBadgeActive]}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.gold} />
          <Text style={[styles.timerText, { color: colors.textPrimary }]}>{formatTime(playerTime)}</Text>
        </View>
      </View>

      {/* In-Game Chat (online matches only) */}
      {mode === 'online' && roomCode ? (
        <GameChat roomCode={roomCode} userId={user?.id} token={token} />
      ) : null}

      {/* Game Over Modal */}
      <GameOverModal
        visible={gameOver}
        result={gameResult}
        reason={gameReason}
        eloDelta={eloDelta}
        newRating={user?.rating || 1200}
        movesCount={moveHistory.length}
        onPlayAgain={restartGame}
        onHome={onBack}
      />

      {/* Back Navigation Confirmation */}
      <ConfirmBackModal
        visible={showBackConfirm}
        onCancel={() => setShowBackConfirm(false)}
        onConfirm={() => {
          setShowBackConfirm(false);
          onBack();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#161d2b',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  backBtn: {
    padding: 6,
  },
  settingsBtn: {
    padding: 6,
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1b2233',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  playerNameCol: {
    marginLeft: 10,
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginLeft: 6,
  },
  thinkingText: {
    color: colors.gold,
    fontSize: 11,
    fontStyle: 'italic',
  },
  userRatingSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerBadgeActive: {
    borderColor: colors.gold,
    backgroundColor: '#201d14',
  },
  timerText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginLeft: 6,
  },
  confirmBanner: {
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  confirmText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtnRow: {
    flexDirection: 'row',
  },
  confirmBtnCancel: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  confirmBtnCancelText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  confirmBtnOk: {
    backgroundColor: colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confirmBtnOkText: {
    color: '#0b0e14',
    fontSize: 12,
    fontWeight: '700',
  },
});
