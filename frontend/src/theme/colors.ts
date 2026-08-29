export const colors = {
  background: '#0a0d14',
  surface: '#121722',
  surfaceSecondary: '#182030',
  surfaceElevated: '#1f293d',
  border: '#26334d',
  borderLight: '#354466',
  
  // Gold Palette
  gold: '#d4af37',
  goldBright: '#f59e0b',
  goldLight: '#fef3c7',
  goldMuted: '#997e32',
  goldDark: '#4a3b10',
  goldGradient: ['#c49724', '#e6be44', '#f6d87d'] as const,
  goldCardGradient: ['#1d2433', '#161c28'] as const,
  heroGoldGradient: ['#59420b', '#3b2b06', '#1a1403'] as const,
  
  // Text
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  textGold: '#d4af37',
  
  // Game UI
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#38bdf8',
  
  // Board themes
  boards: {
    wood: {
      name: 'Wood',
      light: '#d9b88a',   // warm maple
      dark: '#6f4e2e',    // dark walnut
      highlight: 'rgba(184, 140, 74, 0.42)',   // last move: translucent warm brown-gold
      selected: 'rgba(212, 175, 95, 0.38)',   // selected: subtle warm gold
    },
    green: {
      name: 'Classic Green',
      light: '#eeeed2',
      dark: '#769656',
      highlight: 'rgba(245, 230, 83, 0.65)',
      selected: 'rgba(245, 158, 11, 0.75)'
    },
    obsidian: {
      name: 'Obsidian Gold',
      light: '#2a3346',
      dark: '#131924',
      highlight: 'rgba(212, 175, 55, 0.65)',
      selected: 'rgba(212, 175, 55, 0.85)'
    },
    slate: {
      name: 'Midnight Slate',
      light: '#8ca2ad',
      dark: '#4e626e',
      highlight: 'rgba(212, 175, 55, 0.65)',
      selected: 'rgba(245, 158, 11, 0.75)'
    }
  }
};

export type BoardThemeKey = keyof typeof colors.boards;