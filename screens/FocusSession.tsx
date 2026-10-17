import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import type { RootStackParamList } from '../navigation/types';
import Phire, { type PhireState } from '../components/Phire';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { useAppStore } from '../store/useAppStore';
import ScreenEnter from '../components/ScreenEnter';
import { haptic, impact } from '../lib/feedback';
import { preloadSoundEffects } from '../lib/sounds';
import { colors, radii, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FocusSession'>;

const RING_R = 128;
const RING_STROKE = 6;
const RING_BOX = (RING_R + RING_STROKE) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;
const PHIRE_SIZE = 200;
/** Time away (backgrounded) that counts as a distraction. */
const DISTRACTION_MS = 15_000;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const formatClock = (totalSec: number) => {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function FocusSessionScreen({ route, navigation }: Props) {
  const { duration, skillId } = route.params;
  const insets = useSafeAreaInsets();
  const skillName = useAppStore((s) => s.skills.find((sk) => sk.id === skillId)?.name ?? 'your skill');
  const startSession = useAppStore((s) => s.startSession);
  const completeSession = useAppStore((s) => s.completeSession);
  const abandonSession = useAppStore((s) => s.abandonSession);
  const incrementDistraction = useAppStore((s) => s.incrementDistraction);

  const totalSec = duration * 60;
  const sessionId = useRef<string | null>(null);
  const endsAt = useRef(0);
  const [remainingSec, setRemainingSec] = useState(totalSec);
  const [phase, setPhase] = useState<'running' | 'success' | 'fail'>('running');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [distracted, setDistracted] = useState(false);

  const elapsedSec = totalSec - remainingSec;
  const progress = elapsedSec / totalSec;
  const elapsedMin = Math.floor(elapsedSec / 60);
  const remainingMin = Math.ceil(remainingSec / 60);
  // Focusing → at the laptop; done → happy wave; gave up → sad.
  const phireState: PhireState = phase === 'running' ? 'working' : phase === 'success' ? 'wave' : 'sad';

  // Start the session once.
  useEffect(() => {
    if (sessionId.current) return;
    sessionId.current = startSession(skillId, duration);
    endsAt.current = Date.now() + totalSec * 1000;
    impact('medium');
    preloadSoundEffects();
  }, [duration, skillId, startSession, totalSec]);

  // If the screen goes away mid-session (shouldn't normally happen), record it as abandoned.
  useEffect(
    () => () => {
      if (phaseRef.current === 'running' && sessionId.current) abandonSession(sessionId.current);
    },
    [abandonSession],
  );

  // Countdown from a fixed end time, so it stays correct across backgrounding.
  const tick = useCallback(() => {
    setRemainingSec(Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000)));
  }, []);
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, tick]);

  /** `creditMinutes` overrides the minutes counted (used by the dev "Finish now" button). */
  const finish = useCallback(
    (success: boolean, creditMinutes?: number) => {
      const id = sessionId.current;
      if (!id || phaseRef.current !== 'running') return;
      phaseRef.current = success ? 'success' : 'fail';
      setPhase(phaseRef.current);
      setDistracted(false);
      setConfirming(false);
      if (success) {
        completeSession(id, creditMinutes);
        haptic('success');
      } else {
        abandonSession(id);
        // Gentle tap, not an error buzz: stopping is okay.
        impact('light');
      }
      // Let Phire's star burst / sad droop play before moving on.
      setTimeout(
        () => navigation.replace('SessionComplete', { sessionId: id, success, duration }),
        success ? 1800 : 1000,
      );
    },
    [abandonSession, completeSession, duration, navigation],
  );

  // DEV ONLY: finish immediately so the success animation can be tested without waiting.
  // Credits only the minutes actually spent, so testing doesn't inflate your stats.
  const finishNow = useCallback(() => {
    const spent = Math.floor((Date.now() - (endsAt.current - totalSec * 1000)) / 60000);
    finish(true, spent);
  }, [finish, totalSec]);

  useEffect(() => {
    if (remainingSec === 0) finish(true);
  }, [remainingSec, finish]);

  // "Give up" opens an in-app sheet (not the system Alert, which didn't respond on Android) that
  // nudges to keep going but makes stopping one clear tap away.
  const [confirming, setConfirming] = useState(false);
  const confirmingRef = useRef(false);
  confirmingRef.current = confirming;
  const giveUp = useCallback(() => {
    if (phaseRef.current === 'running') setConfirming(true);
  }, []);
  const keepGoing = useCallback(() => {
    impact('light');
    setConfirming(false);
  }, []);
  const endSession = useCallback(() => {
    setConfirming(false);
    finish(false);
  }, [finish]);

  // Android back button: asks to give up instead of leaving (and is swallowed during the short
  // success/fail hand-off). A BackHandler is used rather than usePreventRemove: the latter could
  // still be active when we replace this screen after "Give up", which blocked the navigation
  // and re-opened the dialog. Swipe-back is disabled for this screen in App.tsx.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // Back toggles the sheet: opens it while focusing, closes it (= keep going) if it's open.
      if (confirmingRef.current) setConfirming(false);
      else giveUp();
      return true;
    });
    return () => sub.remove();
  }, [giveUp]);

  // Coming back after more than 15s away counts as a distraction.
  useEffect(() => {
    let leftAt: number | null = null;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        leftAt ??= Date.now();
        return;
      }
      if (next !== 'active' || leftAt === null) return;
      const away = Date.now() - leftAt;
      leftAt = null;
      tick();
      const stillRunning = phaseRef.current === 'running' && endsAt.current > Date.now();
      if (away > DISTRACTION_MS && stillRunning && sessionId.current) {
        incrementDistraction(sessionId.current);
        setDistracted(true);
        haptic('warning');
      }
    });
    return () => sub.remove();
  }, [incrementDistraction, tick]);

  // Progress ring eases between the once-a-second updates.
  const ringProgress = useSharedValue(0);
  useEffect(() => {
    ringProgress.value = withTiming(progress, { duration: 1000, easing: Easing.linear });
  }, [progress, ringProgress]);
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - ringProgress.value),
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <StatusBar style="light" />

      <ScreenEnter style={styles.enter}>
        <Text style={styles.clock} accessibilityRole="timer" accessibilityLabel={`${formatClock(remainingSec)} remaining`}>
          {formatClock(remainingSec)}
        </Text>

        <View style={styles.stage}>
          {/* Warm glow */}
          <Svg width={RING_BOX * 1.6} height={RING_BOX * 1.6} style={styles.glow}>
            <Defs>
              <RadialGradient id="focusGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={colors.fireStart} stopOpacity={0.35} />
                <Stop offset="0.5" stopColor={colors.fireStart} stopOpacity={0.12} />
                <Stop offset="1" stopColor={colors.fireStart} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={RING_BOX * 0.8} cy={RING_BOX * 0.8} r={RING_BOX * 0.8} fill="url(#focusGlow)" />
          </Svg>

          {/* Progress ring, starting at 12 o'clock */}
          <Svg width={RING_BOX} height={RING_BOX} style={styles.ring}>
            <Defs>
              <LinearGradient id="ringStroke" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.fireStart} />
                <Stop offset="1" stopColor={colors.warmGlow} />
              </LinearGradient>
            </Defs>
            <Circle cx={RING_BOX / 2} cy={RING_BOX / 2} r={RING_R} stroke={colors.focusTrack} strokeWidth={RING_STROKE} fill="none" />
            <AnimatedCircle
              cx={RING_BOX / 2}
              cy={RING_BOX / 2}
              r={RING_R}
              stroke="url(#ringStroke)"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={CIRCUMFERENCE}
              animatedProps={ringProps}
              transform={`rotate(-90 ${RING_BOX / 2} ${RING_BOX / 2})`}
            />
          </Svg>

          {/* Nudge Phire up so its body (not its box) sits in the ring's center */}
          <View style={styles.phire}>
            {/* A rare word of encouragement while focusing (quiet when an overlay is up). */}
            <Phire
              size={PHIRE_SIZE}
              state={phireState}
              burst={phase === 'success' ? 'stars' : undefined}
              chatty={phase === 'running' && !distracted && !confirming ? 'focus' : undefined}
            />
          </View>
        </View>

        <Text style={styles.gain}>
          +{Math.floor(elapsedSec / 60)} min to {skillName}
        </Text>

        <View style={styles.footer}>
          {phase === 'running' && (
            <View style={styles.footerRow}>
              <SecondaryButton label="Give up" variant="ghost" onPress={giveUp} textStyle={styles.giveUp} />
              {/* DEV ONLY (hidden in release builds): test the success animation right away. */}
              {__DEV__ && (
                <SecondaryButton
                  label="Finish now (dev)"
                  variant="ghost"
                  onPress={finishNow}
                  style={styles.devButton}
                  textStyle={styles.devText}
                />
              )}
            </View>
          )}
        </View>
      </ScreenEnter>

      {distracted && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={[typography.h2, styles.overlayTitle]}>Phire got a bit dimmer…</Text>
            <Text style={[typography.body, styles.overlayBody]}>
              You stepped away for a while. The fire is still burning — let’s pick it back up.
            </Text>
            <PrimaryButton label="Keep going" onPress={() => setDistracted(false)} style={styles.overlayButton} />
          </View>
        </Animated.View>
      )}

      {/* Give-up sheet: encourage staying, but stopping is one clear tap away. */}
      {confirming && phase === 'running' && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.overlay}>
          <View style={styles.overlayCard}>
            <View style={styles.sheetPhire}>
              <Phire size={110} state="default" />
            </View>
            <Text style={[typography.h2, styles.overlayTitle]}>Keep the fire going?</Text>
            <Text style={[typography.body, styles.overlayBody]}>
              {elapsedMin >= 1
                ? `You've already focused ${elapsedMin} min — only ${remainingMin} min to go. Phire is burning bright for you.`
                : "Every session starts with a spark. Give it a few more minutes — Phire's got your back."}
            </Text>
            <PrimaryButton label="Keep going" onPress={keepGoing} style={styles.overlayButton} />
            <SecondaryButton
              label="End session for now"
              variant="ghost"
              onPress={endSession}
              textStyle={styles.endText}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.focusBackground, alignItems: 'center' },
  clock: { ...typography.timer, color: colors.focusText },
  enter: { width: '100%', alignItems: 'center' },
  stage: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  ring: { position: 'absolute' },
  phire: { transform: [{ translateY: -PHIRE_SIZE * 0.1 }] },
  gain: { ...typography.bodyStrong, color: colors.focusMuted, marginBottom: spacing.xl },
  footer: { minHeight: 56, justifyContent: 'center' },
  // Low-key but clearly tappable.
  giveUp: { color: 'rgba(246, 237, 228, 0.6)' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  devButton: { borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(246, 237, 228, 0.35)', minHeight: 44 },
  devText: { color: colors.warmGlow },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26, 20, 36, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  overlayCard: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: radii.sheet,
    backgroundColor: '#251D31',
    gap: spacing.sm,
  },
  overlayTitle: { color: colors.focusText, textAlign: 'center' },
  overlayBody: { color: colors.focusMuted, textAlign: 'center' },
  overlayButton: { marginTop: spacing.md },
  sheetPhire: { alignItems: 'center', marginBottom: spacing.xs },
  endText: { color: colors.focusMuted },
});
