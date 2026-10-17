// Phire, the app's mascot: a code-drawn flame (flickering tips, blinking eyes, moving arms) with six
// states. Shapes live in ./Phire/art (1000 × 1000 coordinates of the original reference drawing).
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { impact } from '../lib/feedback';
import {
  chatterFor,
  linesFor,
  shuffled,
  type PhireLine,
  type PhireMood,
  type PhireTopic,
} from '../lib/phireLines';
import { colors, radii, shadows, spacing, typography } from '../theme';
import {
  ARM_RIGHT,
  BODY_INNER,
  BODY_OUTER,
  EYE_R,
  EYES,
  FLICKER_MS,
  INNER_P,
  INNER_TOP,
  MOUTH,
  OUTER_P,
  OUTER_TOP,
  PUPIL_R,
  Pivot,
  SHINE_STYLE,
  SHINE_TOP_P,
  SHINES_SIDE,
  SHINES_TOP,
  SHOULDER_RIGHT,
  WAVE_IN,
  WAVE_OUT,
  TONGUE,
  flicker,
} from './Phire/art';

export type PhireState = 'default' | 'wave' | 'sad' | 'sleep' | 'working' | 'sport';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Wider than V2's so the laptop, dumbbell and Z's fit; the same for every state, so Phire
// never jumps in size or position when switching.
const VIEWBOX = '90 100 900 900';

const INK = '#251010';
const BROW = '#8A3B14';
const ARM_EDGE = '#E5791E';
const sine = Easing.inOut(Easing.sin);
// Slow-in/slow-out for limb motion (waving, lifting): eases gently at both ends like a real arm.
const smooth = Easing.inOut(Easing.cubic);
const REP_UP_MS = 700;
const REP_DOWN_MS = 800;

// ─── State geometry ──────────────────────────────────────────────────────────

// Arms are only drawn while Phire uses them: the dumbbell arm in sport, the hands in working.

// default: thin smile line
const SMILE = 'M420 628 Q500 662 582 614';
// tap moods: tongue poking out below the open mouth; small shy smile for blushing
const TONGUE_OUT = 'M462 666 C454 748 552 750 546 666 Z';
const SHY_SMILE = 'M448 640 Q500 672 554 634';
// Twinkling stars around Phire (starry lines). 4-point star at the local origin.
const TWINKLES = [
  { x: 200, y: 300, s: 48, phase: 0.0 },
  { x: 815, y: 330, s: 40, phase: 0.35 },
  { x: 150, y: 600, s: 34, phase: 0.7 },
  { x: 880, y: 650, s: 50, phase: 0.15 },
  { x: 290, y: 905, s: 36, phase: 0.5 },
  { x: 725, y: 920, s: 42, phase: 0.85 },
  { x: 600, y: 150, s: 30, phase: 0.6 },
];
const starPath = (s: number) => {
  const c = s * 0.18;
  return `M0 ${-s} Q${c} ${-c} ${s} 0 Q${c} ${c} 0 ${s} Q${-c} ${c} ${-s} 0 Q${-c} ${-c} 0 ${-s} Z`;
};
// wave: V2's open mouth + a small fang on the right
// The tooth hangs from the top lip: its top starts above the lip line and is clipped to the
// mouth outline, so it always meets the lip exactly; the tip is softly rounded.
const FANG = 'M542 592 L578 588 C574 606 568 620 564 628 C561 633 557 633 555 628 C551 618 547 606 542 592 Z';
// working: smaller open mouth with a fang (V2 mouth scaled around its center)
const WORK_MOUTH_T = 'translate(500 640) scale(0.62) translate(-500 -640)';
// sad / sport: frowns
const FROWN_SAD = 'M456 662 Q500 628 546 662';
const FROWN_SPORT = 'M428 662 Q500 616 578 656';
// sleep: closed eyes and a small open mouth
const SLEEP_MOUTH = 'M455 668 C455 642 548 642 548 668 C548 694 455 694 455 668 Z';
const SLEEP_TONGUE = 'M462 680 C480 668 524 668 542 680 C532 692 470 692 462 680 Z';
// Working: Phire peeks over a front-facing laptop (we see the back of the lid), with both
// hands resting on the lid's top edge, tapping in turn.
const LAPTOP_LID =
  'M300 716 L678 716 Q690 716 692 728 L706 868 Q708 880 696 880 L282 880 Q270 880 272 868 L286 728 Q288 716 300 716 Z';
const LAPTOP_BASE =
  'M232 880 L746 880 Q770 880 766 896 Q762 908 740 908 L238 908 Q216 908 212 896 Q208 880 232 880 Z';
const LAPTOP_LOGO =
  'M489 760 C504 782 524 798 524 821 C524 842 508 856 489 856 C470 856 454 842 454 821 ' +
  'C454 804 464 794 471 781 C477 793 483 797 487 799 C487 787 487 773 489 760 Z';
const HANDS = [
  { cx: 352, cy: 714 },
  { cx: 626, cy: 714 },
];
// Sport: dumbbell in the raised right hand, sweat drop on the left
// Sized like the PNG: big round weights, thick bar through the raised hand (≈850,470).
const DUMBBELL_BAR = 'M784 424 L912 502';
const DUMBBELL_PLATES = [
  { cx: 764, cy: 410 },
  { cx: 928, cy: 510 },
];
const PLATE_R = 56;
const SWEAT = 'M228 455 C245 485 268 510 268 535 C268 560 250 578 228 578 C206 578 188 560 188 535 C188 510 211 485 228 455 Z';
// Sleep: Z's, small → large, rising to the upper right
const ZS = [
  { x: 676, y: 236, s: 30 },
  { x: 728, y: 200, s: 38 },
  { x: 786, y: 158, s: 48 },
];

// ─── Per-state motion ────────────────────────────────────────────────────────

type Motion = {
  /** Breathing: half-cycle ms, extra scale, lift in px at size 200. */
  breathMs: number;
  breathScale: number;
  breathLift: number;
  /** Flame flicker strength (1 = V2). */
  flame: number;
  /** Warm glow behind the flame (opacity) and how many embers rise off the tips (0–1+). */
  glow: number;
  embers: number;
  /** Held body pose. */
  scale: number;
  y: number;
  tilt: number;
};

const MOTION: Record<PhireState, Motion> = {
  default: { breathMs: 1500, breathScale: 0.03, breathLift: 4, flame: 1, glow: 0.55, embers: 1, scale: 1, y: 0, tilt: 0 },
  wave: { breathMs: 1500, breathScale: 0.03, breathLift: 4, flame: 1.15, glow: 0.6, embers: 1, scale: 1, y: 0, tilt: 0 },
  sad: { breathMs: 2500, breathScale: 0.015, breathLift: 2, flame: 0.45, glow: 0.25, embers: 0.25, scale: 0.95, y: 10, tilt: 0 },
  sleep: { breathMs: 2500, breathScale: 0.02, breathLift: 2, flame: 0.35, glow: 0.3, embers: 0.15, scale: 1, y: 0, tilt: 3 },
  working: { breathMs: 1500, breathScale: 0.015, breathLift: 2, flame: 0.8, glow: 0.45, embers: 0.6, scale: 1, y: 0, tilt: 0 },
  sport: { breathMs: 1500, breathScale: 0.02, breathLift: 0, flame: 1.2, glow: 0.65, embers: 1, scale: 1, y: 0, tilt: 0 },
};

// Embers: small sparks that drift up off the flame tips and fade, each on its own phase.
const EMBERS = [
  { x: 372, phase: 0.0, drift: 14, rise: 210, r: 11, color: '#FFD36E' },
  { x: 440, phase: 0.42, drift: 10, rise: 240, r: 14, color: '#FFB347' },
  { x: 505, phase: 0.18, drift: 16, rise: 190, r: 10, color: '#FFE29A' },
  { x: 560, phase: 0.66, drift: 12, rise: 230, r: 13, color: '#FF9E40' },
  { x: 615, phase: 0.31, drift: 14, rise: 200, r: 10, color: '#FFD36E' },
  { x: 668, phase: 0.83, drift: 10, rise: 180, r: 11, color: '#FFB347' },
  { x: 470, phase: 0.55, drift: 18, rise: 260, r: 8, color: '#FFE29A' },
];
const EMBER_MS = 2600;

// Star burst (Lottie), centered on the body. Body center ≈ (486, 560) in the viewBox below.
const STARS_SOURCE = require('../assets/lottie/stars.json');
const BODY_CENTER = { x: (486 - 90) / 900, y: (560 - 100) / 900 };

type Props = {
  state?: PhireState;
  size?: number;
  /** Celebrate: the flame flares up and a star burst plays. Plays on mount and whenever it changes. */
  burst?: 'stars' | 'big';
  /** Tap to make Phire react (bounce, hop, flare) and say a line in a speech bubble. */
  interactive?: boolean;
  /** Say a line on his own shortly after appearing (e.g. a kind word after a stopped session). */
  greet?: boolean;
  /** Talk on his own now and then (tips about this screen + little musings). Off when unset. */
  chatty?: PhireTopic;
  /** Halo colours behind him [center, middle, edge], e.g. per skill level. Default: warm orange. */
  glowColors?: readonly [string, string, string];
  ref?: Ref<PhireHandle>;
};

const DEFAULT_GLOW = ['#FFCE7A', '#FFB347', '#FF7A45'] as const;

// How often he talks on his own (ms): first line after `first`, then every `min`–`max`.
// Quiet during focus sessions, so he cheers you on without being a distraction.
const CHATTER_PACE: Record<PhireTopic, { first: number; min: number; max: number }> = {
  home: { first: 6000, min: 18000, max: 32000 },
  onboarding: { first: 5000, min: 16000, max: 26000 },
  stats: { first: 7000, min: 20000, max: 35000 },
  complete: { first: 7000, min: 18000, max: 30000 },
  stopped: { first: 9000, min: 20000, max: 32000 },
  focus: { first: 60000, min: 150000, max: 240000 },
};
const randBetween = (a: number, b: number) => a + Math.random() * (b - a);

// Idea face: a lightbulb pops up beside his head (local coordinates, centered on the bulb).
const BULB_AT = { x: 830, y: 300 };
const BULB_RAYS = [-150, -115, -90, -65, -30].map((deg) => {
  const r = (deg * Math.PI) / 180;
  return `M${Math.cos(r) * 66} ${Math.sin(r) * 66 - 10} L${Math.cos(r) * 92} ${Math.sin(r) * 92 - 10}`;
});

/** Remote controls (used by the Developer tools screen). */
export type PhireHandle = {
  /** Say a line (optionally of a given mood) with its matching face. */
  say: (mood?: PhireMood) => void;
  /** Flare up + star burst. */
  burst: (big?: boolean) => void;
};

const BUBBLE_MS = 3800;
// Bubble sits just above the flame tips, so the flames stay visible (tail reaches down to them).
const BUBBLE_BOTTOM = 0.97;

export default function Phire({
  state = 'default',
  size = 200,
  burst,
  interactive = false,
  greet = false,
  chatty,
  glowColors = DEFAULT_GLOW,
  ref,
}: Props) {
  const k = size / 200;
  const ids = useSvgIds();

  // Always running
  const clock = useSharedValue(0);
  const breath = useSharedValue(0);
  // Per state
  const flame = useSharedValue(MOTION.default.flame);
  const breathScale = useSharedValue(MOTION.default.breathScale);
  const breathLift = useSharedValue(MOTION.default.breathLift);
  const bodyScale = useSharedValue(1);
  const bodyX = useSharedValue(0);
  const bodyY = useSharedValue(0);
  const tilt = useSharedValue(0);
  const blink = useSharedValue(1);
  const arm = useSharedValue(0); // the state's active right arm (wave / curl / typing)
  const loop = useSharedValue(0); // 0 → 1 helper loop for Z's and sweat
  const fade = useSharedValue(1);
  // "Alive" layer
  const emberClock = useSharedValue(0);
  const emberAmount = useSharedValue(MOTION.default.embers);
  const glow = useSharedValue(MOTION.default.glow);
  const lookX = useSharedValue(0); // occasional sideways glance, -1..1
  // Celebration
  const pop = useSharedValue(1);
  const glowBoost = useSharedValue(0);
  // Tap reaction + speech bubble
  const hop = useSharedValue(0);
  const bubbleIn = useSharedValue(0);
  const [line, setLine] = useState<PhireLine | null>(null);
  const deck = useRef<PhireLine[]>([]);
  // The face that goes with the current line (cleared with the bubble).
  const mood: PhireMood = line?.mood ?? 'none';
  const sparkle = useSharedValue(0); // twinkling stars around Phire, 0..1
  const idea = useSharedValue(0); // lightbulb over his head (tips), 0..1
  const twinkleClock = useSharedValue(0);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(bubbleTimer.current), []);
  // New state → new set of lines (e.g. sleepy ones while asleep).
  useEffect(() => {
    deck.current = [];
    chatterDeck.current = [];
  }, [state, chatty]);

  // ─── Chatter: now and then he speaks up on his own ─────────────────────────
  // Never over his own bubble, never right after a tap, and never while the app is in the background.
  const lineRef = useRef(line);
  lineRef.current = line;
  const lastSpoke = useRef(0);
  const chatterDeck = useRef<PhireLine[]>([]);
  const chatterSay = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(chatterSay.current), []);
  const speakUp = useRef(() => {});
  speakUp.current = () => {
    if (!chatty) return;
    if (chatterDeck.current.length === 0) chatterDeck.current = shuffled(chatterFor(chatty, state));
    const next = chatterDeck.current.pop();
    if (!next) return;
    // A thought strikes: glance off to one side, then turn back and say it.
    const dir = Math.random() < 0.5 ? -1 : 1;
    lookX.value = withSequence(
      withTiming(dir, { duration: 220, easing: sine }),
      withDelay(200, withTiming(0, { duration: 220, easing: sine })),
    );
    clearTimeout(chatterSay.current);
    chatterSay.current = setTimeout(() => react(false, next), 520);
  };
  useEffect(() => {
    if (!chatty) return;
    const pace = CHATTER_PACE[chatty];
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const quietFor = Date.now() - lastSpoke.current;
      if (AppState.currentState === 'active' && !lineRef.current && quietFor > pace.min * 0.6) speakUp.current();
      timer = setTimeout(tick, randBetween(pace.min, pace.max));
    };
    timer = setTimeout(tick, pace.first);
    return () => clearTimeout(timer);
  }, [chatty]);
  // greet: speak once, shortly after appearing (after the screen's entrance animation).
  useEffect(() => {
    if (!greet) return;
    const t = setTimeout(() => react(false), 900);
    return () => clearTimeout(t);
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Bounce, flare and say a line: the next from the deck, or `forced` (dev tools). */
  const react = (fromTap: boolean, forced?: PhireLine) => {
    if (fromTap) impact('light');
    // Squash-and-stretch bounce with a little hop, plus a quick flare of the flames.
    pop.value = withSequence(
      withTiming(1.12, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0.95, { duration: 120, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 180, easing: Easing.out(Easing.back(2)) }),
    );
    hop.value = withSequence(
      withTiming(-14 * k, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }),
    );
    flame.value = withSequence(
      withTiming(MOTION[state].flame + 0.9, { duration: 140 }),
      withTiming(MOTION[state].flame, { duration: 600, easing: sine }),
    );
    glowBoost.value = withSequence(withTiming(0.3, { duration: 120 }), withTiming(0, { duration: 600 }));
    blink.value = withSequence(withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 90 }));

    // Next line from a shuffled deck: every line once before any repeats.
    if (!forced && deck.current.length === 0) deck.current = shuffled(linesFor(state));
    const next = forced ?? deck.current.pop() ?? null;
    setLine(next);
    bubbleIn.value = 0;
    bubbleIn.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.6)) });

    // A starry line gets a star burst and twinkles for as long as the bubble is up.
    if (next?.mood === 'stars') {
      celebrate(false);
      sparkle.value = withTiming(1, { duration: 300 });
    } else {
      sparkle.value = withTiming(0, { duration: 200 });
    }
    // A tip gets the lightbulb: it pops in with a little overshoot.
    idea.value =
      next?.mood === 'idea'
        ? withDelay(120, withTiming(1, { duration: 380, easing: Easing.out(Easing.back(2.2)) }))
        : withTiming(0, { duration: 150 });

    lastSpoke.current = Date.now();
    // Longer lines (tips) stay up longer, so there's time to read them.
    const readMs = Math.min(6500, Math.max(BUBBLE_MS, (next?.text.length ?? 0) * 65));
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => {
      bubbleIn.value = withTiming(0, { duration: 220 });
      sparkle.value = withTiming(0, { duration: 300 });
      idea.value = withTiming(0, { duration: 220 });
      bubbleTimer.current = setTimeout(() => setLine(null), 230);
    }, readMs);
  };

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleIn.value,
    transform: [{ translateY: (1 - bubbleIn.value) * 10 }, { scale: 0.85 + 0.15 * bubbleIn.value }],
  }));

  // Flame clock: 0 → 2π, seamless (only whole multiples are used). Embers loop 0 → 1.
  useEffect(() => {
    clock.value = withRepeat(withTiming(2 * Math.PI, { duration: FLICKER_MS, easing: Easing.linear }), -1, false);
    emberClock.value = withRepeat(withTiming(1, { duration: EMBER_MS, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(clock);
      cancelAnimation(emberClock);
    };
  }, [clock, emberClock]);

  // Random blink every 3–5s and a glance to one side every 4–7s (not while asleep).
  useEffect(() => {
    if (state === 'sleep') {
      lookX.value = withTiming(0, { duration: 200 });
      return;
    }
    let blinkTimer: ReturnType<typeof setTimeout>;
    let lookTimer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      blinkTimer = setTimeout(() => {
        blink.value = withSequence(withTiming(0.1, { duration: 75 }), withTiming(1, { duration: 75 }));
        scheduleBlink();
      }, 3000 + Math.random() * 2000);
    };
    const scheduleLook = () => {
      lookTimer = setTimeout(() => {
        const dir = Math.random() < 0.5 ? -1 : 1;
        lookX.value = withSequence(
          withTiming(dir, { duration: 220, easing: sine }),
          withDelay(600 + Math.random() * 600, withTiming(0, { duration: 260, easing: sine })),
        );
        scheduleLook();
      }, 4000 + Math.random() * 3000);
    };
    scheduleBlink();
    scheduleLook();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(lookTimer);
    };
  }, [state, blink, lookX]);

  // ─── Star burst (Lottie) ──────────────────────────────────────────────────
  // A burst requested before the Lottie has loaded (e.g. mounting straight into a celebration)
  // is held and played on load, with a timer as a safety net.
  const starsRef = useRef<LottieView>(null);
  const starsLoaded = useRef(false);
  const starsPending = useRef(false);
  const [bigStars, setBigStars] = useState(false);
  const fireStars = useCallback(() => {
    starsRef.current?.reset();
    starsRef.current?.play();
  }, []);
  const onStarsLoaded = useCallback(() => {
    starsLoaded.current = true;
    if (starsPending.current) {
      starsPending.current = false;
      fireStars();
    }
  }, [fireStars]);
  // The web player doesn't always report "loaded"; by a second after mounting it's ready anyway,
  // so later bursts (e.g. when a focus session completes) start instantly.
  useEffect(() => {
    const t = setTimeout(() => {
      starsLoaded.current = true;
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  // State transitions: stop the old loops, ease into the new pose, start the new loops.
  useEffect(() => {
    const m = MOTION[state];
    [breath, bodyX, bodyY, tilt, arm, loop].forEach(cancelAnimation);
    const ease = (sv: SharedValue<number>, to: number, ms = 300) => {
      sv.value = withTiming(to, { duration: ms, easing: sine });
    };

    fade.value = 0.5;
    fade.value = withTiming(1, { duration: 220 });

    ease(flame, m.flame, 500);
    ease(glow, m.glow, 500);
    ease(emberAmount, m.embers, 500);
    ease(breathScale, m.breathScale, 500);
    ease(breathLift, m.breathLift * k, 500);
    ease(bodyScale, m.scale, state === 'sad' ? 900 : 300);
    ease(bodyY, m.y * k, state === 'sad' ? 900 : 300);
    ease(tilt, m.tilt, 800);
    ease(bodyX, 0, 200);
    breath.value = withRepeat(withTiming(1, { duration: m.breathMs, easing: sine }), -1, true);
    blink.value = withTiming(1, { duration: 100 });
    loop.value = 0;

    switch (state) {
      case 'wave':
        // Friendly wave: an unhurried swing of the raised arm (~1.3s per back-and-forth) and a
        // slower body sway at half that pace, so the two never look jittery together.
        arm.value = withSequence(
          withTiming(WAVE_IN, { duration: 500, easing: smooth }),
          withRepeat(withTiming(WAVE_OUT, { duration: 650, easing: smooth }), -1, true),
        );
        tilt.value = withSequence(
          withTiming(-2, { duration: 650, easing: sine }),
          withRepeat(withTiming(2, { duration: 1300, easing: sine }), -1, true),
        );
        break;
      case 'sleep':
        ease(arm, 0);
        loop.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false);
        break;
      case 'working':
        // Typing: tiny body jitter and a quick tap of the reaching arm.
        bodyX.value = withRepeat(
          withSequence(
            withTiming(1 * k, { duration: 75, easing: Easing.linear }),
            withTiming(-1 * k, { duration: 150, easing: Easing.linear }),
            withTiming(0, { duration: 75, easing: Easing.linear }),
          ),
          -1,
        );
        arm.value = withRepeat(withTiming(-5, { duration: 150, easing: sine }), -1, true);
        break;
      case 'sport':
        // Steady dumbbell reps like a real curl: lift (0.7s), lower a bit slower (0.8s). The body
        // rises slightly with the effort, in sync with the arm; the sweat drop slides down slowly.
        arm.value = withRepeat(
          withSequence(
            withTiming(-22, { duration: REP_UP_MS, easing: smooth }),
            withTiming(0, { duration: REP_DOWN_MS, easing: smooth }),
          ),
          -1,
        );
        bodyY.value = withRepeat(
          withSequence(
            withTiming(-6 * k, { duration: REP_UP_MS, easing: smooth }),
            withTiming(0, { duration: REP_DOWN_MS, easing: smooth }),
          ),
          -1,
        );
        loop.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.in(Easing.quad) }), -1, false);
        break;
      default:
        ease(arm, 0);
    }
  }, [state, k, arm, blink, bodyScale, bodyX, bodyY, breath, breathLift, breathScale, emberAmount, fade, flame, glow, loop, tilt]);

  // Celebration: the flame flares (bigger flicker, quick pop, bright glow) and the stars burst.
  // Used by the `burst` prop and by starry tap lines.
  const pendingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(pendingTimer.current), []);
  function celebrate(big: boolean) {
    setBigStars(big);
    const restFlame = MOTION[state].flame;
    flame.value = withSequence(
      withTiming(big ? 2.8 : 2.2, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(restFlame, { duration: 1100, easing: sine }),
    );
    pop.value = withSequence(
      withTiming(big ? 1.22 : 1.15, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 450, easing: sine }),
    );
    glowBoost.value = withSequence(withTiming(0.6, { duration: 150 }), withTiming(0, { duration: 1000, easing: sine }));
    if (starsLoaded.current) {
      fireStars();
      return;
    }
    starsPending.current = true;
    clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => {
      if (!starsPending.current) return;
      starsPending.current = false;
      fireStars();
    }, 900);
  }

  useImperativeHandle(ref, () => ({
    say: (mood) => {
      const pool = [...linesFor(state), ...chatterFor(chatty ?? 'home', state)];
      const matching = mood ? pool.filter((l) => l.mood === mood) : pool;
      // Moods a state has no lines for (e.g. "stars" while asleep) borrow from the everyday lines.
      const everyday = [...linesFor('default'), ...chatterFor('home', 'default')];
      const options = matching.length ? matching : everyday.filter((l) => !mood || l.mood === mood);
      react(false, options[Math.floor(Math.random() * options.length)]);
    },
    burst: (big = false) => celebrate(big),
  }));

  // Declared after the state effect so a burst sent together with a new state wins.
  useEffect(() => {
    if (burst) celebrate(burst === 'big');
    // Only on a new burst request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burst]);

  // Twinkle loop for the stars around Phire (only visible while `sparkle` > 0).
  useEffect(() => {
    twinkleClock.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(twinkleClock);
  }, [twinkleClock]);

  // Stop everything on unmount.
  useEffect(() => {
    const all = [clock, breath, flame, breathScale, breathLift, bodyScale, bodyX, bodyY, tilt, blink, arm, loop, fade];
    const alive = [emberClock, emberAmount, glow, lookX, pop, glowBoost, idea];
    return () => [...all, ...alive].forEach(cancelAnimation);
  }, [clock, breath, flame, breathScale, breathLift, bodyScale, bodyX, bodyY, tilt, blink, arm, loop, fade, emberClock, emberAmount, glow, lookX, pop, glowBoost, idea]);

  // Breathing stretches the flame a little taller than wide, so it feels like it's drawing breath.
  const bodyStyle = useAnimatedStyle(() => {
    const s = bodyScale.value * pop.value;
    const b = breath.value * breathScale.value;
    return {
      opacity: fade.value,
      transform: [
        { translateX: bodyX.value },
        { translateY: bodyY.value + hop.value - breath.value * breathLift.value },
        { rotate: `${tilt.value}deg` },
        { scaleX: s * (1 + b * 0.6) },
        { scaleY: s * (1 + b * 1.4) },
      ],
    };
  });
  const glowProps = useAnimatedProps(() => ({
    opacity: Math.min(1, glow.value * (0.75 + 0.25 * breath.value) + glowBoost.value),
  }));
  const pupilL = useAnimatedProps(() => ({ translateX: lookX.value * 9 }));
  const pupilR = useAnimatedProps(() => ({ translateX: lookX.value * 9 }));

  // Flames (outer + inner on different phases), strength per state.
  const outerProps = useAnimatedProps(() => ({ d: flicker(OUTER_P, clock.value, OUTER_TOP, 0, flame.value) }));
  const innerProps = useAnimatedProps(() => ({ d: flicker(INNER_P, clock.value, INNER_TOP, 0.9, flame.value) }));
  const shine0 = useAnimatedProps(() => ({ d: flicker(SHINE_TOP_P[0], clock.value, OUTER_TOP, 0, flame.value) }));
  const shine1 = useAnimatedProps(() => ({ d: flicker(SHINE_TOP_P[1], clock.value, OUTER_TOP, 0, flame.value) }));
  // One animatedProps per element (they can't be shared).
  const eyeL = useAnimatedProps(() => ({ scaleY: blink.value }));
  const eyeR = useAnimatedProps(() => ({ scaleY: blink.value }));
  const armProps = useAnimatedProps(() => ({ rotation: arm.value }));
  const dumbbellProps = useAnimatedProps(() => ({ rotation: arm.value }));
  // Working: `arm` loops 0 ↔ -5; the hands bob opposite each other like typing.
  const handL = useAnimatedProps(() => ({ translateY: arm.value * 1.6 }));
  const handR = useAnimatedProps(() => ({ translateY: (-5 - arm.value) * 1.6 }));
  // Z's drift up and fade, each a third of a cycle apart.
  const z0 = useAnimatedProps(() => zFloat(loop.value, 0));
  const z1 = useAnimatedProps(() => zFloat(loop.value, 1 / 3));
  const z2 = useAnimatedProps(() => zFloat(loop.value, 2 / 3));
  // Lightbulb: scales in from nothing, bobs gently, rays shimmer.
  const bulbProps = useAnimatedProps(() => ({
    scale: idea.value,
    opacity: Math.min(1, idea.value * 1.5),
    translateY: Math.sin(twinkleClock.value * Math.PI * 2) * 6,
  }));
  const raysProps = useAnimatedProps(() => ({
    opacity: idea.value * (0.55 + 0.45 * Math.sin(twinkleClock.value * Math.PI * 4)),
  }));
  const sweatProps = useAnimatedProps(() => ({
    translateY: loop.value * 60,
    opacity: loop.value < 0.75 ? 1 : (1 - loop.value) / 0.25,
  }));

  const eyesOpen = state !== 'sleep';

  const starsSize = size * (bigStars ? 2.2 : 1.7);
  const bubbleWidth = Math.max(190, Math.min(260, size * 1.4));

  return (
    <Pressable
      style={{ width: size, height: size }}
      onPress={() => react(true)}
      disabled={!interactive}
      pointerEvents={interactive ? 'auto' : 'none'}
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={interactive ? 'Phire. Tap to hear what he says.' : undefined}
    >
      <Animated.View style={[{ width: size, height: size }, styles.origin, bodyStyle]}>
        <Svg width={size} height={size} viewBox={VIEWBOX}>
          <Defs>
            <RadialGradient id={ids.glow} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={glowColors[0]} stopOpacity={0.9} />
              <Stop offset="0.55" stopColor={glowColors[1]} stopOpacity={0.35} />
              <Stop offset="1" stopColor={glowColors[2]} stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={ids.outer} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FBB11A" />
              <Stop offset="0.5" stopColor="#F79619" />
              <Stop offset="1" stopColor="#F5751D" />
            </LinearGradient>
            <LinearGradient id={ids.inner} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FEC80E" />
              <Stop offset="0.35" stopColor="#FCC10F" />
              <Stop offset="0.55" stopColor="#FAB611" />
              <Stop offset="1" stopColor="#F79912" />
            </LinearGradient>
            <LinearGradient id={ids.arm} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#F69B18" />
              <Stop offset="1" stopColor="#F37D1D" />
            </LinearGradient>
            <LinearGradient id={ids.steel} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#9A9A9A" />
              <Stop offset="1" stopColor="#6E6E6E" />
            </LinearGradient>
            <ClipPath id={ids.mouthClip}>
              <Path d={MOUTH} />
            </ClipPath>
            <ClipPath id={ids.sleepMouthClip}>
              <Path d={SLEEP_MOUTH} />
            </ClipPath>
          </Defs>

          {/* ── Warm glow that breathes with the flame ── */}
          <AnimatedCircle cx={486} cy={540} r={400} fill={`url(#${ids.glow})`} animatedProps={glowProps} />

          {/* ── Arms: only when he's using them (waving, lifting, or hands on the laptop) ── */}
          {(state === 'wave' || state === 'sport') && (
            <Pivot at={SHOULDER_RIGHT} animatedProps={armProps}>
              <Path d={ARM_RIGHT} fill={`url(#${ids.arm})`} />
            </Pivot>
          )}

          {/* ── Body with flickering flames ── */}
          <AnimatedPath d={BODY_OUTER} animatedProps={outerProps} fill={`url(#${ids.outer})`} />
          <AnimatedPath d={BODY_INNER} animatedProps={innerProps} fill={`url(#${ids.inner})`} />
          <AnimatedPath d={SHINES_TOP[0]} animatedProps={shine0} {...SHINE_STYLE} />
          <AnimatedPath d={SHINES_TOP[1]} animatedProps={shine1} {...SHINE_STYLE} />
          {SHINES_SIDE.map((d) => (
            <Path key={d} d={d} {...SHINE_STYLE} />
          ))}

          {/* ── Embers rising off the tips ── */}
          {EMBERS.map((e, i) => (
            <Ember key={i} ember={e} t={emberClock} amount={emberAmount} />
          ))}

          {/* ── Eyes ── */}
          {eyesOpen ? (
            EYES.map((e, i) =>
              // Blushing: both eyes squeezed into happy arcs. Tongue face: wink with the left eye.
              mood === 'blush' || (mood === 'tongue' && i === 0) ? (
                <Path
                  key={i}
                  d={`M${e.cx - 46} ${e.cy + 10} Q${e.cx} ${e.cy - 32} ${e.cx + 46} ${e.cy + 10}`}
                  stroke={INK}
                  strokeWidth={12}
                  strokeLinecap="round"
                  fill="none"
                />
              ) : (
                <Pivot key={i} at={{ x: e.cx, y: e.cy }} animatedProps={i === 0 ? eyeL : eyeR}>
                  <Eye
                    eye={e}
                    state={state}
                    side={i === 0 ? 'left' : 'right'}
                    mood={mood}
                    pupilProps={i === 0 ? pupilL : pupilR}
                  />
                </Pivot>
              ),
            )
          ) : (
            EYES.map((e) => (
              <Path
                key={e.cx}
                d={`M${e.cx - 48} ${e.cy + 4} Q${e.cx} ${e.cy + 40} ${e.cx + 48} ${e.cy + 4}`}
                stroke={INK}
                strokeWidth={11}
                strokeLinecap="round"
                fill="none"
              />
            ))
          )}

          {/* Brows */}
          {mood === 'idea' && eyesOpen && state !== 'sad' && state !== 'sport' &&
            // Raised in an "aha!" arch.
            EYES.map((e) => (
              <Path
                key={e.cx}
                d={`M${e.cx - 46} ${e.cy - 84} Q${e.cx} ${e.cy - 116} ${e.cx + 46} ${e.cy - 88}`}
                stroke={BROW}
                strokeWidth={12}
                strokeLinecap="round"
                fill="none"
              />
            ))}
          {state === 'sad' && (
            <>
              <Path d="M290 528 Q330 506 384 494" stroke={BROW} strokeWidth={13} strokeLinecap="round" fill="none" />
              <Path d="M614 488 Q660 492 700 520" stroke={BROW} strokeWidth={13} strokeLinecap="round" fill="none" />
            </>
          )}
          {state === 'sport' && (
            <>
              <Path d="M286 540 Q350 548 404 580" stroke={BROW} strokeWidth={14} strokeLinecap="round" fill="none" />
              <Path d="M592 576 Q640 540 700 532" stroke={BROW} strokeWidth={14} strokeLinecap="round" fill="none" />
            </>
          )}

          {/* Blush: rosy cheeks under the eyes */}
          {mood === 'blush' && (
            <>
              <Ellipse cx={300} cy={694} rx={44} ry={24} fill="#FF5E7E" opacity={0.5} />
              <Ellipse cx={700} cy={676} rx={44} ry={24} fill="#FF5E7E" opacity={0.5} />
            </>
          )}

          {/* ── Mouth ── */}
          <Mouth state={state} ids={ids} mood={mood} />

          {/* ── Props in front ── */}
          {state === 'sleep' && (
            <>
              {ZS.map((z, i) => (
                <G key={i} transform={`translate(${z.x} ${z.y})`}>
                  <AnimatedG animatedProps={[z0, z1, z2][i]}>
                    <Path
                      d={`M0 0 L${z.s} 0 L0 ${z.s} L${z.s} ${z.s}`}
                      stroke={INK}
                      strokeWidth={10}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </AnimatedG>
                </G>
              ))}
            </>
          )}

          {state === 'working' && (
            <>
              <Glasses />
              <Path d={LAPTOP_LID} fill="#5E6268" />
              {/* Soft highlight along the lid's top edge */}
              <Path d="M304 730 L674 730" stroke="#7A7F86" strokeWidth={6} strokeLinecap="round" />
              <Path d={LAPTOP_LOGO} fill="#80858C" />
              <Path d={LAPTOP_BASE} fill="#8B9096" />
              {/* Hands on the lid, tapping in turn while he types */}
              {HANDS.map((h, i) => (
                <AnimatedG key={i} animatedProps={i === 0 ? handL : handR}>
                  <Ellipse cx={h.cx} cy={h.cy} rx={36} ry={26} fill={`url(#${ids.arm})`} stroke={ARM_EDGE} strokeWidth={5} />
                  <Path
                    d={`M${h.cx - 12} ${h.cy - 4} L${h.cx - 12} ${h.cy + 12} M${h.cx + 6} ${h.cy - 4} L${h.cx + 6} ${h.cy + 12}`}
                    stroke={ARM_EDGE}
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                </AnimatedG>
              ))}
            </>
          )}

          {state === 'sport' && (
            <>
              {/* Dumbbell rotates with the arm (same pivot and angle) */}
              <Pivot at={SHOULDER_RIGHT} animatedProps={dumbbellProps}>
                <Path d={DUMBBELL_BAR} stroke="#707070" strokeWidth={26} strokeLinecap="round" />
                {DUMBBELL_PLATES.map((p) => (
                  <G key={p.cx}>
                    <Circle cx={p.cx} cy={p.cy} r={PLATE_R} fill={`url(#${ids.steel})`} />
                    <Circle cx={p.cx - 16} cy={p.cy - 18} r={13} fill="#C4C4C4" />
                  </G>
                ))}
                {/* Hand wrapped over the bar */}
                <Circle cx={848} cy={464} r={22} fill="#F69B18" />
              </Pivot>
              <AnimatedG animatedProps={sweatProps}>
                <Path d={SWEAT} fill="#52B8E8" />
                <Path d="M214 512 C210 524 210 536 214 546" stroke="#FFFFFF" strokeWidth={8} strokeLinecap="round" fill="none" />
              </AnimatedG>
            </>
          )}

          {/* ── Twinkling stars around him (starry lines) ── */}
          {TWINKLES.map((tw, i) => (
            <Twinkle key={i} twinkle={tw} t={twinkleClock} amount={sparkle} />
          ))}

          {/* ── Lightbulb beside his head (tips) ── */}
          <G transform={`translate(${BULB_AT.x} ${BULB_AT.y}) scale(1.3)`}>
            <AnimatedG animatedProps={bulbProps}>
              <AnimatedG animatedProps={raysProps}>
                {BULB_RAYS.map((d) => (
                  <Path key={d} d={d} stroke="#FFB020" strokeWidth={10} strokeLinecap="round" />
                ))}
              </AnimatedG>
              <Circle cx={0} cy={-10} r={48} fill="#FFE066" stroke="#F2A900" strokeWidth={6} />
              <Path d="M-14 -4 Q0 14 14 -4" stroke="#E08A00" strokeWidth={6} strokeLinecap="round" fill="none" />
              <Circle cx={-17} cy={-28} r={10} fill="#FFFFFF" opacity={0.9} />
              <Path d="M-22 36 L22 36 L18 64 L-18 64 Z" fill="#B9BEC5" />
              <Path d="M-20 46 L20 46 M-19 55 L19 55" stroke="#8E949C" strokeWidth={4} strokeLinecap="round" />
            </AnimatedG>
          </G>
        </Svg>
      </Animated.View>

      {/* Star burst: outside the body so it doesn't bounce with it; never intercepts touches. */}
      <View
        pointerEvents="none"
        style={[
          styles.stars,
          {
            width: starsSize,
            height: starsSize,
            left: BODY_CENTER.x * size - starsSize / 2,
            top: BODY_CENTER.y * size - starsSize / 2,
          },
        ]}
      >
        <LottieView
          ref={starsRef}
          source={STARS_SOURCE}
          autoPlay={false}
          loop={false}
          onAnimationLoaded={onStarsLoaded}
          style={styles.fill}
          webStyle={{ width: starsSize, height: starsSize }}
        />
      </View>

      {/* Speech bubble above the head, tail pointing down at Phire */}
      {line && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.bubble,
            {
              width: bubbleWidth,
              left: BODY_CENTER.x * size - bubbleWidth / 2,
              bottom: size * BUBBLE_BOTTOM,
            },
            bubbleStyle,
          ]}
        >
          {line.mood === 'idea' && (
            <View style={styles.tipLabel}>
              <Ionicons name="bulb" size={13} color={colors.fireStart} />
              <Text style={styles.tipText}>HOT TIP</Text>
            </View>
          )}
          <Text style={styles.bubbleText}>{line.text}</Text>
          <View style={styles.bubbleTail} />
        </Animated.View>
      )}
    </Pressable>
  );
}

type TwinkleCfg = (typeof TWINKLES)[number];

/** A 4-point star that pops in, spins a little and fades, looping; scaled by `amount` (0 = hidden). */
function Twinkle({ twinkle, t, amount }: { twinkle: TwinkleCfg; t: SharedValue<number>; amount: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const p = (t.value + twinkle.phase) % 1;
    const pulse = Math.sin(p * Math.PI); // 0 → 1 → 0
    return {
      opacity: amount.value * pulse,
      scale: amount.value * (0.4 + 0.6 * pulse),
      rotation: p * 45,
    };
  });
  return (
    <G transform={`translate(${twinkle.x} ${twinkle.y})`}>
      <AnimatedG animatedProps={props}>
        <Path d={starPath(twinkle.s)} fill="#FFD84A" stroke="#FFB020" strokeWidth={3} strokeLinejoin="round" />
        <Circle cx={0} cy={0} r={twinkle.s * 0.18} fill="#FFFFFF" opacity={0.85} />
      </AnimatedG>
    </G>
  );
}

type EmberCfg = (typeof EMBERS)[number];

/** One spark: rises from just below the tips, drifts side to side, fades in and out. */
function Ember({ ember, t, amount }: { ember: EmberCfg; t: SharedValue<number>; amount: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const p = (t.value + ember.phase) % 1;
    return {
      translateX: ember.x + Math.sin(p * Math.PI * 2 + ember.phase * 6) * ember.drift,
      translateY: 300 - p * ember.rise,
      opacity: Math.min(1, amount.value) * Math.sin(p * Math.PI),
    };
  });
  return (
    <AnimatedG animatedProps={props}>
      <Circle cx={0} cy={0} r={ember.r} fill={ember.color} />
    </AnimatedG>
  );
}

type SvgIds = ReturnType<typeof useSvgIds>;

/** Unique gradient/clip ids per instance, so several Phires can be mounted at once. */
function useSvgIds() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return {
    outer: `phOuter${uid}`,
    inner: `phInner${uid}`,
    arm: `phArm${uid}`,
    steel: `phSteel${uid}`,
    mouthClip: `phMouth${uid}`,
    sleepMouthClip: `phSleepMouth${uid}`,
    glow: `phGlow${uid}`,
  };
}

/** Z float: rises 50 units and fades in/out over one cycle, offset by `phase`. */
function zFloat(t: number, phase: number) {
  'worklet';
  const p = (t + phase) % 1;
  return { translateY: -p * 50, translateX: p * 14, opacity: Math.sin(p * Math.PI) };
}

function Eye({
  eye,
  state,
  side,
  mood,
  pupilProps,
}: {
  eye: (typeof EYES)[number];
  state: PhireState;
  side: 'left' | 'right';
  mood: PhireMood;
  /** Animated sideways glance applied to the pupil + highlight. */
  pupilProps: ComponentProps<typeof AnimatedG>['animatedProps'];
}) {
  // Idea: eyes roll up toward the lightbulb. Working: glance down-left at the laptop.
  // Sad: pupils sink under the heavy lids.
  const look =
    mood === 'idea'
      ? { x: 9, y: -14 }
      : state === 'working'
        ? { x: -7, y: 8 }
        : state === 'sad'
          ? { x: 0, y: 8 }
          : { x: 0, y: 0 };
  const px = eye.px + look.x;
  const py = eye.py + look.y;
  return (
    <>
      <Circle cx={eye.cx} cy={eye.cy} r={EYE_R} fill="#FFFEFF" />
      <AnimatedG animatedProps={pupilProps}>
        <Circle cx={px} cy={py} r={PUPIL_R} fill={INK} />
        <Circle cx={px - 9} cy={py - 11} r={9} fill="#FFFFFF" />
      </AnimatedG>
      {state === 'sad' && (
        // Heavy upper lid with a dark lash line
        <>
          <Path
            d={`M${eye.cx - 58} ${eye.cy - 4} A58 58 0 0 1 ${eye.cx + 58} ${eye.cy - 4} Z`}
            fill={side === 'left' ? '#F6A62A' : '#F5A02A'}
          />
          <Path
            d={`M${eye.cx - 54} ${eye.cy - 4} Q${eye.cx} ${eye.cy + 6} ${eye.cx + 54} ${eye.cy - 4}`}
            stroke={INK}
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
    </>
  );
}

function Mouth({ state, ids, mood }: { state: PhireState; ids: SvgIds; mood: PhireMood }) {
  // The current line's expression wins over the state's usual mouth.
  if (mood === 'tongue') {
    // Open cheeky smile with the tongue poking out over the bottom lip.
    return (
      <>
        <Path d={MOUTH} fill="#D74035" />
        <Path d={TONGUE} fill="#EC6434" clipPath={`url(#${ids.mouthClip})`} />
        <Path d={TONGUE_OUT} fill="#F2697A" />
        <Path d="M504 680 L504 722" stroke="#C8434F" strokeWidth={7} strokeLinecap="round" />
      </>
    );
  }
  if (mood === 'blush') {
    return <Path d={SHY_SMILE} stroke="#D74035" strokeWidth={11} strokeLinecap="round" fill="none" />;
  }
  if (mood === 'idea' && state !== 'sad' && state !== 'sleep') {
    // Small open "aha!" smile.
    return (
      <G transform={WORK_MOUTH_T}>
        <Path d={MOUTH} fill="#D74035" />
        <Path d={TONGUE} fill="#EC6434" clipPath={`url(#${ids.mouthClip})`} />
      </G>
    );
  }
  if (mood === 'stars') {
    // Big open grin.
    return (
      <>
        <Path d={MOUTH} fill="#D74035" />
        <Path d={TONGUE} fill="#EC6434" clipPath={`url(#${ids.mouthClip})`} />
        <Path d={FANG} fill="#FFFFFF" clipPath={`url(#${ids.mouthClip})`} />
      </>
    );
  }
  switch (state) {
    case 'default':
      return <Path d={SMILE} stroke="#D74035" strokeWidth={11} strokeLinecap="round" fill="none" />;
    case 'wave':
      return (
        <>
          <Path d={MOUTH} fill="#D74035" />
          <Path d={TONGUE} fill="#EC6434" clipPath={`url(#${ids.mouthClip})`} />
          <Path d={FANG} fill="#FFFFFF" clipPath={`url(#${ids.mouthClip})`} />
        </>
      );
    case 'working':
      return (
        <G transform={WORK_MOUTH_T}>
          <Path d={MOUTH} fill="#D74035" />
          <Path d={TONGUE} fill="#EC6434" clipPath={`url(#${ids.mouthClip})`} />
          <Path d={FANG} fill="#FFFFFF" clipPath={`url(#${ids.mouthClip})`} />
        </G>
      );
    case 'sad':
      return <Path d={FROWN_SAD} stroke={INK} strokeWidth={10} strokeLinecap="round" fill="none" />;
    case 'sport':
      return <Path d={FROWN_SPORT} stroke={INK} strokeWidth={11} strokeLinecap="round" fill="none" />;
    case 'sleep':
      return (
        <>
          <Path d={SLEEP_MOUTH} fill="#D74035" />
          <Path d={SLEEP_TONGUE} fill="#EC6434" clipPath={`url(#${ids.sleepMouthClip})`} />
        </>
      );
  }
}

function Glasses(): ReactNode {
  const [l, r] = EYES;
  return (
    <G stroke="#2E2622" strokeWidth={12} fill="none" strokeLinecap="round">
      <Circle cx={l.cx} cy={l.cy} r={66} fill="#FFFFFF" fillOpacity={0.12} />
      <Circle cx={r.cx} cy={r.cy} r={66} fill="#FFFFFF" fillOpacity={0.12} />
      <Path d={`M${l.cx + 66} ${l.cy - 8} Q500 ${l.cy - 34} ${r.cx - 66} ${r.cy - 4}`} />
      <Path d={`M${r.cx + 66} ${r.cy - 6} C760 590 792 596 798 618`} />
    </G>
  );
}

const styles = StyleSheet.create({
  // Tilt, bounce and breathe from near the base.
  origin: { transformOrigin: '50% 85%' },
  stars: { position: 'absolute' },
  bubble: {
    position: 'absolute',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    alignItems: 'center',
    ...shadows.md,
  },
  bubbleText: { ...typography.bodyStrong, textAlign: 'center' },
  tipLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  tipText: { ...typography.label, color: colors.fireStart },
  // A rotated square peeking out under the bubble = the tail.
  bubbleTail: {
    position: 'absolute',
    bottom: -7,
    width: 16,
    height: 16,
    backgroundColor: colors.surface,
    transform: [{ rotate: '45deg' }],
  },
  fill: { width: '100%', height: '100%' },
});
