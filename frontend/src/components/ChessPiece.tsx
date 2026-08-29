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

// Ultra-realistic 3D vector piece set. Each piece is built from the canonical
// Staunton silhouettes (cburnett geometry, 45×45 viewBox) and shaded with layered
// gradients + specular highlights so it reads as glossy sculpted marble with high
// contrast lighting, smooth edges and a grounding contact shadow.
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
  // Polished white/black marble — bright specular top, deep shadowed base.
  classic: {
    w: {
      bodyTop: '#ffffff',
      bodyMid: '#f3efe4',
      bodyBottom: '#cdc5b2',
      gloss: '#ffffff',
      glossBody: 0.62,
      glossAccent: 0.82,
      stroke: '#6b6452',
      detail: '#8a8270',
      shade: 'rgba(70, 58, 38, 0.22)',
      eye: '#5a4f3d',
      accentTop: '#f7f3e9',
      accentBottom: '#cbc1ac',
    },
    b: {
      bodyTop: '#52585f',
      bodyMid: '#2a2e35',
      bodyBottom: '#07090c',
      gloss: '#aeb8c6',
      glossBody: 0.34,
      glossAccent: 0.46,
      stroke: '#000000',
      detail: '#7c8898',
      shade: 'rgba(200, 215, 235, 0.12)',
      eye: '#c0cad6',
      accentTop: '#40474f',
      accentBottom: '#0b0d10',
    },
  },
  // Gold-veined luxury marble.
  luxury: {
    w: {
      bodyTop: '#fffdf5',
      bodyMid: '#f0e2bf',
      bodyBottom: '#c9a852',
      gloss: '#fffbe8',
      glossBody: 0.6,
      glossAccent: 0.8,
      stroke: '#7a5c14',
      detail: '#9a7a2d',
      shade: 'rgba(110, 75, 12, 0.26)',
      eye: '#5a4515',
      accentTop: '#f7e6b6',
      accentBottom: '#b89034',
    },
    b: {
      bodyTop: '#5a4a2a',
      bodyMid: '#2c2110',
      bodyBottom: '#0a0603',
      gloss: '#e6c659',
      glossBody: 0.3,
      glossAccent: 0.42,
      stroke: '#000000',
      detail: '#b89244',
      shade: 'rgba(214, 175, 55, 0.18)',
      eye: '#e0b840',
      accentTop: '#4a3a1e',
      accentBottom: '#100b04',
    },
  },
  // Cool contemporary marble.
  modern: {
    w: {
      bodyTop: '#ffffff',
      bodyMid: '#eef2f7',
      bodyBottom: '#b8c2cf',
      gloss: '#ffffff',
      glossBody: 0.58,
      glossAccent: 0.82,
      stroke: '#5a6473',
      detail: '#6f7b8c',
      shade: 'rgba(50, 60, 82, 0.18)',
      eye: '#475061',
      accentTop: '#eaf0f6',
      accentBottom: '#a6b2c0',
    },
    b: {
      bodyTop: '#3a4458',
      bodyMid: '#1a2030',
      bodyBottom: '#05080d',
      gloss: '#8b98ad',
      glossBody: 0.32,
      glossAccent: 0.44,
      stroke: '#000000',
      detail: '#6c7a92',
      shade: 'rgba(200, 215, 235, 0.12)',
      eye: '#b4c0d2',
      accentTop: '#2e3648',
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

// Soft grounding shadow that sits beneath each piece (high-contrast lighting depth).
const groundShadow = (cx: number, cy: number, rx: number, ry: number, shadowId: string) => (
  <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${shadowId})`} />
);

// Faint marble vein running down a piece body.
const marbleVein = (d: string, color: string) => (
  <Path d={d} stroke={color} strokeWidth={0.5} strokeLinecap="round" fill="none" opacity={0.16} />
);

const renderPiece = (
  type: string,
  c: PieceColors,
  bodyId: string,
  glossBody: string,
  accentId: string,
  glossAccent: string,
  shadowId: string,
): ReactElement => {
  const GB = (node: ReactElement) => withGloss(node, glossBody, c.glossBody);
  const GA = (node: ReactElement) => withGloss(node, glossAccent, c.glossAccent);

  switch (type) {
    case 'p': {
      const shadow = groundShadow(22.5, 43, 7.5, 1.6, shadowId);
      const body = bodyPath(
        'm 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z',
        bodyId,
        c.stroke,
      );
      return (
        <>
          {shadow}
          {body}
          {GB(body)}
        </>
      );
    }

    case 'r': {
      const shadow = groundShadow(22.5, 42.5, 11, 1.7, shadowId);
      const base = bodyPath('M 9,39 L 36,39 L 36,36 L 9,36 Z', bodyId, c.stroke);
      const baseMid = bodyPath('M 12,36 L 12,32 L 33,32 L 33,36 Z', bodyId, c.stroke);
      const flare = bodyPath('M 14,29.5 L 31,29.5 L 32.5,32 L 12.5,32 Z', bodyId, c.stroke);
      const column = bodyPath('M 14,17 L 31,17 L 31,29.5 L 14,29.5 Z', bodyId, c.stroke);
      const lip = bodyPath('M 11,14 L 34,14 L 31,17 L 14,17 Z', bodyId, c.stroke);
      const merlons = bodyPath(
        'M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 Z',
        bodyId,
        c.stroke,
      );
      return (
        <>
          {shadow}
          {merlons}{GB(merlons)}
          {lip}{GB(lip)}
          {column}{GB(column)}
          {flare}{GB(flare)}
          {baseMid}{GB(baseMid)}
          {base}{GB(base)}
          {marbleVein('M22,26 C20,23 24,21 22,18', c.detail)}
          {detailLine('M 11,14 L 34,14 M 14,17 L 31,17 M 14,17 L 14,29.5 M 31,17 L 31,29.5 M 12.5,32 L 32.5,32', c.detail, 0.8, 0.5)}
        </>
      );
    }

    case 'n': {
      const shadow = groundShadow(24, 42.5, 12.5, 1.7, shadowId);
      const head = bodyPath('M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18', bodyId, c.stroke);
      const mane = (
        <Path
          d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"
          fill={c.shade}
        />
      );
      return (
        <>
          {shadow}
          {head}{GB(head)}
          {mane}
          <Circle cx={9.5} cy={25.5} r={0.7} fill={c.eye} />
          <Circle cx={14.3} cy={15.5} r={0.7} fill={c.eye} />
        </>
      );
    }

    case 'b': {
      const shadow = groundShadow(22.5, 42.5, 10, 1.7, shadowId);
      const base = bodyPath(
        'M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.65,38.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 Z',
        bodyId,
        c.stroke,
      );
      const body = bodyPath(
        'M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 Z',
        bodyId,
        c.stroke,
      );
      const ball = accentCircle(22.5, 8, 2.5, accentId, c.stroke);
      return (
        <>
          {shadow}
          {base}{GB(base)}
          {body}{GB(body)}
          {ball}{GA(ball)}
          {marbleVein('M22.5,28 C20.5,25 24.5,23 22.5,18', c.detail)}
          <Path d="M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" stroke={c.detail} strokeWidth={1.1} strokeLinecap="round" fill="none" opacity={0.7} />
          {detailLine('M 17.5,26 L 27.5,26 M 15,30 L 30,30', c.detail, 0.8, 0.5)}
        </>
      );
    }

    case 'q': {
      const shadow = groundShadow(22.5, 42.5, 11, 1.7, shadowId);
      const crown = bodyPath(
        'M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z',
        bodyId,
        c.stroke,
      );
      const body = bodyPath(
        'M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z',
        bodyId,
        c.stroke,
      );
      const jewels = [
        [6.5, 13.5], [14.3, 10.9], [22.5, 10], [30.7, 10.9], [38.5, 13.5],
      ].map(([x, y], i) => (
        <Circle key={`qj-${i}`} cx={x} cy={y} r={1} fill={`url(#${accentId})`} stroke={c.stroke} strokeWidth={0.7} />
      ));
      return (
        <>
          {shadow}
          {crown}{GB(crown)}
          {body}{GB(body)}
          {jewels}
          {marbleVein('M22.5,33 C20,30 25,28 22,25 C20.5,23 24,21.5 22,19', c.detail)}
          {detailLine('M 11.5,30 C 15,29 30,29 33.5,30 M 12,33.5 C 18,32.5 27,32.5 33,33.5', c.detail, 0.85, 0.55)}
        </>
      );
    }

    case 'k': {
      const shadow = groundShadow(22.5, 42.5, 11, 1.7, shadowId);
      const crownBulb = bodyPath(
        'M22.5 25 s4.5-7.5 3-10.5 c0 0-1-2.5-3-2.5 s-3 2.5-3 2.5 c-1.5 3 3 10.5 3 10.5 Z',
        bodyId,
        c.stroke,
      );
      const arms = bodyPath(
        'M12.5 37 c5.5 3.5 14.5 3.5 20 0 v-7 s9-4.5 6-10.5 c-4-6.5-13.5-3.5-16 4 V27 v-3.5 c-2.5-7.5-12-10.5-16-4 c-3 6 6 10.5 6 10.5 v7 Z',
        bodyId,
        c.stroke,
      );
      return (
        <>
          {shadow}
          {arms}{GB(arms)}
          {crownBulb}{GB(crownBulb)}
          {marbleVein('M22.5,33 C20,30 25,28 22.5,25 C20.5,23 24,21.5 22.5,19', c.detail)}
          {detailLine('M22.5 11.63 V6 M20 8 h5', c.detail, 1.5, 0.85)}
          {detailLine('M12.5 30 c5.5-3 14.5-3 20 0 m-20 3.5 c5.5-3 14.5-3 20 0 m-20 3.5 c5.5-3 14.5-3 20 0', c.detail, 0.8, 0.5)}
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
  const shadowId = `rc-shadow-${color}${type}-${theme}`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 45 45">
        <Defs>
          <LinearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.bodyTop} />
            <Stop offset="0.5" stopColor={c.bodyMid} />
            <Stop offset="1" stopColor={c.bodyBottom} />
          </LinearGradient>
          <LinearGradient id={accentId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.accentTop} />
            <Stop offset="1" stopColor={c.accentBottom} />
          </LinearGradient>
          <RadialGradient id={glossBodyId} cx="0.34" cy="0.14" r="0.85">
            <Stop offset="0" stopColor={c.gloss} stopOpacity={1} />
            <Stop offset="0.38" stopColor={c.gloss} stopOpacity={0.32} />
            <Stop offset="1" stopColor={c.gloss} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={glossAccentId} cx="0.34" cy="0.14" r="0.85">
            <Stop offset="0" stopColor={c.gloss} stopOpacity={1} />
            <Stop offset="0.45" stopColor={c.gloss} stopOpacity={0.3} />
            <Stop offset="1" stopColor={c.gloss} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={shadowId} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.45} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {renderPiece(type, c, bodyId, glossBodyId, accentId, glossAccentId, shadowId)}
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
