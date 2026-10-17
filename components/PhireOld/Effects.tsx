import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, fonts } from '../../theme';
import { MOUTH_CX, MOUTH_CY } from './geometry';

type LoopProps = {
  k: number;
  /** Runs 0 → n for n loops; each whole number is one cycle. Visible only while 0 < t < n. */
  t: SharedValue<number>;
  loops: number;
};

// ─── Sleep: floating "Zzz" ───────────────────────────────────────────────────

const ZS = [
  { size: 9, dx: 0 },
  { size: 12, dx: 5 },
  { size: 15, dx: 10 },
];

export function Zzz({ k, t, visible }: { k: number; t: SharedValue<number>; visible: SharedValue<number> }) {
  return (
    <>
      {ZS.map((z, i) => (
        <ZLetter key={i} k={k} t={t} visible={visible} index={i} {...z} />
      ))}
    </>
  );
}

function ZLetter({
  k,
  t,
  visible,
  index,
  size,
  dx,
}: {
  k: number;
  t: SharedValue<number>;
  visible: SharedValue<number>;
  index: number;
  size: number;
  dx: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = (t.value + index / ZS.length) % 1;
    return {
      opacity: visible.value * Math.sin(p * Math.PI),
      transform: [{ translateX: (dx + p * 8) * k }, { translateY: -p * 24 * k }],
    };
  });
  return (
    <Animated.Text
      style={[
        styles.abs,
        styles.z,
        { left: 92 * k, top: 30 * k, fontSize: size * k, lineHeight: size * k * 1.2 },
        style,
      ]}
    >
      z
    </Animated.Text>
  );
}

// ─── Eating: a book page flies into the mouth ────────────────────────────────

const PAGE_W = 14;
const PAGE_H = 18;
const PAGE_START = { x: 118, y: 100 };

export function BookPage({ k, t, loops }: LoopProps) {
  const style = useAnimatedStyle(() => {
    const active = t.value > 0 && t.value < loops;
    const p = t.value % 1;
    const ease = 1 - (1 - p) * (1 - p);
    return {
      opacity: active ? (p < 0.75 ? 1 : (1 - p) / 0.25) : 0,
      transform: [
        { translateX: (MOUTH_CX - PAGE_START.x) * ease * k },
        { translateY: (MOUTH_CY - PAGE_START.y) * ease * k },
        { rotate: `${-15 + p * 25}deg` },
        { scale: 1 - p * 0.8 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.abs,
        {
          left: (PAGE_START.x - PAGE_W / 2) * k,
          top: (PAGE_START.y - PAGE_H / 2) * k,
          width: PAGE_W * k,
          height: PAGE_H * k,
        },
        style,
      ]}
    >
      <Svg width={PAGE_W * k} height={PAGE_H * k} viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}>
        <Rect x={0.5} y={0.5} width={PAGE_W - 1} height={PAGE_H - 1} rx={2} fill="#FFFDF8" stroke={colors.border} />
        {[5, 8, 11, 14].map((y) => (
          <Rect key={y} x={3} y={y} width={y === 14 ? 5 : 8} height={1.2} rx={0.6} fill={colors.mutedText} opacity={0.5} />
        ))}
      </Svg>
    </Animated.View>
  );
}

// ─── Crafting: a tiny glass flame figure grows, then floats away ─────────────

const FIG = 20;
const FIG_CENTER = { x: 60, y: 104 };

export function GlassFigure({ k, t, loops, gradientId }: LoopProps & { gradientId: string }) {
  const style = useAnimatedStyle(() => {
    const active = t.value > 0 && t.value < loops;
    const p = t.value % 1;
    const grow = p < 0.5 ? p / 0.5 : 1;
    const rise = p < 0.5 ? 0 : (p - 0.5) / 0.5;
    return {
      opacity: active ? (p < 0.1 ? p / 0.1 : 1 - rise) : 0,
      transform: [{ translateY: -rise * 34 * k }, { scale: 0.3 + grow * 0.8 }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.abs,
        { left: (FIG_CENTER.x - FIG / 2) * k, top: (FIG_CENTER.y - FIG / 2) * k, width: FIG * k, height: FIG * k },
        style,
      ]}
    >
      <Svg width={FIG * k} height={FIG * k} viewBox={`0 0 ${FIG} ${FIG}`}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.warmGlow} stopOpacity={0.9} />
            <Stop offset="1" stopColor={colors.warmGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={10} cy={11} r={10} fill={`url(#${gradientId})`} />
        <Path
          d="M10 2 C12 6 15 8 15 12 C15 15.5 12.8 17.5 10 17.5 C7.2 17.5 5 15.5 5 12 C5 9 8 7 10 2 Z"
          fill="#FFFFFF"
          fillOpacity={0.75}
          stroke={colors.fireEnd}
          strokeWidth={0.8}
        />
        <Path d="M8.2 9.5 C7.4 11 7.3 12.5 7.8 14" stroke="#FFFFFF" strokeWidth={0.9} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  z: { fontFamily: fonts.extraBold, color: '#6E6884' },
});
