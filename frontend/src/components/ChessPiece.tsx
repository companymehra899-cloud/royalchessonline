import React, { useMemo, ReactElement } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Circle,
  Ellipse,
  Rect,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';

interface ChessPieceProps {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
  size?: number;
  theme?: 'classic' | 'luxury' | 'modern';
}

// Modern "3D vector" piece set. Each piece is drawn from layered gradients so it
// reads as a glossy, sculpted piece instead of a flat silhouette.
interface PieceColors {
  bodyTop: string;
  bodyMid: string;
  bodyBottom: string;
  gloss: string;
  glossBody: number;
  glossAccent: number;
  stroke: string;
  detail: string;
  shade: string;
  eye: string;
  accentTop: string;
  accentBottom: string;
}

const THEMES: Record<'classic' | 'luxury' | 'modern', Record<'w' | 'b', PieceColors>> = {
  classic: {
    w: {
      bodyTop: '#fefdfa',
      bodyMid: '#f2ede1',
      bodyBottom: '#c8bfa9',
      gloss: '#ffffff',
      glossBody: 0.5,
      glossAccent: 0.72,
      stroke: '#5f584b',
      detail: '#7a7264',
      shade: 'rgba(70, 58, 38, 0.20)',
      eye: '#3b3326',
      accentTop: '#ede6d6',
      accentBottom: '#b3a88f',
    },
    b: {
      bodyTop: '#3c4148',
      bodyMid: '#24272d',
      bodyBottom: '#0a0b0d',
      gloss: '#c3cbd6',
      glossBody: 0.3,
      glossAccent: 0.4,
      stroke: '#000000',
      detail: '#8b939f',
      shade: 'rgba(220, 228, 238, 0.10)',
      eye: '#c7cdd7',
      accentTop: '#2c3036',
      accentBottom: '#0d0e11',
    },
  },
  luxury: {
    w: {
      bodyTop: '#fdf6e2',
      bodyMid: '#efdca9',
      bodyBottom: '#c49a45',
      gloss: '#fffbe8',
      glossBody: 0.55,
      glossAccent: 0.78,
      stroke: '#7a5c14',
      detail: '#8a6a1d',
      shade: 'rgba(110, 75, 12, 0.24)',
      eye: '#4a3a12',
      accentTop: '#f6e2ae',
      accentBottom: '#b6892f',
    },
    b: {
      bodyTop: '#4b3920',
      bodyMid: '#251a0d',
      bodyBottom: '#0a0603',
      gloss: '#d4af37',
      glossBody: 0.28,
      glossAccent: 0.4,
      stroke: '#000000',
      detail: '#a0813a',
      shade: 'rgba(214, 175, 55, 0.16)',
      eye: '#cfa244',
      accentTop: '#3a2c16',
      accentBottom: '#100b04',
    },
  },
  modern: {
    w: {
      bodyTop: '#ffffff',
      bodyMid: '#eef1f6',
      bodyBottom: '#b4becb',
      gloss: '#ffffff',
      glossBody: 0.55,
      glossAccent: 0.78,
      stroke: '#55606f',
      detail: '#6a7687',
      shade: 'rgba(50, 60, 82, 0.16)',
      eye: '#3f4a5c',
      accentTop: '#e8edf4',
      accentBottom: '#a2aeba',
    },
    b: {
      bodyTop: '#2c3547',
      bodyMid: '#161c28',
      bodyBottom: '#04060a',
      gloss: '#7d8ca3',
      glossBody: 0.3,
      glossAccent: 0.42,
      stroke: '#000000',
      detail: '#64748b',
      shade: 'rgba(200, 215, 235, 0.10)',
      eye: '#aab7c9',
      accentTop: '#242c3d',
      accentBottom: '#090c12',
    },
  },
};

// Clone a shape node with a gradient fill (used to overlay the glossy highlight).
const withGloss = (node: ReactElement, id: string, opacity: number): ReactElement =>
  React.cloneElement(node, {
    fill: `url(#${id})`,
    stroke: 'none',
    strokeWidth: 0,
    opacity,
  } as object);

// Reusable shape helpers (keep stroke + gloss handling consistent across pieces).
const bodyPath = (d: string, bodyId: string, stroke: string) => (
  <Path d={d} fill={`url(#${bodyId})`} stroke={stroke} strokeWidth={1.15} strokeLinejoin="round" strokeLinecap="round" />
);

const accentEllipse = (cx: number, cy: number, rx: number, ry: number, accentId: string, stroke: string) => (
  <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${accentId})`} stroke={stroke} strokeWidth={0.9} />
);

const accentCircle = (cx: number, cy: number, r: number, accentId: string, stroke: string) => (
  <Circle cx={cx} cy={cy} r={r} fill={`url(#${accentId})`} stroke={stroke} strokeWidth={0.9} />
);

const accentRect = (x: number, y: number, w: number, h: number, rx: number, accentId: string, stroke: string) => (
  <Rect x={x} y={y} width={w} height={h} rx={rx} fill={`url(#${accentId})`} stroke={stroke} strokeWidth={0.9} />
);

const accentPath = (d: string, accentId: string, stroke: string) => (
  <Path d={d} fill={`url(#${accentId})`} stroke={stroke} strokeWidth={0.9} strokeLinejoin="round" />
);

const detailLine = (d: string, color: string, width = 0.85, opacity = 0.6) => (
  <Path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" fill="none" opacity={opacity} />
);

const renderPiece = (
  type: string,
  c: PieceColors,
  bodyId: string,
  glossBody: string,
  accentId: string,
  glossAccent: string,
): ReactElement => {
  const GB = (node: ReactElement) => withGloss(node, glossBody, c.glossBody);
  const GA = (node: ReactElement) => withGloss(node, glossAccent, c.glossAccent);

  switch (type) {
    case 'p': {
      const base = accentEllipse(22.5, 40.8, 8.4, 2.2, accentId, c.stroke);
      const stem = bodyPath('M15.7 40.8 C15.7 34.4 16.9 27 18.4 22.9 C19.3 20.6 21.2 20 22.5 20.9 C23.8 20 25.7 20.6 26.6 22.9 C28.1 27 29.3 34.4 29.3 40.8 Z', bodyId, c.stroke);
      const collar = accentEllipse(22.5, 21.6, 6.4, 1.5, accentId, c.stroke);
      const neck = bodyPath('M17.7 21.6 C17.7 17.7 19.2 15.2 22.5 15.2 C25.8 15.2 27.3 17.7 27.3 21.6 Z', bodyId, c.stroke);
      const head = accentCircle(22.5, 12.4, 5.1, accentId, c.stroke);
      return (
        <>
          {base}{GA(base)}
          {stem}{GB(stem)}
          {collar}{GA(collar)}
          {neck}{GB(neck)}
          {head}{GA(head)}
        </>
      );
    }

    case 'r': {
      const base = accentEllipse(22.5, 40.8, 9.2, 2.3, accentId, c.stroke);
      const body = bodyPath('M14.9 40.8 C14.9 34.3 16 26.3 17.2 21.2 L27.8 21.2 C29 26.3 30.1 34.3 30.1 40.8 Z', bodyId, c.stroke);
      const band = accentRect(14.4, 21.2, 16.2, 4.6, 1, accentId, c.stroke);
      const lip = accentEllipse(22.5, 16.4, 7.6, 0.9, accentId, c.stroke);
      const merlons = bodyPath('M14.4 21.2 v-4.8 h2.4 v4.8 h1.2 v-4.8 h2.4 v4.8 h1.2 v-4.8 h2.4 v4.8 h1.2 v-4.8 h2.4 v4.8 h1.2 v-4.8 h2 v4.8', bodyId, c.stroke);
      return (
        <>
          {base}{GA(base)}
          {body}{GB(body)}
          {band}{GA(band)}
          {lip}{GA(lip)}
          {merlons}{GB(merlons)}
          {detailLine('M15.4 30.5 h24.2 M16.2 25.5 h22.6', c.detail, 0.8, 0.5)}
        </>
      );
    }

    case 'n': {
      const base = accentEllipse(26.5, 39.2, 12.5, 2.1, accentId, c.stroke);
      const head = bodyPath('M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21', bodyId, c.stroke);
      const mane = (
        <Path
          d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"
          fill={c.shade}
        />
      );
      return (
        <>
          {base}{GA(base)}
          {head}{GB(head)}
          {mane}
          <Circle cx={9.5} cy={25.5} r={0.8} fill={c.eye} />
          <Circle cx={14.4} cy={15.9} r={0.8} fill={c.eye} />
        </>
      );
    }

    case 'b': {
      const base = accentEllipse(22.5, 40.8, 9.2, 2.3, accentId, c.stroke);
      const body = bodyPath('M15.2 40.8 C15.2 35.6 16 30.9 17.3 27.1 C18.1 24.8 19.8 23.2 21.8 22.5 C21.2 21.8 20.9 20.9 21.1 20 C20.1 19.3 19.6 18 20 16.9 C20.3 15.8 21.3 15.1 22.4 15.1 C23.5 15.1 24.5 15.8 24.8 16.9 C25.2 18 24.7 19.3 23.7 20 C23.9 20.9 23.6 21.8 23 22.5 C25 23.2 26.7 24.8 27.5 27.1 C28.8 30.9 29.6 35.6 29.6 40.8 Z', bodyId, c.stroke);
      const ring = accentEllipse(22.5, 17.3, 3.4, 1, accentId, c.stroke);
      const mitre = bodyPath('M22.5 8.6 L19.4 14.6 C19.1 15.5 19.9 16.6 20.8 16.6 L24.2 16.6 C25.1 16.6 25.9 15.5 25.6 14.6 Z', bodyId, c.stroke);
      const ball = accentCircle(22.5, 7.2, 2.1, accentId, c.stroke);
      return (
        <>
          {base}{GA(base)}
          {body}{GB(body)}
          {ring}{GA(ring)}
          {mitre}{GB(mitre)}
          {ball}{GA(ball)}
          <Line x1={22.5} y1={9.4} x2={22.5} y2={15} stroke={c.detail} strokeWidth={1.3} strokeLinecap="round" opacity={0.7} />
          {detailLine('M19.8 27 c2 1.6 3.4 1.6 5.4 0 M20.6 24 c1.4 1.2 2.4 1.2 3.8 0', c.detail, 0.85, 0.6)}
        </>
      );
    }

    case 'q': {
      const base = accentEllipse(22.5, 40.8, 9.2, 2.3, accentId, c.stroke);
      const body = bodyPath('M14.7 40.8 C14.7 35.3 15.6 30.5 17 26.9 C18 24.3 20 22.6 22.2 22 C19.9 22.2 17.9 20.5 17.4 17.9 C16.7 14.5 19.1 11.5 22.5 11.5 C25.9 11.5 28.3 14.5 27.6 17.9 C27.1 20.5 25.1 22.2 22.8 22 C25 22.6 27 24.3 28 26.9 C29.4 30.5 30.3 35.3 30.3 40.8 Z', bodyId, c.stroke);
      const band = accentRect(19.8, 11.4, 5.4, 2, 0.8, accentId, c.stroke);
      const crown = accentPath('M19.8 11.4 L20.9 6.8 L22.5 11.4 L24.1 6.8 L25.2 11.4 Z', accentId, c.stroke);
      return (
        <>
          {base}{GA(base)}
          {body}{GB(body)}
          {band}{GA(band)}
          {crown}{GA(crown)}
          <Circle cx={20.9} cy={5.9} r={1} fill={`url(#${accentId})`} stroke={c.stroke} strokeWidth={0.8} />
          <Circle cx={22.5} cy={5.3} r={1.1} fill={`url(#${accentId})`} stroke={c.stroke} strokeWidth={0.8} />
          <Circle cx={24.1} cy={5.9} r={1} fill={`url(#${accentId})`} stroke={c.stroke} strokeWidth={0.8} />
          {detailLine('M18.2 24.5 c2.8 1.5 5.8 1.5 8.6 0 M17.5 27.5 c3.2 1.5 6.8 1.5 10.2 0 M17 30.5 c3.6 1.4 7.6 1.4 11.2 0', c.detail, 0.8, 0.55)}
        </>
      );
    }

    case 'k': {
      const base = accentEllipse(22.5, 40.8, 9.2, 2.3, accentId, c.stroke);
      const body = bodyPath('M14.9 40.8 C14.9 35.2 15.8 30.2 17.2 26.4 C18.2 23.8 20.2 22 22.5 21.4 C24.8 22 26.8 23.8 27.8 26.4 C29.2 30.2 30.1 35.2 30.1 40.8 Z', bodyId, c.stroke);
      const collar = accentEllipse(22.5, 20.6, 4.8, 1.1, accentId, c.stroke);
      const crownBlock = accentRect(20.3, 13, 4.4, 7.6, 1.2, accentId, c.stroke);
      const crownBand = accentRect(19.6, 15.4, 5.8, 2.4, 0.9, accentId, c.stroke);
      const cap = accentPath('M20.5 13 c0 -1.5 0.9 -2.4 2 -2.4 c1.1 0 2 0.9 2 2.4 Z', accentId, c.stroke);
      return (
        <>
          {base}{GA(base)}
          {body}{GB(body)}
          {collar}{GA(collar)}
          {crownBlock}{GA(crownBlock)}
          {crownBand}{GA(crownBand)}
          {cap}{GA(cap)}
          <Path d="M22.5 10.4 V6.8 M20.7 8.6 H24.3" stroke={c.detail} strokeWidth={1.7} strokeLinecap="round" fill="none" />
        </>
      );
    }

    default:
      return <></>;
  }
};

export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, size = 36, theme = 'classic' }) => {
  const c = useMemo(() => {
    const palettes = THEMES[theme] || THEMES.classic;
    return palettes[color] || palettes.w;
  }, [theme, color]);

  const bodyId = `rc-body-${color}${type}-${theme}`;
  const glossBodyId = `rc-glossb-${color}${type}-${theme}`;
  const accentId = `rc-accent-${color}${type}-${theme}`;
  const glossAccentId = `rc-glossa-${color}${type}-${theme}`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 45 45">
        <Defs>
          <LinearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.bodyTop} />
            <Stop offset="0.55" stopColor={c.bodyMid} />
            <Stop offset="1" stopColor={c.bodyBottom} />
          </LinearGradient>
          <LinearGradient id={accentId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.accentTop} />
            <Stop offset="1" stopColor={c.accentBottom} />
          </LinearGradient>
          <RadialGradient id={glossBodyId} cx="0.34" cy="0.16" r="0.85">
            <Stop offset="0" stopColor={c.gloss} stopOpacity={1} />
            <Stop offset="0.4" stopColor={c.gloss} stopOpacity={0.35} />
            <Stop offset="1" stopColor={c.gloss} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={glossAccentId} cx="0.34" cy="0.16" r="0.85">
            <Stop offset="0" stopColor={c.gloss} stopOpacity={1} />
            <Stop offset="0.45" stopColor={c.gloss} stopOpacity={0.3} />
            <Stop offset="1" stopColor={c.gloss} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {renderPiece(type, c, bodyId, glossBodyId, accentId, glossAccentId)}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
});
