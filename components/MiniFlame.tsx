import { useId } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

// Simple teardrop flame (100 x 120 box), reads better than Phire's body at icon size.
const PATH_OUTER =
  'M50 4 C60 22 84 40 84 74 C84 100 68 116 50 116 C32 116 16 100 16 74 C16 54 28 44 32 28 C38 40 42 44 45 47 C45 31 47 17 50 4 Z';
const PATH_INNER = 'M49 56 C56 66 63 75 63 88 C63 100 57 106 49 106 C41 106 36 100 36 90 C36 79 45 71 49 56 Z';

type Props = {
  /** 1 = spark, 2 = flame, 3 = blaze */
  stage: 1 | 2 | 3;
  size?: number;
};

// Flame paths are drawn in a 100 x 120 box; scale them into a 48 x 48 view.
const BOX = 48;
const SCALE = { 1: 0.17, 2: 0.27, 3: 0.33 } as const;

/** Static flame illustration that grows with `stage`. */
export default function MiniFlame({ stage, size = 48 }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const s = SCALE[stage];

  const flame = (scale: number, cx: number, key: string, opacity = 1) => (
    <G key={key} opacity={opacity} transform={`translate(${cx - 50 * scale} ${BOX - 3 - 116 * scale}) scale(${scale})`}>
      <Path d={PATH_OUTER} fill={`url(#outer${uid})`} />
      <Path d={PATH_INNER} fill={`url(#inner${uid})`} />
    </G>
  );

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
      <Defs>
        <LinearGradient id={`outer${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.fireStart} />
          <Stop offset="1" stopColor={colors.fireEnd} />
        </LinearGradient>
        <LinearGradient id={`inner${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.warmGlow} />
          <Stop offset="1" stopColor="#FFF1D6" />
        </LinearGradient>
        <RadialGradient id={`glow${uid}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.warmGlow} stopOpacity={0.7} />
          <Stop offset="1" stopColor={colors.warmGlow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={BOX / 2} cy={BOX - 14} r={6 + stage * 5} fill={`url(#glow${uid})`} />
      {stage === 3 && [flame(s * 0.6, BOX / 2 - 11, 'l', 0.9), flame(s * 0.6, BOX / 2 + 11, 'r', 0.9)]}
      {flame(s, BOX / 2, 'main')}
    </Svg>
  );
}
