import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chess } from 'chess.js';
import { colors } from '../theme/colors';
import { ChessBoard } from '../components/ChessBoard';
import { useAuth } from '../context/AuthContext';
import { useGameSettings } from '../context/GameSettingsContext';
import { soundManager } from '../utils/audio';
import { Puzzle } from '../types/chess';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface PuzzlesScreenProps {
  onBack: () => void;
  onOpenSettings: () => void;
}

export const PuzzlesScreen: React.FC<PuzzlesScreenProps> = ({ onBack, onOpenSettings }) => {
  const { user, token, updateUserStats } = useAuth();
  const { boardTheme, pieceTheme } = useGameSettings();

  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [dailyPuzzle, setDailyPuzzle] = useState<Puzzle | null>(null);
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
  const [puzzleGame, setPuzzleGame] = useState<Chess | null>(null);
  const [puzzleStatus, setPuzzleStatus] = useState<'idle' | 'solved' | 'wrong'>('idle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPuzzles();
  }, []);

  const fetchPuzzles = async () => {
    try {
      const [puzRes, dailyRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/puzzles`),
        fetch(`${BACKEND_URL}/api/puzzles/daily`),
      ]);

      if (puzRes.ok) {
        const pData = await puzRes.json();
        setPuzzles(pData);
      }
      if (dailyRes.ok) {
        const dData = await dailyRes.json();
        setDailyPuzzle(dData);
        // By default, open daily puzzle
        selectPuzzle(dData);
      }
    } catch (e) {
      console.log('Error fetching puzzles:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectPuzzle = (puz: Puzzle) => {
    setActivePuzzle(puz);
    const g = new Chess(puz.fen);
    setPuzzleGame(g);
    setPuzzleStatus('idle');
  };

  const handlePuzzleMove = (mv: { from: string; to: string; promotion?: string }) => {
    if (!puzzleGame || !activePuzzle || puzzleStatus === 'solved') return;

    const isCorrect =
      mv.from.toLowerCase() === activePuzzle.solution_from.toLowerCase() &&
      mv.to.toLowerCase() === activePuzzle.solution_to.toLowerCase();

    try {
      const validMove = puzzleGame.move({
        from: mv.from,
        to: mv.to,
        promotion: mv.promotion || 'q',
      });

      if (!validMove) return;

      if (isCorrect) {
        setPuzzleStatus('solved');
        soundManager.playWin();
        updateUserStats(activePuzzle.reward_elo || 15, 'win');

        // Record completion to backend
        fetch(`${BACKEND_URL}/api/puzzles/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ puzzle_id: activePuzzle.id, solved: true }),
        }).catch(() => {});
      } else {
        setPuzzleStatus('wrong');
        soundManager.playLoss();
        // Reset board after 1 sec
        setTimeout(() => {
          const resetG = new Chess(activePuzzle.fen);
          setPuzzleGame(resetG);
          setPuzzleStatus('idle');
        }, 1200);
      }
    } catch (e) {
      console.log('Puzzle move error:', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHESS PUZZLES</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onOpenSettings}>
          <MaterialCommunityIcons name="cog-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Active Puzzle Header */}
          {activePuzzle && (
            <View style={styles.activePuzzleHeader}>
              <View>
                <Text style={styles.puzzleTitle}>{activePuzzle.title}</Text>
                <Text style={styles.puzzleSub}>
                  {activePuzzle.theme} • Rating {activePuzzle.rating} • {activePuzzle.turn === 'w' ? 'White' : 'Black'} to move
                </Text>
              </View>
              <View style={styles.diffBadge}>
                <Text style={styles.diffBadgeText}>{activePuzzle.difficulty.toUpperCase()}</Text>
              </View>
            </View>
          )}

          {/* Puzzle Board */}
          {puzzleGame && (
            <ChessBoard
              game={puzzleGame}
              flipped={activePuzzle?.turn === 'b'}
              boardTheme={boardTheme}
              pieceTheme={pieceTheme}
              interactive={puzzleStatus !== 'solved'}
              onMove={handlePuzzleMove}
            />
          )}

          {/* Result Status Banner */}
          {puzzleStatus === 'solved' && (
            <View style={styles.solvedBanner}>
              <MaterialCommunityIcons name="check-circle" size={22} color={colors.success} />
              <Text style={styles.solvedText}>Puzzle Solved! +{activePuzzle?.reward_elo || 15} ELO</Text>
            </View>
          )}
          {puzzleStatus === 'wrong' && (
            <View style={styles.wrongBanner}>
              <MaterialCommunityIcons name="close-circle" size={22} color={colors.danger} />
              <Text style={styles.wrongText}>Incorrect move. Try again!</Text>
            </View>
          )}

          {/* Hint Action */}
          {activePuzzle && (
            <TouchableOpacity
              style={styles.hintBtn}
              onPress={() => Alert.alert('Puzzle Hint', activePuzzle.hint)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color={colors.gold} />
              <Text style={styles.hintBtnText}>SHOW HINT</Text>
            </TouchableOpacity>
          )}

          {/* Puzzles List */}
          <Text style={styles.listSectionTitle}>TACTICAL PUZZLE GALLERY</Text>
          {puzzles.map((p) => {
            const isSelected = activePuzzle?.id === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.puzzleCard, isSelected && styles.puzzleCardActive]}
                onPress={() => selectPuzzle(p)}
                activeOpacity={0.8}
              >
                <View style={styles.puzCardIcon}>
                  <MaterialCommunityIcons name="puzzle" size={24} color={isSelected ? colors.gold : colors.textSecondary} />
                </View>
                <View style={styles.puzCardCol}>
                  <Text style={[styles.puzCardTitle, isSelected && { color: colors.gold }]}>{p.title}</Text>
                  <Text style={styles.puzCardDesc}>{p.theme} • {p.difficulty}</Text>
                </View>
                <Text style={styles.puzCardElo}>{p.rating} ELO</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
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
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161d2b',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerBtn: {
    padding: 6,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  activePuzzleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  puzzleTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  puzzleSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  diffBadge: {
    backgroundColor: '#262010',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  diffBadgeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
  },
  solvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
    marginVertical: 10,
  },
  solvedText: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  wrongBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    marginVertical: 10,
  },
  wrongText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  hintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8,
  },
  hintBtnText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 1,
  },
  listSectionTitle: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  puzzleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  puzzleCardActive: {
    borderColor: colors.gold,
    backgroundColor: '#1c1f2a',
  },
  puzCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1b2333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  puzCardCol: {
    flex: 1,
    marginLeft: 12,
  },
  puzCardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  puzCardDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  puzCardElo: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '800',
  },
});
