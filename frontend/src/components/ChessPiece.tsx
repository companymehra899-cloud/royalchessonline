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
// Minimalist polished chess pieces matching the user's reference image.
//
// Design language:
//   • Off-white cream / solid matte black bodies — smooth, slightly rounded.
//   • No felt base — clean wide pedestal instead.
//   • Soft 3D shading via subtle gradients (upper-left light source).
//   • Thin darker outlines for crisp silhouettes on both square colors.
//   • High-profile, elegant proportions.
//
// Each instance gets a unique id prefix so SVG gradient ids never collide.
// ---------------------------------------------------------------------------

type Palette = { light: string; mid: string; dark: string; edge: string };

const WHITE_PALETTES: Record<string, Palette> = {
  classic: { light: '#FAF3E6', mid: '#EFE3CC', dark: '#D6C6A8', edge: '#A89172' },
  luxury:  { light: '#FBF2DC', mid: '#E8D6B0', dark: '#CBB582', edge: '#9A8050' },
  modern:  { light: '#FFFFFF', mid: '#EBEDF1', dark: '#D0D4DC', edge: '#9CA4B0' },
};

const BLACK_PALETTES: Record<string, Palette> = {
  classic: { light: '#3A3A3A', mid: '#262626', dark: '#161616', edge: '#0A0A0A' },
  luxury:  { light: '#3E3326', mid: '#2A1D12', dark: '#1A1208', edge: '#0D0804' },
  modern:  { light: '#444450', mid: '#2C2C36', dark: '#1A1A22', edge: '#0A0A12' },
};

function buildDefs(uid: string, p: Palette): string {
  return `<defs>
    <linearGradient id="${uid}-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${p.dark}"/>
      <stop offset="25%" stop-color="${p.light}"/>
      <stop offset="55%" stop-color="${p.mid}"/>
      <stop offset="100%" stop-color="${p.dark}"/>
    </linearGradient>
    <radialGradient id="${uid}-ball" cx="35%" cy="28%" r="80%">
      <stop offset="0%" stop-color="${p.light}"/>
      <stop offset="50%" stop-color="${p.mid}"/>
      <stop offset="100%" stop-color="${p.dark}"/>
    </radialGradient>
    <linearGradient id="${uid}-shade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${p.light}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${p.dark}" stop-opacity="0.3"/>
    </linearGradient>
  </defs>`;
}

const SW = 0.5;

/** Wide pedestal base shared by all pieces — no felt, just smooth body. */
function pieceBase(uid: string, p: Palette): string {
  return `
    <ellipse cx="22.5" cy="40.5" rx="12" ry="2.5" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M11 40.5 Q11 37.5 22.5 37 Q34 37.5 34 40.5 L34 40.5 Q34 38.8 22.5 38.8 Q11 38.8 11 40.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="37" rx="10" ry="1.5" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

// ---- Per-piece upper bodies ------------------------------------------------

function pawnTop(uid: string, p: Palette): string {
  return `
    <path d="M19.5 37 L18.5 31 Q18.5 28.5 22.5 28 Q26.5 28.5 26.5 31 L25.5 37 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="22.5" cy="24" r="7" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

function rookTop(uid: string, p: Palette): string {
  return `
    <path d="M15.5 37 L15.5 25 Q15.5 23.5 17 23.5 L28 23.5 Q29.5 23.5 29.5 25 L29.5 37 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="23.5" rx="7.5" ry="1.4" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M16.5 23.5 L16.5 20 L19 20 L19 21.8 L21 21.8 L21 20 L24 20 L24 21.8 L26 21.8 L26 20 L28.5 20 L28.5 23.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}" stroke-linejoin="round"/>
    <ellipse cx="22.5" cy="28" rx="6.8" ry="0.8" fill="${p.dark}" opacity="0.15"/>
  `;
}

function bishopTop(uid: string, p: Palette): string {
  return `
    <path d="M19 37 L18 29 Q18 26.5 22.5 26 Q27 26.5 27 29 L26 37 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="26.3" rx="6.5" ry="1.2" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M16.8 26.5 Q16.8 20.5 22.5 15.5 Q28.2 20.5 28.2 26.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M20.5 21 L24.5 19" stroke="${p.edge}" stroke-width="1" fill="none" stroke-linecap="round"/>
    <circle cx="22.5" cy="13.5" r="2" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

function knightTop(uid: string, p: Palette): string {
  return `
    <path d="M19 37 C19 33 21 30 24 28.5 C27 27 29 24.5 29.5 22 C30 19.5 28.5 17.8 26 18.2 C24 18.5 22 20 20.5 22 C19 24 18.2 27.5 18.2 30.5 C18.2 33 18.5 35 19 37 Z"
          fill="url(#${uid}-cyl)" opacity="0.95" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M13 37
             C13 33.5 14 30.5 16 28.5
             C13.5 27 11.5 25 11 22
             C10.7 20.3 11.3 18.8 12.8 18.3
             L14.5 19.8
             L16 18.2
             C17 19 17.5 20 17.2 22
             C16.8 23.8 16 25.5 17 27
             C18.5 28.5 20 31 20 34
             C20 35.8 19 36.5 17.5 37 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}" stroke-linejoin="round"/>
    <circle cx="13.5" cy="23.5" r="0.8" fill="${p.edge}"/>
    <path d="M14.5 20 L16.5 19" stroke="${p.edge}" stroke-width="0.5" opacity="0.4"/>
  `;
}

function queenTop(uid: string, p: Palette): string {
  return `
    <path d="M18 37 L17.5 28 Q17.5 25.5 22.5 25 Q27.5 25.5 27.5 28 L27 37 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="25.3" rx="7" ry="1.3" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M16 25.5 Q16 19 22.5 15 Q29 19 29 25.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M16.8 25.5 L17.5 19 M19.5 25.5 L19.5 16.5 M22.5 25.5 L22.5 13.5 M25.5 25.5 L25.5 16.5 M28.2 25.5 L27.5 19"
          stroke="url(#${uid}-cyl)" stroke-width="2.8" stroke-linecap="round" fill="none"/>
    <circle cx="17.5" cy="18.5" r="1.8" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="19.5" cy="16" r="1.8" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="22.5" cy="13" r="2.2" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="25.5" cy="16" r="1.8" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
    <circle cx="27.5" cy="18.5" r="1.8" fill="url(#${uid}-ball)" stroke="${p.edge}" stroke-width="${SW}"/>
  `;
}

function kingTop(uid: string, p: Palette): string {
  return `
    <path d="M18 37 L17.5 28 Q17.5 25.5 22.5 25 Q27.5 25.5 27.5 28 L27 37 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <ellipse cx="22.5" cy="25.3" rx="7.5" ry="1.3" fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M15.5 25.5 Q15.5 19 22.5 14.5 Q29.5 19 29.5 25.5 Z"
          fill="url(#${uid}-cyl)" stroke="${p.edge}" stroke-width="${SW}"/>
    <path d="M16.5 22 L28.5 22" stroke="${p.edge}" stroke-width="0.6" opacity="0.35"/>
    <path d="M21.5 15 L21.5 12 L18.5 12 L18.5 10 L21.5 10 L21.5 7.5 L23.5 7.5 L23.5 10 L26.5 10 L26.5 12 L23.5 12 L23.5 15 Z"
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
