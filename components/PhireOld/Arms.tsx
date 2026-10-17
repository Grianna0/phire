import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../../theme';
import { SHOULDER_LEFT_X, SHOULDER_RIGHT_X, SHOULDER_Y } from './geometry';

// Right arm drawn in a 30 x 24 box, shoulder at (2, 14), tip curling up-right.
const ARM_W = 30;
const ARM_H = 24;
const SHOULDER = { x: 2, y: 14 };
const ARM_PATH =
  'M2 11 C8 10 15 12 21 6 C23 3 27 2 28 5 C29 10 25 17 17 20 C10 22 3 21 1 17 C0 14 0 12 2 11 Z';

type ArmProps = {
  side: 'left' | 'right';
  k: number;
  gradientId: string;
  /** Degrees; positive raises the arm, negative droops it. */
  raise: SharedValue<number>;
};

export default function Arm({ side, k, gradientId, raise }: ArmProps) {
  const isLeft = side === 'left';
  // Left arm is mirrored, so its shoulder sits at the right edge of its box.
  const shoulderX = isLeft ? ARM_W - SHOULDER.x : SHOULDER.x;
  const anchorX = isLeft ? SHOULDER_LEFT_X : SHOULDER_RIGHT_X;

  const style = useAnimatedStyle(() => ({
    // Clockwise lifts a left-side arm and lowers a right-side one.
    transform: [{ rotate: `${isLeft ? raise.value : -raise.value}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.abs,
        {
          left: (anchorX - shoulderX) * k,
          top: (SHOULDER_Y - SHOULDER.y) * k,
          width: ARM_W * k,
          height: ARM_H * k,
          transformOrigin: `${(shoulderX / ARM_W) * 100}% ${(SHOULDER.y / ARM_H) * 100}%`,
        },
        style,
      ]}
    >
      <Svg width={ARM_W * k} height={ARM_H * k} viewBox={`0 0 ${ARM_W} ${ARM_H}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.fireStart} />
            <Stop offset="1" stopColor={colors.fireEnd} />
          </LinearGradient>
        </Defs>
        <G transform={isLeft ? `translate(${ARM_W} 0) scale(-1 1)` : undefined}>
          <Path d={ARM_PATH} fill={`url(#${gradientId})`} />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
