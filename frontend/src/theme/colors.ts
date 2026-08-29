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
  
  // Board themes — premium polished finishes
  boards: {
    wood: {
      name: 'Wood',
      light: '#EAD9B0',
      dark: '#A87444',
      highlight: 'rgba(212, 175, 55, 0.55)',
      selected: 'rgba(245, 158, 11, 0.7)'
    },
    green: {
      name: 'Classic Green',
      light: '#F0E8D0',
      dark: '#6E8E5A',
      highlight: 'rgba(245, 230, 83, 0.6)',
      selected: 'rgba(245, 158, 11, 0.7)'
    },
    obsidian: {
      name: 'Obsidian Gold',
      light: '#323B50',
      dark: '#161E2E',
      highlight: 'rgba(212, 175, 55, 0.6)',
      selected: 'rgba(212, 175, 55, 0.8)'
    },
    slate: {
      name: 'Midnight Slate',
      light: '#94A8B4',
      dark: '#52677A',
      highlight: 'rgba(212, 175, 55, 0.6)',
      selected: 'rgba(245, 158, 11, 0.7)'
    }
  }
};

export type BoardThemeKey = keyof typeof colors.boards;