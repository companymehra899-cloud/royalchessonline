import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BoardThemeKey } from '../theme/colors';
import { AIDifficulty } from '../types/chess';
import { soundManager } from '../utils/audio';

interface GameSettings {
  boardTheme: BoardThemeKey;
  pieceTheme: 'classic' | 'luxury' | 'modern';
  difficulty: AIDifficulty;
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  hintsEnabled: boolean;
  moveConfirm: boolean;
}

interface GameSettingsContextType extends GameSettings {
  setBoardTheme: (theme: BoardThemeKey) => void;
  setPieceTheme: (theme: 'classic' | 'luxury' | 'modern') => void;
  setDifficulty: (diff: AIDifficulty) => void;
  setSoundEnabled: (val: boolean) => void;
  setMusicEnabled: (val: boolean) => void;
  setVibrationEnabled: (val: boolean) => void;
  setHintsEnabled: (val: boolean) => void;
  setMoveConfirm: (val: boolean) => void;
}

const defaultSettings: GameSettings = {
  boardTheme: 'wood',
  pieceTheme: 'classic',
  difficulty: 'easy',
  soundEnabled: true,
  musicEnabled: false,
  vibrationEnabled: true,
  hintsEnabled: true,
  moveConfirm: false,
};

const GameSettingsContext = createContext<GameSettingsContextType | null>(null);

export const GameSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('chess_arena_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({ ...prev, ...parsed }));
        soundManager.setSoundEnabled(parsed.soundEnabled ?? true);
        soundManager.setVibrationEnabled(parsed.vibrationEnabled ?? true);
        soundManager.setMusicEnabled(parsed.musicEnabled ?? false);
      }
    } catch (e) {
      console.log('Error loading game settings:', e);
    }
  };

  const save = (newSettings: GameSettings) => {
    setSettings(newSettings);
    AsyncStorage.setItem('chess_arena_settings', JSON.stringify(newSettings)).catch(() => {});
  };

  const setBoardTheme = (boardTheme: BoardThemeKey) => save({ ...settings, boardTheme });
  const setPieceTheme = (pieceTheme: 'classic' | 'luxury' | 'modern') => save({ ...settings, pieceTheme });
  const setDifficulty = (difficulty: AIDifficulty) => save({ ...settings, difficulty });
  const setSoundEnabled = (soundEnabled: boolean) => {
    soundManager.setSoundEnabled(soundEnabled);
    save({ ...settings, soundEnabled });
  };
  const setMusicEnabled = (musicEnabled: boolean) => {
    soundManager.setMusicEnabled(musicEnabled);
    save({ ...settings, musicEnabled });
  };
  const setVibrationEnabled = (vibrationEnabled: boolean) => {
    soundManager.setVibrationEnabled(vibrationEnabled);
    save({ ...settings, vibrationEnabled });
  };
  const setHintsEnabled = (hintsEnabled: boolean) => save({ ...settings, hintsEnabled });
  const setMoveConfirm = (moveConfirm: boolean) => save({ ...settings, moveConfirm });

  return (
    <GameSettingsContext.Provider
      value={{
        ...settings,
        setBoardTheme,
        setPieceTheme,
        setDifficulty,
        setSoundEnabled,
        setMusicEnabled,
        setVibrationEnabled,
        setHintsEnabled,
        setMoveConfirm,
      }}
    >
      {children}
    </GameSettingsContext.Provider>
  );
};

export const useGameSettings = () => {
  const ctx = useContext(GameSettingsContext);
  if (!ctx) throw new Error('useGameSettings must be used within GameSettingsProvider');
  return ctx;
};