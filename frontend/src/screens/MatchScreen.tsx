import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Chess } from 'chess.js';
import { colors } from '../theme/colors';
import { ChessBoard } from '../components/ChessBoard';
import { GameOverModal } from '../components/GameOverModal';
import { GameChat } from '../components/GameChat';
import { useAuth } from '../context/AuthContext';
import { useGameSettings } from '../context/GameSettingsContext';
import { soundManager } from '../utils/audio';
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
  const { boardTheme, pieceTheme, moveConfirm, hintsEnabled } = useGameSettings();

  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(() => game.fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
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
      setHintMove(null);
      setHintText(null);
      setFen(game.fen());
      setMoveHistory((prev) => [...prev, { from: mv.from, to: mv.to, san: moveResult.san }]);

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

  const handleUndo = () => {
    if (moveHistory.length === 0 || isAiThinking) return;
    // If vs computer, undo two moves (player + AI)
    if (mode === 'computer') {
      game.undo();
      game.undo();
      setMoveHistory((prev) => prev.slice(0, -2));
    } else {
      game.undo();
      setMoveHistory((prev) => prev.slice(0, -1));
    }
    setFen(game.fen());
    setLastMove(null);
    setHintMove(null);
    setHintText(null);
    soundManager.playMove();
  };

  const handleHint = async () => {
    if (!hintsEnabled || isAiThinking || gameOver) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/chess/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: game.fen() }),
      });
      if (res.ok) {
        const data = await res.json();
        setHintMove({ from: data.from, to: data.to });
        setHintText(data.description);
        soundManager.playMove();
      }
    } catch (e) {
      Alert.alert('Hint', 'Advance your pieces towards the center and control open files.');
    }
  };

  const handleResign = () => {
    Alert.alert('Resign Game', 'Are you sure you want to resign?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resign',
        style: 'destructive',
        onPress: () => finishGame('loss', 'Resignation'),
      },
    ]);
  };

  const restartGame = () => {
    const newG = new Chess();
    setGame(newG);
    setFen(newG.fen());
    setLastMove(null);
    setHintMove(null);
    setHintText(null);
    setMoveHistory([]);
    setPlayerTime(10 * 60);
    setOpponentTime(10 * 60);
    setGameOver(false);
    setPendingConfirmMove(null);
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
        <TouchableOpacity style={styles.backBtn} testID="match-back-button" onPress={onBack}>
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
        hintMove={hintMove}
        interactive={!gameOver && !isAiThinking}
        onMove={handleUserMove}
        confirmMoveEnabled={moveConfirm}
        onPendingMove={setPendingConfirmMove}
      />

      {/* Hint Banner if active */}
      {!!hintText && (
        <View style={styles.hintBanner}>
          <MaterialCommunityIcons name="lightbulb-on" size={18} color={colors.gold} />
          <Text style={styles.hintBannerText}>{hintText}</Text>
        </View>
      )}

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
          <View style={[styles.avatarMini, { borderColor: colors.gold }]}>
            <MaterialCommunityIcons name="chess-pawn" size={20} color={colors.gold} />
          </View>
          <View style={styles.playerNameCol}>
            <View style={styles.nameStatusRow}>
              <Text style={styles.playerName}>You</Text>
              <View style={styles.greenDot} />
            </View>
            <Text style={styles.userRatingSub}>{user?.rating || 1200}</Text>
          </View>
        </View>
        <View style={[styles.timerBadge, game.turn() === 'w' && styles.timerBadgeActive]}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.gold} />
          <Text style={[styles.timerText, { color: colors.textPrimary }]}>{formatTime(playerTime)}</Text>
        </View>
      </View>

      {/* Bottom Action Tray */}
      <View style={styles.actionTray}>
        <TouchableOpacity style={styles.actionBtn} testID="undo-button" onPress={handleUndo} activeOpacity={0.7}>
          <MaterialCommunityIcons name="undo" size={20} color={colors.textSecondary} />
          <Text style={styles.actionBtnText}>UNDO</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} testID="hint-button" onPress={handleHint} activeOpacity={0.7}>
          <MaterialCommunityIcons name="lightbulb-outline" size={20} color={colors.gold} />
          <Text style={[styles.actionBtnText, { color: colors.gold }]}>HINT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} testID="resign-button" onPress={handleResign} activeOpacity={0.7}>
          <MaterialCommunityIcons name="flag-outline" size={20} color={colors.danger} />
          <Text style={[styles.actionBtnText, { color: colors.danger }]}>RESIGN</Text>
        </TouchableOpacity>
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
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262010',
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gold,
    marginVertical: 4,
  },
  hintBannerText: {
    color: colors.goldLight,
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontWeight: '600',
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
  actionTray: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#161d2b',
    marginTop: 'auto',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 6,
  },
});
