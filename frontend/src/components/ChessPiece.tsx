import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface ChessPieceProps {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
  size?: number;
  theme?: 'classic' | 'luxury' | 'modern';
}

// ---------------------------------------------------------------------------
// Staunton-style chess pieces matching the user's reference image.
//
// Design language:
//   • Cream / matte charcoal bodies — soft, diffused shading (no gloss).
//   • Vibrant green felt base (#2D5A27) visible at bottom of every piece.
//   • Classic Staunton proportions: King tallest, Pawn shortest.
//   • Upper-left soft light source — gentle highlights, no harsh shadows.
//   • Thin darker outlines for crisp silhouettes.
// ---------------------------------------------------------------------------

type Palette = { light: string; mid: string; dark: string; edge: string };

const WHITE_PALETTES: Record<string, Palette> = {
  classic: { light: '#F7F0E3', mid: '#EBE2D0', dark: '#D4C8B0', edge: '#9C8E70' },
  luxury:  { light: '#F9F2DC', mid: '#EBDDB8', dark: '#CDB982', edge: '#9A8050' },
  modern:  { light: '#FFFFFF', mid: '#EBEDF1', dark: '#D0D4DC', edge: '#9CA4B0' },
};

const BLACK_PALETTES: Record<string, Palette> = {
  classic: { light: '#4A4A4A', mid: '#383838', dark: '#232323', edge: '#0E0E0E' },
  luxury:  { light: '#3E3326', mid: '#2A1D12', dark: '#1A1208', edge: '#0D0804' },
  modern:  { light: '#444450', mid: '#2C2C36', dark: '#1A1A22', edge: '#0A0A12' },
};

const FELT = '#2D5A27';
const FELT_DARK = '#1E3D1A';

function buildDefs(uid: string, p: Palette): string {
  return `<defs>
    <radialGradient id="${uid}-felt" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="${FELT}"/>
      <stop offset="100%" stop-color="${FELT_DARK}"/>
    </radialGradient>
    <linearGradient id="${uid}-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${p.dark}"/>
      <stop offset="28%" stop-color="${p.light}"/>
      <stop offset="55%" stop-color="${p.mid}"/>
      <stop offset="100%" stop-color="${p.dark}"/>
    </linearGradient>
    <radialGradient id="${uid}-ball" cx="35%" cy="28%" r="80%">
      <stop offset="0%" stop-color="${p.light}"/>
      <stop offset="52%" stop-color="${p.mid}"/>
      <stop offset="100%" stop-color="${p.dark}"/>
    </radialGradient>
  </defs>`;
}

const SW = 0.5;

/** Green felt base + wide pedestal — Staunton style. */
function pieceBase(uid: string, p: Palette): string {
  return `
    <ellipse cx="22.5" cy="41.5" rx="11.5" ry="2.2" fill="url(#${uid}-felt)"/>
    <path d="M11.5 41.5 Q11.5 38.8 22.5 38.2 Q33.5 38.8 33.5 41.5 Q33.5 40 22.5 40 Q11.5 40 11.5 41.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="38.2" rx="10" ry="1.5" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

// ---- Per-piece upper bodies (Staunton proportions) ------------------------

function pawnTop(uid: string, p: Palette): string {
  return `
    <path d="M19.5 38.2 L18.8 32 Q18.8 29.5 22.5 29 Q26.2 29.5 26.2 32 L25.5 38.2 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="32" rx="6.5" ry="1.2" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="22.5" cy="25.5" r="6.5" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

function rookTop(uid: string, p: Palette): string {
  return `
    <path d="M15.5 38.2 L15.5 26 Q15.5 24.5 17 24.5 L28 24.5 Q29.5 24.5 29.5 26 L29.5 38.2 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="24.5" rx="7.5" ry="1.4" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M16.5 24.5 L16.5 21 L19 21 L19 22.8 L21 22.8 L21 21 L24 21 L24 22.8 L26 22.8 L26 21 L28.5 21 L28.5 24.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}" stroke-linejoin="round"/>
    <ellipse cx="22.5" cy="29" rx="6.8" ry="0.7" fill="${p.dark}" opacity="0.12"/>
  `;
}

function bishopTop(uid: string, p: Palette): string {
  return `
    <path d="M19 38.2 L18.2 30 Q18.2 27.5 22.5 27 Q26.8 27.5 26.8 30 L26 38.2 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="27.3" rx="6.3" ry="1.2" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M16.5 27.5 Q16.5 21 22.5 15.5 Q28.5 21 28.5 27.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M20 21.5 L25 19.5" stroke="${p.edge}" stroke-width="1" fill="none" stroke-linecap="round"/>
    <circle cx="22.5" cy="13.5" r="2" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

function knightTop(uid: string, p: Palette): string {
  return `
    <path d="M19 38.2 C19 34.5 21 31.5 24 30 C27 28.5 29 26 29.5 23.5 C30 21 28.5 19.2 26 19.5 C24 19.8 22 21.5 20.5 23.5 C19 25.5 18.2 28.5 18.2 31.5 C18.2 34 18.5 36 19 38.2 Z"
          fill="url(#${uid}-cyl)" opacity="0.95" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M13 38.2
             C13 34.5 14 31.5 16 29.5
             C13.5 28 11.5 25.5 11 22.5
             C10.7 20.8 11.3 19.3 12.8 18.8
             L14.5 20.3
             L16 18.5
             C17 19.3 17.5 20.3 17.2 22.5
             C16.8 24.3 16 26 17 27.5
             C18.5 29 20 31.5 20 34.5
             C20 36.3 19 37.3 17.5 38.2 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}" stroke-linejoin="round"/>
    <circle cx="13.5" cy="24" r="0.8" fill="${p.edge}"/>
    <path d="M14 20.5 L16.5 19.5" stroke="${p.edge}" stroke-width="0.5" opacity="0.35"/>
  `;
}

function queenTop(uid: string, p: Palette): string {
  return `
    <path d="M18 38.2 L17.5 29 Q17.5 26.5 22.5 26 Q27.5 26.5 27.5 29 L27 38.2 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="26.3" rx="7" ry="1.3" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M16 26.5 Q16 20 22.5 15 Q29 20 29 26.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M16.8 26.5 L17.3 20 M19.5 26.5 L19.5 17 M22.5 26.5 L22.5 13.5 M25.5 26.5 L25.5 17 M28.2 26.5 L27.7 20"
          stroke="url(#${uid}-cyl)" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <circle cx="17.3" cy="19.5" r="1.7" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="19.5" cy="16.5" r="1.7" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="22.5" cy="13" r="2" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="25.5" cy="16.5" r="1.7" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="27.7" cy="19.5" r="1.7" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

function kingTop(uid: string, p: Palette): string {
  return `
    <path d="M18 38.2 L17.5 29 Q17.5 26.5 22.5 26 Q27.5 26.5 27.5 29 L27 38.2 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="26.3" rx="7.5" ry="1.3" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M15.5 26.5 Q15.5 19.5 22.5 14 Q29.5 19.5 29.5 26.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M16.5 23 L28.5 23" stroke="${p.edge}" stroke-width="0.6" opacity="0.3"/>
    <path d="M21.5 14.5 L21.5 11.5 L18.5 11.5 L18.5 9.5 L21.5 9.5 L21.5 7 L23.5 7 L23.5 9.5 L26.5 9.5 L26.5 11.5 L23.5 11.5 L23.5 14.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}" stroke-linejoin="round"/>
  `;
}

function buildPieceSVG(type: string, color: 'w' | 'b', theme: string, uid: string): string {
  const p = (color === 'w' ? WHITE_PALETTES : BLACK_PALETTES)[theme] || WHITE_PALETTES.classic;
  const head = (t: string) => {
    switch (t) {
      case 'p': return pawnTop(uid, p);
      case 'r': return rookTop(uid, p);
      case 'b': return bishopTop(uid, p);
      case 'n': return knightTop(uid, p);
      case 'q': return queenTop(uid, p);
      case 'k': return kingTop(uid, p);
      default: return pawnTop(uid, p);
    }
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    ${buildDefs(uid, p)}
    ${pieceBase(uid, p)}
    ${head(type)}
  </svg>`;
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, size = 36, theme = 'classic' }) => {
  const xml = useMemo(() => {
    const uid = Math.random().toString(36).slice(2, 9);
    return buildPieceSVG(type, color, theme, uid);
  }, [type, color, theme]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
});
