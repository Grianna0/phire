import { StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { INK, MOUTH_CX, MOUTH_CY, VIEW } from './geometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type MouthProps = {
  size: number;
  /** -1 frown … 0 flat … 1 smile */
  curve: SharedValue<number>;
  /** 0 closed … 1 wide open */
  open: SharedValue<number>;
  /** 0 wide smile … 1 small round "o" */
  round: SharedValue<number>;
};

/**
 * One closed path whose control points are driven by curve/open/round,
 * so smile ↔ "o" ↔ frown morph smoothly (same commands in every shape).
 */
export function mouthPath(curve: number, open: number, round: number) {
  'worklet';
  const halfW = 9 - round * 5;
  const c = halfW * 0.55;
  const cornerY = MOUTH_CY - curve * 3;
  const topY = MOUTH_CY + curve * 2 - round * open * 7;
  const botY = MOUTH_CY + curve * 2 + open * 10;
  const l = MOUTH_CX - halfW;
  const r = MOUTH_CX + halfW;
  return (
    `M${l} ${cornerY} C${MOUTH_CX - c} ${topY} ${MOUTH_CX + c} ${topY} ${r} ${cornerY} ` +
    `C${MOUTH_CX + c} ${botY} ${MOUTH_CX - c} ${botY} ${l} ${cornerY} Z`
  );
}

export default function Mouth({ size, curve, open, round }: MouthProps) {
  const animatedProps = useAnimatedProps(() => ({ d: mouthPath(curve.value, open.value, round.value) }));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`} style={styles.fill} pointerEvents="none">
      <AnimatedPath
        animatedProps={animatedProps}
        d={mouthPath(1, 0.35, 0)}
        fill="#D9493B"
        stroke={INK}
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0 },
});
