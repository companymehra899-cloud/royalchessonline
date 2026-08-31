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

// Realistic 3D Staunton chess piece set.
// Each piece is sculpted from layered gradients (vertical body shading + an
// upper-left radial gloss + a right-edge shadow) so it reads as a glossy,
// physically carved Staunton piece instead of a flat silhouette.

interface PieceColors {
  bodyTop: string;
  bodyMid: string;
  bodyBottom: string;
  baseUnderside: string;
  gloss: string;
  glossBody: number;
  glossAccent: number;
  stroke: string;
  strokeSoft: string;
  detail: string;
  shade: string;
  eye: string;
  accentTop: string;
  accentBottom: string;
  shadow: string;
}

const THEMES: Record<'classic' | 'luxury' | 'modern', Record<'w' | 'b', PieceColors>> = {
  classic: {
    w: {
      bodyTop: '#fffdf6',
      bodyMid: '#f3ecdc',
      bodyBottom: '#d8cdb4',
      baseUnderside: '#b3a98f',
      gloss: '#ffffff',
      glossBody: 0.55,
      glossAccent: 0.75,
      stroke: '#6b6354',
      strokeSoft: '#9a9180',
      detail: '#857c6b',
      shade: 'rgba(70, 58, 38, 0.18)',
      eye: '#3b3326',
      accentTop: '#fbf5e8',
      accentBottom: '#c9bea5',
      shadow: 'rgba(50, 38, 20, 0.22)',
    },
    b: {
      bodyTop: '#4a4f57',
      bodyMid: '#2a2e34',
      bodyBottom: '#13161a',
      baseUnderside: '#08090b',
      gloss: '#c3cbd6',
      glossBody: 0.32,
      glossAccent: 0.42,
      stroke: '#000000',
      strokeSoft: '#3a3f47',
      detail: '#8b939f',
      shade: 'rgba(220, 228, 238, 0.10)',
      eye: '#d7dde6',
      accentTop: '#363b42',
      accentBottom: '#0e1013',
      shadow: 'rgba(0, 0, 0, 0.30)',
    },
  },
  luxury: {
    w: {
      bodyTop: '#fdf6e2',
      bodyMid: '#efdca9',
      bodyBottom: '#caa24d',
      baseUnderside: '#a07c30',
      gloss: '#fffbe8',
      glossBody: 0.58,
      glossAccent: 0.8,
      stroke: '#7a5c14',
      strokeSoft: '#a88840',
      detail: '#8a6a1d',
      shade: 'rgba(110, 75, 12, 0.22)',
      eye: '#4a3a12',
      accentTop: '#f8e7b8',
      accentBottom: '#bd9133',
      shadow: 'rgba(90, 60, 10, 0.25)',
    },
    b: {
      bodyTop: '#5a4626',
      bodyMid: '#2c2010',
      bodyBottom: '#120b04',
      baseUnderside: '#070402',
      gloss: '#d4af37',
      glossBody: 0.3,
      glossAccent: 0.42,
      stroke: '#000000',
      strokeSoft: '#4a3820',
      detail: '#a0813a',
      shade: 'rgba(214, 175, 55, 0.14)',
      eye: '#d8a84a',
      accentTop: '#43341a',
      accentBottom: '#100a04',
      shadow: 'rgba(0, 0, 0, 0.32)',
    },
  },
  modern: {
    w: {
      bodyTop: '#ffffff',
      bodyMid: '#eef1f6',
      bodyBottom: '#c2ccda',
      baseUnderside: '#9aa6b8',
      gloss: '#ffffff',
      glossBody: 0.58,
      glossAccent: 0.8,
      stroke: '#55606f',
      strokeSoft: '#8893a3',
      detail: '#6a7687',
      shade: 'rgba(50, 60, 82, 0.14)',
      eye: '#3f4a5c',
      accentTop: '#f0f4fa',
      accentBottom: '#aab6c6',
      shadow: 'rgba(40, 52, 74, 0.20)',
    },
    b: {
      bodyTop: '#38435a',
      bodyMid: '#1a2230',
      bodyBottom: '#070a10',
      baseUnderside: '#03050a',
      gloss: '#8a99b3',
      glossBody: 0.32,
      glossAccent: 0.44,
      stroke: '#000000',
      strokeSoft: '#3a4458',
      detail: '#64748b',
      shade: 'rgba(200, 215, 235, 0.10)',
      eye: '#bcc8da',
      accentTop: '#2e3850',
      accentBottom: '#0a0e16',
      shadow: 'rgba(0, 0, 0, 0.30)',
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
const bodyPath = (d: string, bodyId: string, stroke: string, sw = 1.1) => (
  <Path d={d} fill={`url(#${bodyId})`} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
);

const accentEllipse = (cx: number, cy: number, rx: number, ry: number, accentId: string, stroke: string, sw = 0.9) => (
  <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${accentId})`} stroke={stroke} strokeWidth={sw} />
);

const accentCircle = (cx: number, cy: number, r: number, accentId: string, stroke: string, sw = 0.9) => (
  <Circle cx={cx} cy={cy} r={r} fill={`url(#${accentId})`} stroke={stroke} strokeWidth={sw} />
);

const accentRect = (x: number, y: number, w: number, h: number, rx: number, accentId: string, stroke: string, sw = 0.9) => (
  <Rect x={x} y={y} width={w} height={h} rx={rx} fill={`url(#${accentId})`} stroke={stroke} strokeWidth={sw} />
);

const accentPath = (d: string, accentId: string, stroke: string, sw = 0.9) => (
  <Path d={d} fill={`url(#${accentId})`} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
);

const detailLine = (d: string, color: string, width = 0.85, opacity = 0.6) => (
  <Path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" fill="none" opacity={opacity} />
);

// A 3D disc base shared by every piece: a soft contact shadow, the foot cylinder
// (underside + side wall) and a lighter top rim. cx is the horizontal centre.
const renderBase = (
  cx: number,
  rx: number,
  c: PieceColors,
  bodyId: string,
  accentId: string,
  glossAccent: string,
): ReactElement => {
  const GA = (node: ReactElement) => withGloss(node, glossAccent, c.glossAccent);
  const x0 = cx - rx;
  const x1 = cx + rx;
  const foot = bodyPath(
    `M${x0} 39.6 C${x0} 40.9 ${cx - rx * 0.62} 41.7 ${cx} 41.7 C${cx + rx * 0.62} 41.7 ${x1} 40.9 ${x1} 39.6 L${x1} 38 C${x1} 36.7 ${cx + rx * 0.62} 35.9 ${cx} 35.9 C${cx - rx * 0.62} 35.9 ${x0} 36.7 ${x0} 38 Z`,
    bodyId,
    c.stroke,
    1.1,
  );
  const rim = accentEllipse(cx, 37.5, rx, rx * 0.205, accentId, c.stroke, 0.9);
  return (
    <>
      <Ellipse cx={cx} cy={42.4} rx={rx * 1.04} ry={rx * 0.2} fill={c.shadow} />
      {foot}
      {GA(foot)}
      {rim}
      {GA(rim)}
      <Ellipse cx={cx - rx * 0.34} cy={37.1} rx={rx * 0.34} ry={rx * 0.07} fill={c.gloss} opacity={c.glossAccent * 0.7} />
    </>
  );
};

// The tapered column shared by r/b/q/k: a gently concave stem with a subtle
// right-edge shadow for cylindrical volume.
const renderColumn = (
  cx: number,
  topRx: number,
  bottomRx: number,
  c: PieceColors,
  bodyId: string,
  glossBody: string,
): ReactElement => {
  const GB = (node: ReactElement) => withGloss(node, glossBody, c.glossBody);
  const x0 = cx - bottomRx;
  const x1 = cx + bottomRx;
  const xt0 = cx - topRx;
  const xt1 = cx + topRx;
  const col = bodyPath(
    `M${x0} 37.4 C${x0} 32 ${x0 + 0.4} 27 ${xt0 + 0.3} 23.2 L${xt1 - 0.3} 23.2 C${x1 - 0.4} 27 ${x1} 32 ${x1} 37.4 Z`,
    bodyId,
    c.stroke,
    1.1,
  );
  return (
    <>
      {col}
      {GB(col)}
      <Path
        d={`M${x1 - 0.6} 37 C${x1 - 0.8} 32 ${x1 - 1.2} 27 ${xt1 - 1.1} 23.6 L${xt1 - 0.5} 23.6 C${x1 - 0.4} 27 ${x1 - 0.2} 32 ${x1 - 0.1} 37 Z`}
        fill={c.shade}
        opacity={0.9}
      />
    </>
  );
};

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
      // Pawn: disc base, concave stem, collar, neck, round head.
      const stem = bodyPath('M16.8 37.3 C16.6 33.4 15.2 29.6 17.5 25 C18.5 23 20.4 22.4 22.5 22.4 C24.6 22.4 26.5 23 27.5 25 C29.8 29.6 28.4 33.4 28.2 37.3 Z', bodyId, c.stroke);
      const collar = accentEllipse(22.5, 23, 4.7, 1.25, accentId, c.stroke);
      const neck = bodyPath('M19.5 23 C19.3 20.5 20.6 18.8 22.5 18.8 C24.4 18.8 25.7 20.5 25.5 23 Z', bodyId, c.stroke);
      const head = accentCircle(22.5, 14.6, 5.3, accentId, c.stroke, 1);
      return (
        <>
          {renderBase(22.5, 8.7, c, bodyId, accentId, glossAccent)}
          {stem}{GB(stem)}
          {collar}{GA(collar)}
          {neck}{GB(neck)}
          {head}{GA(head)}
          <Circle cx={20.7} cy={12.8} r={1.7} fill={c.gloss} opacity={c.glossAccent * 0.8} />
        </>
      );
    }

    case 'r': {
      // Rook: disc base, column, collar, platform, crenellated battlements.
      const collar = accentRect(14.7, 22.4, 15.6, 3.4, 1, accentId, c.stroke);
      const platform = accentEllipse(22.5, 20.6, 7.5, 1.7, accentId, c.stroke);
      const merlons = bodyPath('M15 20.4 V14 H18.2 V16.9 H20.4 V14 H24.6 V16.9 H26.8 V14 H30 V20.4 Z', bodyId, c.stroke, 1.1);
      return (
        <>
          {renderBase(22.5, 9.1, c, bodyId, accentId, glossAccent)}
          {renderColumn(22.5, 6.4, 7.6, c, bodyId, glossBody)}
          {collar}{GA(collar)}
          {platform}{GA(platform)}
          {merlons}{GB(merlons)}
          {detailLine('M15.6 16.9 H29.4', c.detail, 0.7, 0.5)}
        </>
      );
    }

    case 'n': {
      // Knight: disc base, short column, carved horse head with mane, eye, nostril.
      const col = bodyPath('M17 37.2 C17 33.4 17.6 30.4 19.2 27.6 L28.8 27.6 C30.4 30.4 31 33.4 31 37.2 Z', bodyId, c.stroke);
      const head = bodyPath('M22 11c10.5 1 16.5 8 16 27.5H15c0-9 10-6.5 8-21', bodyId, c.stroke, 1.1);
      const mane = (
        <Path
          d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"
          fill={c.shade}
        />
      );
      return (
        <>
          {renderBase(24, 9, c, bodyId, accentId, glossAccent)}
          {col}{GB(col)}
          {head}{GB(head)}
          {mane}
          <Circle cx={9.5} cy={25.5} r={0.95} fill={c.eye} />
          <Circle cx={14.4} cy={15.9} r={0.95} fill={c.eye} />
          <Path d="M30 22.5 c1.4 0.6 2.4 1.8 2.6 3.4" stroke={c.detail} strokeWidth={0.8} strokeLinecap="round" fill="none" opacity={0.6} />
          <Path d="M31.5 27.5 c1.1 0.3 1.9 1 2.2 2" stroke={c.detail} strokeWidth={0.8} strokeLinecap="round" fill="none" opacity={0.5} />
        </>
      );
    }

    case 'b': {
      // Bishop: disc base, column, collar, mitre with diagonal slit, ball finial.
      const collar = accentEllipse(22.5, 22.6, 5.4, 1.3, accentId, c.stroke);
      const mitre = bodyPath('M17.6 29 C17.2 25.4 18.6 22.6 21 21.2 C20.2 20.4 20 19 20.6 17.8 C20 17 19.8 15.6 20.6 14.4 C21.4 13.2 22 12.8 22.5 12.8 C23 12.8 23.6 13.2 24.4 14.4 C25.2 15.6 25 17 24.4 17.8 C25 19 24.8 20.4 24 21.2 C26.4 22.6 27.8 25.4 27.4 29 Z', bodyId, c.stroke, 1.1);
      const ball = accentCircle(22.5, 11.4, 2.1, accentId, c.stroke, 0.9);
      return (
        <>
          {renderBase(22.5, 9.1, c, bodyId, accentId, glossAccent)}
          {renderColumn(22.5, 5.6, 7.6, c, bodyId, glossBody)}
          {collar}{GA(collar)}
          {mitre}{GB(mitre)}
          {ball}{GA(ball)}
          <Path d="M21.4 19.2 L23.8 25" stroke={c.detail} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
          {detailLine('M19.6 26 c1.9 1.4 3.9 1.4 5.8 0', c.detail, 0.8, 0.5)}
          <Circle cx={20.4} cy={16.2} r={1.1} fill={c.gloss} opacity={c.glossAccent * 0.7} />
        </>
      );
    }

    case 'q': {
      // Queen: disc base, column with rings, collar, coronet of points with balls.
      const collar = accentRect(17.4, 21.8, 10.2, 3, 1, accentId, c.stroke);
      const crown = accentPath('M17.4 21.8 L18.7 13.4 L20.6 18.6 L22.5 11.8 L24.4 18.6 L26.3 13.4 L27.6 21.8 Z', accentId, c.stroke, 0.9);
      return (
        <>
          {renderBase(22.5, 9.1, c, bodyId, accentId, glossAccent)}
          {renderColumn(22.5, 6, 7.7, c, bodyId, glossBody)}
          {detailLine('M16 30 h13 M16.4 33 h12.2', c.detail, 0.8, 0.45)}
          {collar}{GA(collar)}
          {crown}{GA(crown)}
          <Circle cx={18.7} cy={12.7} r={1.15} fill={`url(#${accentId})`} stroke={c.stroke} strokeWidth={0.8} />
          <Circle cx={22.5} cy={11.1} r={1.25} fill={`url(#${accentId})`} stroke={c.stroke} strokeWidth={0.8} />
          <Circle cx={26.3} cy={12.7} r={1.15} fill={`url(#${accentId})`} stroke={c.stroke} strokeWidth={0.8} />
          <Circle cx={20.6} cy={18} r={0.9} fill={`url(#${accentId})`} stroke={c.stroke} strokeWidth={0.7} />
          <Circle cx={24.4} cy={18} r={0.9} fill={`url(#${accentId})`} stroke={c.stroke} strokeWidth={0.7} />
        </>
      );
    }

    case 'k': {
      // King: disc base, column with rings, collar, crown block, cross on top.
      const collar = accentRect(17.6, 21.6, 9.8, 3, 1, accentId, c.stroke);
      const crownBlock = accentRect(19, 14.6, 7, 7.4, 1.2, accentId, c.stroke);
      const crownBand = accentRect(18.2, 17.2, 8.6, 2.6, 0.9, accentId, c.stroke);
      const cap = accentPath('M19.4 14.6 C19.4 12.8 20.6 11.6 22.5 11.6 C24.4 11.6 25.6 12.8 25.6 14.6 Z', accentId, c.stroke, 0.9);
      return (
        <>
          {renderBase(22.5, 9.1, c, bodyId, accentId, glossAccent)}
          {renderColumn(22.5, 6.2, 7.7, c, bodyId, glossBody)}
          {detailLine('M16 30 h13 M16.4 33 h12.2', c.detail, 0.8, 0.45)}
          {collar}{GA(collar)}
          {crownBlock}{GA(crownBlock)}
          {crownBand}{GA(crownBand)}
          {cap}{GA(cap)}
          <Circle cx={22.5} cy={11} r={1.5} fill={`url(#${accentId})`} stroke={c.stroke} strokeWidth={0.8} />
          <Path d="M22.5 10 V5.4 M20.4 7.7 H24.6" stroke={c.detail} strokeWidth={1.9} strokeLinecap="round" fill="none" />
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
            <Stop offset="0.5" stopColor={c.bodyMid} />
            <Stop offset="1" stopColor={c.bodyBottom} />
          </LinearGradient>
          <LinearGradient id={accentId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.accentTop} />
            <Stop offset="1" stopColor={c.accentBottom} />
          </LinearGradient>
          <RadialGradient id={glossBodyId} cx="0.32" cy="0.14" r="0.9">
            <Stop offset="0" stopColor={c.gloss} stopOpacity={1} />
            <Stop offset="0.42" stopColor={c.gloss} stopOpacity={0.3} />
            <Stop offset="1" stopColor={c.gloss} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={glossAccentId} cx="0.3" cy="0.12" r="0.85">
            <Stop offset="0" stopColor={c.gloss} stopOpacity={1} />
            <Stop offset="0.45" stopColor={c.gloss} stopOpacity={0.28} />
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
