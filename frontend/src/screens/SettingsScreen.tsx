import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, BoardThemeKey } from '../theme/colors';
import { useGameSettings } from '../context/GameSettingsContext';
import { AIDifficulty } from '../types/chess';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const {
    boardTheme,
    setBoardTheme,
    pieceTheme,
    setPieceTheme,
    difficulty,
    setDifficulty,
    soundEnabled,
    setSoundEnabled,
    musicEnabled,
    setMusicEnabled,
    vibrationEnabled,
    setVibrationEnabled,
    hintsEnabled,
    setHintsEnabled,
    moveConfirm,
    setMoveConfirm,
  } = useGameSettings();

  const [boardModal, setBoardModal] = useState(false);
  const [diffModal, setDiffModal] = useState(false);
  const [pieceModal, setPieceModal] = useState(false);
  const [aboutModal, setAboutModal] = useState(false);

  const boardOptions: Array<{ id: BoardThemeKey; label: string }> = [
    { id: 'wood', label: 'Brown & White' },
    { id: 'green', label: 'Green & White' },
    { id: 'obsidian', label: 'Obsidian Gold' },
    { id: 'slate', label: 'Midnight Slate' },
  ];

  const diffOptions: Array<{ id: AIDifficulty; label: string; elo: number }> = [
    { id: 'easy', label: 'Easy', elo: 600 },
    { id: 'medium', label: 'Medium', elo: 1200 },
    { id: 'hard', label: 'Hard', elo: 1800 },
    { id: 'master', label: 'Master', elo: 2200 },
  ];

  const pieceOptions: Array<{ id: 'classic' | 'luxury' | 'modern'; label: string }> = [
    { id: 'classic', label: 'Classic' },
    { id: 'luxury', label: 'Luxury Gold' },
    { id: 'modern', label: 'Minimal Modern' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="settings-back-button" style={styles.headerBtn} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* GAME SETTINGS Section */}
        <Text style={styles.sectionTitle}>GAME SETTINGS</Text>
        <View style={styles.sectionBox}>
          {/* Board Style */}
          <TouchableOpacity
            testID="settings-board-style-button"
            style={styles.settingRow}
            onPress={() => setBoardModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="chess-rook" size={22} color={colors.gold} />
              <View style={styles.rowTextCol}>
                <Text style={styles.settingLabel}>Board Style</Text>
                <Text style={styles.settingVal}>
                  {boardOptions.find((b) => b.id === boardTheme)?.label || 'Wood'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Piece Style */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setPieceModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="chess-king" size={22} color={colors.gold} />
              <View style={styles.rowTextCol}>
                <Text style={styles.settingLabel}>Piece Style</Text>
                <Text style={styles.settingVal}>
                  {pieceOptions.find((p) => p.id === pieceTheme)?.label || 'Classic'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Difficulty */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setDiffModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="speedometer" size={22} color={colors.gold} />
              <View style={styles.rowTextCol}>
                <Text style={styles.settingLabel}>Difficulty</Text>
                <Text style={styles.settingVal}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Move Confirm Switch */}
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="gesture-tap" size={22} color={colors.textSecondary} />
              <View style={styles.rowTextCol}>
                <Text style={styles.settingLabel}>Move Confirm</Text>
                <Text style={styles.settingVal}>Ask before moving</Text>
              </View>
            </View>
            <Switch
              value={moveConfirm}
              onValueChange={setMoveConfirm}
              trackColor={{ false: '#26334d', true: colors.gold }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* PREFERENCES Section */}
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.sectionBox}>
          {/* Sound Effects */}
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="volume-high" size={22} color={colors.textSecondary} />
              <Text style={styles.simpleLabel}>Sound Effects</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#26334d', true: colors.gold }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Background Music */}
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="music" size={22} color={colors.textSecondary} />
              <Text style={styles.simpleLabel}>Background Music</Text>
            </View>
            <Switch
              value={musicEnabled}
              onValueChange={setMusicEnabled}
              trackColor={{ false: '#26334d', true: colors.gold }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Vibration */}
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="vibrate" size={22} color={colors.textSecondary} />
              <Text style={styles.simpleLabel}>Vibration</Text>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
              trackColor={{ false: '#26334d', true: colors.gold }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Hints */}
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="lightbulb-outline" size={22} color={colors.gold} />
              <View style={styles.rowTextCol}>
                <Text style={styles.settingLabel}>Hints</Text>
                <Text style={styles.settingVal}>Show hints in game</Text>
              </View>
            </View>
            <Switch
              value={hintsEnabled}
              onValueChange={setHintsEnabled}
              trackColor={{ false: '#26334d', true: colors.gold }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* OTHER Section */}
        <Text style={styles.sectionTitle}>OTHER</Text>
        <View style={styles.sectionBox}>
          <TouchableOpacity style={styles.settingRow} onPress={() => setAboutModal(true)}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.simpleLabel}>Privacy Policy</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            onPress={() => setAboutModal(true)}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="information-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.simpleLabel}>About</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Board Theme Modal */}
      <Modal visible={boardModal} transparent animationType="fade" onRequestClose={() => setBoardModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Select Board Style</Text>
            {boardOptions.map((b) => (
              <TouchableOpacity
                key={b.id}
                testID={`settings-board-option-${b.id}`}
                style={[styles.modalOption, boardTheme === b.id && styles.modalOptionSelected]}
                onPress={() => {
                  setBoardTheme(b.id);
                  setBoardModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, boardTheme === b.id && { color: colors.gold }]}>
                  {b.label}
                </Text>
                {boardTheme === b.id && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.gold} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Piece Style Modal */}
      <Modal visible={pieceModal} transparent animationType="fade" onRequestClose={() => setPieceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Select Piece Style</Text>
            {pieceOptions.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.modalOption, pieceTheme === p.id && styles.modalOptionSelected]}
                onPress={() => {
                  setPieceTheme(p.id);
                  setPieceModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, pieceTheme === p.id && { color: colors.gold }]}>
                  {p.label}
                </Text>
                {pieceTheme === p.id && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.gold} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Difficulty Modal */}
      <Modal visible={diffModal} transparent animationType="fade" onRequestClose={() => setDiffModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Select AI Difficulty</Text>
            {diffOptions.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.modalOption, difficulty === d.id && styles.modalOptionSelected]}
                onPress={() => {
                  setDifficulty(d.id);
                  setDiffModal(false);
                }}
              >
                <View>
                  <Text style={[styles.modalOptionText, difficulty === d.id && { color: colors.gold }]}>
                    {d.label}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{d.elo} Elo Engine</Text>
                </View>
                {difficulty === d.id && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.gold} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={aboutModal} transparent animationType="fade" onRequestClose={() => setAboutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <MaterialCommunityIcons name="chess-knight" size={40} color={colors.gold} style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={[styles.modalHeading, { textAlign: 'center' }]}>Chess Arena v1.0</Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 20 }}>
              Luxury Gold Edition Chess Engine powered by standard FIDE rules, Minimax Tactical AI, Puzzles, and Online Multiplayer.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.gold, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
              onPress={() => setAboutModal(false)}
            >
              <Text style={{ color: '#0b0e14', fontWeight: '800' }}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2233',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTextCol: {
    marginLeft: 14,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  settingVal: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  simpleLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  modalHeading: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2233',
  },
  modalOptionSelected: {
    borderBottomColor: colors.gold,
  },
  modalOptionText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
