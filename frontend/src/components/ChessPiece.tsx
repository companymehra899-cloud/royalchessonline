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
// Premium 3D-style vector chess pieces.
//
// Design language (per the user's reference image):
//   • Matte cream / walnut bodies with gradient shading for soft 3D volume.
//   • A distinct dark-green felt base pad on every piece.
//   • Light comes from the upper-left: cylindrical parts get a left-biased
//     linear gradient, spherical parts get an offset radial gradient.
//   • Thin darker outlines for crisp silhouettes.
//
// Each render instance gets a unique id prefix so SVG gradient ids never
// collide when 32 pieces are on screen simultaneously.
// ---------------------------------------------------------------------------

type Palette = { light: string; mid: string; dark: string; edge: string };

const WHITE_PALETTES: Record<string, Palette> = {
  classic: { light: '#FCF4E4', mid: '#F0E2C6', dark: '#DCCBA4', edge: '#B89B6E' },
  luxury:  { light: '#FBF0D4', mid: '#E8D5A8', dark: '#C9A86C', edge: '#9A7B45' },
  modern:  { light: '#FFFFFF', mid: '#EAEDF2', dark: '#CFD4DD', edge: '#A0A8B5' },
};

const BLACK_PALETTES: Record<string, Palette> = {
  classic: { light: '#5C4329', mid: '#3E2B16', dark: '#2A1A0A', edge: '#160B02' },
  luxury:  { light: '#6B4F30', mid: '#4A3318', dark: '#2E1D0A', edge: '#160B02' },
  modern:  { light: '#52525C', mid: '#34343E', dark: '#1E1E28', edge: '#0A0A14' },
};

const FELT_LIGHT = '#007A00';
const FELT_DARK = '#002400';

/** Gradient <defs> shared by all pieces. */
function buildDefs(uid: string, p: Palette): string {
  return `<defs>
    <radialGradient id="${uid}-felt" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="${FELT_LIGHT}"/>
      <stop offset="100%" stop-color="${FELT_DARK}"/>
    </radialGradient>
    <linearGradient id="${uid}-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${p.dark}"/>
      <stop offset="22%" stop-color="${p.light}"/>
      <stop offset="58%" stop-color="${p.mid}"/>
      <stop offset="100%" stop-color="${p.dark}"/>
    </linearGradient>
    <radialGradient id="${uid}-ball" cx="33%" cy="28%" r="80%">
      <stop offset="0%" stop-color="${p.light}"/>
      <stop offset="48%" stop-color="${p.mid}"/>
      <stop offset="100%" stop-color="${p.dark}"/>
    </radialGradient>
  </defs>`;
}

const SW = 0.5; // outline stroke width

/** Felt base pad — identical on every piece. */
function feltBase(uid: string): string {
  return `<ellipse cx="22.5" cy="41" rx="12" ry="2.4" fill="url(#${uid}-felt)"/>`;
}

/** The cylindrical bottom base + collar ring shared by all pieces. */
function pieceBase(uid: string, p: Palette): string {
  return `
    <path d="M11 38.5 Q11 35.2 22.5 34.8 Q34 35.2 34 38.5 Q34 40.2 22.5 40.2 Q11 40.2 11 38.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="34.8" rx="9.8" ry="1.6" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

// ---- Per-piece upper bodies ------------------------------------------------

function pawnTop(uid: string, p: Palette): string {
  return `
    <path d="M19.5 34.8 L19 30 Q19 27.3 22.5 27.3 Q26 27.3 26 30 L25.5 34.8 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="22.5" cy="23" r="6.8" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

function rookTop(uid: string, p: Palette): string {
  return `
    <path d="M15.5 34.8 L15.5 24.5 Q15.5 23 17 23 L28 23 Q29.5 23 29.5 24.5 L29.5 34.8 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="23" rx="7.5" ry="1.4" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M16.5 23 L16.5 19.5 L19 19.5 L19 21.3 L21 21.3 L21 19.5 L24 19.5 L24 21.3 L26 21.3 L26 19.5 L28.5 19.5 L28.5 23 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}" stroke-linejoin="round"/>
  `;
}

function bishopTop(uid: string, p: Palette): string {
  return `
    <path d="M19 34.8 L18.5 28 Q18.5 25.2 22.5 24.7 Q26.5 25.2 26.5 28 L26 34.8 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="25" rx="6.3" ry="1.2" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M17.2 25 Q17.2 19.5 22.5 15 Q27.8 19.5 27.8 25 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M22.5 15 L22.5 21.5 M20.5 19 L24.5 17.5"
          stroke="${p.edge}" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <circle cx="22.5" cy="13.3" r="1.9" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

function knightTop(uid: string, p: Palette): string {
  return `
    <!-- mane behind head -->
    <path d="M19 34.8 C19 31 21 28 24 26.5 C27 25 29 23 29.5 20.5 C30 18 28.5 16.5 26 17 C24 17.3 22 19 20.5 21 C19 23 18 26 18 29 C18 31.5 18.2 33.5 18.5 34.8 Z"
          fill="url(#${uid}-cyl)" opacity="0.92" stroke="${p.edge}" stroke-width="${SW}"/>
    <!-- horse head (facing left) -->
    <path d="M13 34.8
             C13 31.5 14 29 16 27
             C13.5 25.5 11.5 24 11 21.5
             C10.7 20 11.2 18.8 12.5 18.3
             L14 19.5
             L15.5 18
             C16.5 18.8 17 19.8 16.8 21
             C16.5 22.5 16 24 17 25
             C18.5 26.5 20 28 20 31
             C20 33 19 34.3 17.5 34.8 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}" stroke-linejoin="round"/>
    <circle cx="13.5" cy="23" r="0.7" fill="${p.edge}"/>
  `;
}

function queenTop(uid: string, p: Palette): string {
  return `
    <path d="M18.5 34.8 L18 27 Q18 24.5 22.5 24 Q27 24.5 27 27 L26.5 34.8 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="24.3" rx="7" ry="1.3" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <!-- crown spike stems -->
    <path d="M16.5 24 L16.8 18.5 M19.5 24 L19.5 16.5 M22.5 24 L22.5 14.5 M25.5 24 L25.5 16.5 M28.5 24 L28.2 18.5"
          stroke="url(#${uid}-cyl)" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <!-- finial balls -->
    <circle cx="16.8" cy="18" r="1.7" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="19.5" cy="16" r="1.7" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="22.5" cy="14.2" r="2" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="25.5" cy="16" r="1.7" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="28.2" cy="18" r="1.7" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

function kingTop(uid: string, p: Palette): string {
  return `
    <path d="M18 34.8 L17.5 27 Q17.5 24.5 22.5 24 Q27.5 24.5 27.5 27 L27 34.8 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="24" rx="7.5" ry="1.3" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <!-- crown body -->
    <path d="M15.5 24 Q15.5 18.5 22.5 15.8 Q29.5 18.5 29.5 24 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <!-- crown rim lines -->
    <path d="M16.5 21 L28.5 21" stroke="${p.edge}" stroke-width="0.6" opacity="0.4"/>
    <!-- cross finial -->
    <path d="M21.5 16 L21.5 13.5 L18.8 13.5 L18.8 11.5 L21.5 11.5 L21.5 9 L23.5 9 L23.5 11.5 L26.2 11.5 L26.2 13.5 L23.5 13.5 L23.5 16 Z"
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
    ${feltBase(uid)}
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
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});
