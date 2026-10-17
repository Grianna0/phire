import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { EYE_LEFT_X, EYE_R, EYE_RIGHT_X, EYE_Y, INK } from './geometry';

type EyesProps = {
  k: number;
  /** State openness: 1 open, 0.5 half-closed, 0.1 asleep. */
  open: SharedValue<number>;
  /** Blink multiplier (1 → 0.1 → 1). */
  blink: SharedValue<number>;
  /** Pupil direction, -1..1 on each axis. */
  lookX: SharedValue<number>;
  lookY: SharedValue<number>;
};

export default function Eyes(props: EyesProps) {
  return (
    <>
      <Eye cx={EYE_LEFT_X} {...props} />
      <Eye cx={EYE_RIGHT_X} {...props} />
    </>
  );
}

const BOX = EYE_R * 2 + 2;
const PUPIL_R = 6.5;

function Eye({ cx, k, open, blink, lookX, lookY }: EyesProps & { cx: number }) {
  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: open.value * blink.value }] }));
  const pupilStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: lookX.value * 3.2 * k }, { translateY: lookY.value * 2.4 * k }],
  }));

  const px = BOX * k;
  const c = BOX / 2;

  return (
    <Animated.View
      style={[
        styles.abs,
        { left: (cx - c) * k, top: (EYE_Y - c) * k, width: px, height: px },
        eyeStyle,
      ]}
    >
      <Svg width={px} height={px} viewBox={`0 0 ${BOX} ${BOX}`}>
        <Circle cx={c} cy={c} r={EYE_R} fill="#FFFFFF" />
      </Svg>
      <Animated.View style={[styles.fill, pupilStyle]}>
        <Svg width={px} height={px} viewBox={`0 0 ${BOX} ${BOX}`}>
          <Circle cx={c} cy={c} r={PUPIL_R} fill={INK} />
          <Circle cx={c - 2.2} cy={c - 2.4} r={2} fill="#FFFFFF" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
