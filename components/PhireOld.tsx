import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import Arm from './PhireOld/Arms';
import Eyes from './PhireOld/Eyes';
import Mouth from './PhireOld/Mouth';
import { BookPage, GlassFigure, Zzz } from './PhireOld/Effects';
import { BODY_PATH, GLOW_CENTER, SHINE_PATH, VIEW, innerLayerTransform } from './PhireOld/geometry';
import { impact } from '../lib/feedback';
import { colors } from '../theme';

export type PhireState = 'idle' | 'wave' | 'sleep' | 'success' | 'focus' | 'fail' | 'levelup';
export type PhireActivity = 'eating' | 'crafting';

export type PhireHandle = {
  /** Switch state from outside (replays one-shot states like success even if already set). */
  triggerState: (state: PhireState) => void;
  /** Play an activity once (eating ×3, crafting ×2). */
  triggerActivity: (activity: PhireActivity) => void;
  /** The tap bounce + glow. */
  bounce: () => void;
};

type PhireProps = {
  size?: number;
  state?: PhireState;
  /** 0..1, only used in 'focus' to scale and brighten the flame. */
  progress?: number;
  /** Optional activity played on top of the current state when this changes. */
  activity?: PhireActivity;
  onPress?: () => void;
  ref?: Ref<PhireHandle>;
};

type Pose = {
  scale: number;
  glow: number;
  /** Arm raise in degrees: [left, right]. */
  arms: [number, number];
  /** Mouth: [curve, open, round]. */
  mouth: [number, number, number];
  /** Eye openness. */
  eyes: number;
};

// Resting pose per state; one-shot animations settle onto these.
const POSES: Record<PhireState, Pose> = {
  idle: { scale: 1, glow: 0.35, arms: [10, 10], mouth: [1, 0.35, 0], eyes: 1 },
  wave: { scale: 1, glow: 0.4, arms: [10, 10], mouth: [1, 0.55, 0], eyes: 1 },
  sleep: { scale: 0.97, glow: 0.2, arms: [-18, -18], mouth: [0.3, 0.08, 0.4], eyes: 0.1 },
  success: { scale: 1.1, glow: 0.6, arms: [35, 35], mouth: [1, 0.6, 0], eyes: 1 },
  focus: { scale: 1, glow: 0.3, arms: [18, 18], mouth: [0.6, 0.12, 0], eyes: 1 },
  fail: { scale: 0.95, glow: 0.12, arms: [-25, -25], mouth: [-0.8, 0, 0], eyes: 0.5 },
  levelup: { scale: 1, glow: 0.5, arms: [10, 10], mouth: [1, 0.45, 0], eyes: 1 },
};

const EAT_LOOPS = 3;
const CRAFT_LOOPS = 2;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ease = Easing.inOut(Easing.quad);
const tween = (value: number, duration = 400) => withTiming(value, { duration, easing: ease });
const starsSource = require('../assets/lottie/stars.json');

export default function Phire({ size = 160, state = 'idle', progress = 0, activity, onPress, ref }: PhireProps) {
  const k = size / VIEW;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const focusProgress = clamp01(progress);
  const progressRef = useRef(focusProgress);
  progressRef.current = focusProgress;

  // `n` lets the same state be re-triggered from the ref.
  const [current, setCurrent] = useState({ state, n: 0 });
  useEffect(() => setCurrent((c) => (c.state === state ? c : { state, n: c.n + 1 })), [state]);

  const starsRef = useRef<LottieView>(null);

  // Body
  const breath = useSharedValue(1);
  const scale = useSharedValue(1);
  const glow = useSharedValue(POSES.idle.glow);
  const dim = useSharedValue(1);
  const tilt = useSharedValue(0);
  const sink = useSharedValue(0);
  const flash = useSharedValue(0);
  const flicker1 = useSharedValue(0);
  const flicker2 = useSharedValue(0);
  const flicker3 = useSharedValue(0);
  // Face
  const eyeOpen = useSharedValue(1);
  const blink = useSharedValue(1);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const mouthCurve = useSharedValue(POSES.idle.mouth[0]);
  const mouthOpen = useSharedValue(POSES.idle.mouth[1]);
  const mouthRound = useSharedValue(POSES.idle.mouth[2]);
  // Arms
  const armL = useSharedValue(POSES.idle.arms[0]);
  const armR = useSharedValue(POSES.idle.arms[1]);
  // Effects
  const zzzT = useSharedValue(0);
  const zzzVisible = useSharedValue(0);
  const pageT = useSharedValue(0);
  const craftT = useSharedValue(0);
  const starsScale = useSharedValue(1);
  // Where one-shot animations (tap, activities) settle back to.
  const rest = useSharedValue<Pose>(POSES.idle);

  // Independent ±2deg flicker per flame layer for the component's lifetime.
  useEffect(() => {
    const flick = (sv: SharedValue<number>, duration: number) => {
      const sin = Easing.inOut(Easing.sin);
      sv.value = withSequence(
        withTiming(2, { duration: duration / 2, easing: sin }),
        withRepeat(withTiming(-2, { duration, easing: sin }), -1, true),
      );
    };
    flick(flicker1, 1300);
    flick(flicker2, 1000);
    flick(flicker3, 800);
    return () => {
      cancelAnimation(flicker1);
      cancelAnimation(flicker2);
      cancelAnimation(flicker3);
    };
  }, [flicker1, flicker2, flicker3]);

  const bounce = useCallback(() => {
    const r = rest.value;
    scale.value = withSequence(
      withTiming(r.scale * 1.15, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(r.scale, { duration: 100, easing: Easing.in(Easing.quad) }),
    );
    glow.value = withSequence(withTiming(1, { duration: 100 }), withTiming(r.glow, { duration: 450 }));
  }, [glow, rest, scale]);

  // A burst requested before the Lottie has loaded (e.g. mounting straight into 'success')
  // is held and played on load.
  const starsLoaded = useRef(false);
  const starsPending = useRef(false);
  const fireStars = useCallback(() => {
    starsRef.current?.reset();
    starsRef.current?.play();
  }, []);
  const playStars = useCallback(
    (big: boolean) => {
      starsScale.value = big ? 1.5 : 1;
      if (starsLoaded.current) {
        fireStars();
        return;
      }
      starsPending.current = true;
      // Safety net in case the load event fired before we were listening.
      setTimeout(() => {
        if (!starsPending.current) return;
        starsPending.current = false;
        fireStars();
      }, 900);
    },
    [fireStars, starsScale],
  );
  const onStarsLoaded = useCallback(() => {
    starsLoaded.current = true;
    if (starsPending.current) {
      starsPending.current = false;
      fireStars();
    }
  }, [fireStars]);

  const playActivity = useCallback(
    (a: PhireActivity) => {
      const r = rest.value;
      if (a === 'eating') {
        const cycle = 900;
        pageT.value = 0;
        pageT.value = withTiming(EAT_LOOPS, { duration: cycle * EAT_LOOPS, easing: Easing.linear });
        // Open as the page arrives, snap shut, small chew.
        mouthOpen.value = withSequence(
          withRepeat(
            withSequence(
              withTiming(0.9, { duration: 450 }),
              withTiming(0.1, { duration: 250 }),
              withTiming(0.4, { duration: 100 }),
              withTiming(0.1, { duration: 100 }),
            ),
            EAT_LOOPS,
          ),
          tween(r.mouth[1], 250),
        );
        mouthRound.value = withSequence(tween(0.5, 150), withDelay(cycle * EAT_LOOPS - 150, tween(r.mouth[2], 250)));
        lookX.value = withSequence(tween(0.7, 200), withDelay(cycle * EAT_LOOPS - 400, tween(0, 300)));
      } else {
        const cycle = 1000;
        craftT.value = 0;
        craftT.value = withTiming(CRAFT_LOOPS, { duration: cycle * CRAFT_LOOPS, easing: Easing.linear });
        // Arms sweep in toward the middle, then back out, like shaping something.
        const shape = (restDeg: number) =>
          withSequence(withRepeat(withSequence(tween(-40, 500), tween(22, 500)), CRAFT_LOOPS), tween(restDeg, 300));
        armL.value = shape(r.arms[0]);
        armR.value = shape(r.arms[1]);
        lookY.value = withSequence(tween(0.7, 300), withDelay(cycle * CRAFT_LOOPS - 600, tween(0, 300)));
      }
    },
    [armL, armR, craftT, lookX, lookY, mouthOpen, mouthRound, pageT, rest],
  );

  useImperativeHandle(
    ref,
    () => ({
      triggerState: (s) => setCurrent((c) => ({ state: s, n: c.n + 1 })),
      triggerActivity: playActivity,
      bounce,
    }),
    [bounce, playActivity],
  );

  // ─── State transitions ──────────────────────────────────────────────────────
  useEffect(() => {
    // Unknown states (e.g. from untyped callers) fall back to idle instead of crashing.
    const s: PhireState = current.state in POSES ? current.state : 'idle';
    const p = progressRef.current;
    const pose: Pose =
      s === 'focus' ? { ...POSES.focus, scale: 1 + p * 0.4, glow: 0.3 + p * 0.7 } : POSES[s];
    rest.value = pose;

    const awake = s !== 'sleep' && s !== 'fail';

    // Posture
    dim.value = tween(s === 'fail' ? 0.6 : 1, s === 'fail' ? 800 : 300);
    tilt.value = tween(s === 'fail' ? 5 : s === 'sleep' ? -7 : 0, s === 'fail' ? 800 : 700);
    sink.value = tween(s === 'fail' ? 1 : s === 'sleep' ? 0.4 : 0, 800);

    // Breathing: slow when asleep, none while focusing or dimmed.
    if (s === 'focus' || s === 'fail') {
      cancelAnimation(breath);
      breath.value = tween(1, 300);
    } else {
      const half = s === 'sleep' ? 3000 : 1500;
      breath.value = withSequence(tween(1, 300), withRepeat(withTiming(1.04, { duration: half, easing: ease }), -1, true));
    }

    // Eyes
    eyeOpen.value = tween(pose.eyes, s === 'sleep' ? 700 : 300);
    if (awake) {
      blink.value = withRepeat(
        withSequence(withDelay(5850, withTiming(0.1, { duration: 75 })), withTiming(1, { duration: 75 })),
        -1,
      );
    } else {
      cancelAnimation(blink);
      blink.value = withTiming(1, { duration: 100 });
    }
    lookY.value = tween(awake ? 0 : 0.5, 500);
    lookX.value =
      s === 'wave' ? withSequence(tween(0.8, 200), withDelay(1000, tween(0, 300))) : tween(0, 300);

    // Mouth
    mouthCurve.value = tween(pose.mouth[0], 300);
    if (s === 'success') {
      mouthOpen.value = withSequence(tween(1, 120), withDelay(300, tween(pose.mouth[1], 250)));
      mouthRound.value = withSequence(tween(1, 120), withDelay(300, tween(pose.mouth[2], 250)));
    } else {
      mouthOpen.value = tween(pose.mouth[1], 300);
      mouthRound.value = tween(pose.mouth[2], 300);
    }

    // Arms
    const armMs = s === 'sleep' ? 900 : 400;
    armL.value = s === 'levelup' ? withSequence(tween(45, 200), tween(pose.arms[0], 400)) : tween(pose.arms[0], armMs);
    if (s === 'wave') {
      armR.value = withRepeat(
        withSequence(tween(60, 150), tween(30, 150), tween(60, 150), tween(pose.arms[1], 150)),
        2,
      );
    } else if (s === 'levelup') {
      armR.value = withSequence(tween(45, 200), tween(pose.arms[1], 400));
    } else {
      armR.value = tween(pose.arms[1], armMs);
    }

    // Sleep "Zzz"
    zzzVisible.value = tween(s === 'sleep' ? 1 : 0, 500);
    if (s === 'sleep') {
      zzzT.value = 0;
      zzzT.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(zzzT);
    }

    // Scale, glow, flash, stars
    switch (s) {
      case 'success':
        scale.value = withSequence(
          withTiming(1.3, { duration: 500, easing: Easing.out(Easing.back(2)) }),
          tween(pose.scale, 350),
        );
        glow.value = withSequence(withTiming(1, { duration: 150 }), tween(pose.glow, 700));
        playStars(false);
        break;
      case 'levelup':
        flash.value = withSequence(withTiming(0.85, { duration: 200, easing: Easing.out(Easing.quad) }), tween(0, 400));
        scale.value = withSequence(withTiming(1.2, { duration: 200, easing: Easing.out(Easing.quad) }), tween(pose.scale, 400));
        glow.value = withSequence(withTiming(1, { duration: 200 }), tween(pose.glow, 400));
        playStars(true);
        break;
      default:
        scale.value = tween(pose.scale, s === 'fail' ? 800 : 400);
        glow.value = tween(pose.glow, s === 'fail' ? 800 : 400);
    }
    // Only re-run on a new state (or re-trigger), not on every focus progress tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Focus progress drives size and glow continuously.
  useEffect(() => {
    if (current.state !== 'focus') return;
    const target = { ...POSES.focus, scale: 1 + focusProgress * 0.4, glow: 0.3 + focusProgress * 0.7 };
    rest.value = target;
    scale.value = tween(target.scale, 300);
    glow.value = tween(target.glow, 300);
  }, [focusProgress, current.state, glow, rest, scale]);

  // Declared after the state effect so an activity started alongside a state change wins.
  useEffect(() => {
    if (activity) playActivity(activity);
  }, [activity, playActivity]);

  // ─── Animated styles ────────────────────────────────────────────────────────
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: dim.value,
    transform: [
      { translateY: sink.value * 5 * k },
      { rotate: `${tilt.value}deg` },
      { scale: scale.value * breath.value },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const layer1Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${flicker1.value}deg` }] }));
  const layer2Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${flicker2.value}deg` }] }));
  const layer3Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${flicker3.value}deg` }] }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
    transform: [{ rotate: `${flicker1.value}deg` }],
  }));
  const starsStyle = useAnimatedStyle(() => ({ transform: [{ scale: starsScale.value }] }));

  const glowSize = size * 1.7;
  const starsSize = size * 1.8;
  const svgProps = { width: size, height: size, viewBox: `0 0 ${VIEW} ${VIEW}` };

  const handlePress = () => {
    impact('light');
    bounce();
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel="Phire"
      style={{ width: size, height: size }}
    >
      <Animated.View style={[styles.fill, styles.bodyOrigin, bodyStyle]} pointerEvents="none">
        {/* Warm glow */}
        <Animated.View
          style={[
            styles.abs,
            {
              width: glowSize,
              height: glowSize,
              left: GLOW_CENTER.x * k - glowSize / 2,
              top: GLOW_CENTER.y * k - glowSize / 2,
            },
            glowStyle,
          ]}
        >
          <Svg width={glowSize} height={glowSize}>
            <Defs>
              <RadialGradient id={`glow${uid}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={colors.warmGlow} stopOpacity={0.95} />
                <Stop offset="0.45" stopColor={colors.fireEnd} stopOpacity={0.45} />
                <Stop offset="1" stopColor={colors.fireEnd} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={glowSize / 2} cy={glowSize / 2} r={glowSize / 2} fill={`url(#glow${uid})`} />
          </Svg>
        </Animated.View>

        {/* Flame body: three offset layers, each flickering on its own */}
        <Animated.View style={[styles.fill, styles.layerOrigin, layer1Style]}>
          <Svg {...svgProps}>
            <Defs>
              <LinearGradient id={`outer${uid}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.fireEnd} />
                <Stop offset="1" stopColor={colors.fireStart} />
              </LinearGradient>
            </Defs>
            <Path d={BODY_PATH} fill={`url(#outer${uid})`} />
            <Path d={SHINE_PATH} stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.85} />
          </Svg>
        </Animated.View>

        {/* Arms: in front of the outer layer (so a raised arm stays visible), behind the face layers */}
        <Arm side="left" k={k} raise={armL} gradientId={`armL${uid}`} />
        <Arm side="right" k={k} raise={armR} gradientId={`armR${uid}`} />
        <Animated.View style={[styles.fill, styles.layerOrigin, layer2Style]}>
          <Svg {...svgProps}>
            <Defs>
              <LinearGradient id={`mid${uid}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.warmGlow} />
                <Stop offset="1" stopColor={colors.fireEnd} />
              </LinearGradient>
            </Defs>
            <G transform={innerLayerTransform(0.86, 3)}>
              <Path d={BODY_PATH} fill={`url(#mid${uid})`} />
            </G>
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.fill, styles.layerOrigin, layer3Style]}>
          <Svg {...svgProps}>
            <Defs>
              <LinearGradient id={`inner${uid}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFDD6E" />
                <Stop offset="1" stopColor={colors.warmGlow} />
              </LinearGradient>
            </Defs>
            <G transform={innerLayerTransform(0.68, 7)}>
              <Path d={BODY_PATH} fill={`url(#inner${uid})`} />
            </G>
          </Svg>
        </Animated.View>

        {/* Level-up color pulse: whitens the flame, then fades */}
        <Animated.View style={[styles.fill, styles.layerOrigin, flashStyle]}>
          <Svg {...svgProps}>
            <Path d={BODY_PATH} fill="#FFFFFF" />
          </Svg>
        </Animated.View>

        <Eyes k={k} open={eyeOpen} blink={blink} lookX={lookX} lookY={lookY} />
        <Mouth size={size} curve={mouthCurve} open={mouthOpen} round={mouthRound} />

        <GlassFigure k={k} t={craftT} loops={CRAFT_LOOPS} gradientId={`fig${uid}`} />
        <BookPage k={k} t={pageT} loops={EAT_LOOPS} />
        <Zzz k={k} t={zzzT} visible={zzzVisible} />
      </Animated.View>

      {/* Star burst for success / levelup (plays once, never intercepts touches) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.abs,
          { width: starsSize, height: starsSize, left: (size - starsSize) / 2, top: (size - starsSize) / 2 },
          starsStyle,
        ]}
      >
        <LottieView
          ref={starsRef}
          source={starsSource}
          autoPlay={false}
          loop={false}
          onAnimationLoaded={onStarsLoaded}
          style={styles.fillStatic}
          webStyle={{ width: starsSize, height: starsSize }}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  fillStatic: { width: '100%', height: '100%' },
  // Scale/tilt from the base of the flame so it grows upward.
  bodyOrigin: { transformOrigin: '50% 93%' },
  layerOrigin: { transformOrigin: '50% 90%' },
});
