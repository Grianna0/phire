import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import Phire from '../components/Phire';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import ScreenEnter from '../components/ScreenEnter';
import { useAppStore, type Session, type Skill } from '../store/useAppStore';
import { LEVELS, LEVEL_GLOW, getLevel, getLevelProgress } from '../lib/levels';
import { haptic, impact } from '../lib/feedback';
import { playSoundEffect } from '../lib/sounds';
import { colors, fireGradient, radii, shadows, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionComplete'>;

const formatHours = (minutes: number) => {
  const h = minutes / 60;
  return h < 10 ? `${Math.round(h * 10) / 10}h` : `${Math.floor(h)}h`;
};

// Dev tools previews: fake results so every outcome can be seen without saving anything.
const DEMO: Record<NonNullable<RootStackParamList['SessionComplete']['demo']>, { minutes: number; total: number }> = {
  success: { minutes: 25, total: 145 }, // stays at First Steps
  levelup: { minutes: 25, total: 610 }, // crosses 10h → Beginner
  fail: { minutes: 7, total: 145 },
};

export default function SessionCompleteScreen({ route, navigation }: Props) {
  const { sessionId, success, duration, demo } = route.params;
  const storedSession = useAppStore((s) => s.sessions.find((x) => x.id === sessionId));
  const storedSkill = useAppStore((s) => s.skills.find((k) => k.id === storedSession?.skillId));
  const activeSkillName = useAppStore((s) => s.skills.find((k) => k.id === s.activeSkillId)?.name ?? 'Music');
  const session: Pick<Session, 'durationMinutes'> | undefined = demo
    ? { durationMinutes: DEMO[demo].minutes }
    : storedSession;
  const skill: Pick<Skill, 'id' | 'name' | 'totalMinutes'> | undefined = demo
    ? { id: 'demo', name: activeSkillName, totalMinutes: DEMO[demo].total }
    : storedSkill;

  // Snapshot on arrival so later store changes don't re-trigger the celebration.
  const [result] = useState(() => {
    const gained = success && session ? session.durationMinutes : 0;
    const total = skill?.totalMinutes ?? 0;
    const level = getLevel(total);
    return { gained, total, level, leveledUp: success && getLevel(total - gained) !== level };
  });

  useEffect(() => {
    playSoundEffect(!success ? 'fail' : result.leveledUp ? 'levelup' : 'success');
    // Stopping early gets a soft tap, not a warning buzz.
    if (success) haptic('success');
    else impact('light');
  }, [success, result.leveledUp]);

  // In a demo preview both buttons just go back to Developer tools.
  const goHome = () => (demo ? navigation.goBack() : navigation.popTo('Home'));
  const again = () => {
    if (demo) return navigation.goBack();
    if (!skill) return goHome();
    navigation.replace('FocusSession', { duration, skillId: skill.id });
  };
  const demoTag = demo ? <Text style={[typography.caption, styles.demoTag]}>Demo preview · nothing was saved</Text> : null;

  // Session gone (e.g. data was reset): don't show an empty screen.
  if (!session || !skill) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenEnter style={styles.center}>
          <Phire size={160} state="default" interactive />
          <Text style={[typography.h2, styles.centerText]}>This session isn't around anymore</Text>
          <PrimaryButton label="Home" onPress={goHome} style={styles.selfStretch} />
        </ScreenEnter>
      </SafeAreaView>
    );
  }

  if (!success) {
    // Stopped early: no judgement. Count what was done and look forward to next time.
    const minutes = session.durationMinutes;
    return (
      <SafeAreaView style={[styles.container, styles.failBg]}>
        <ScreenEnter style={styles.center}>
          {demoTag}
          {/* A little low, but he speaks up with a kind word on his own. */}
          <Phire size={180} state="sad" interactive greet chatty="stopped" />
          <Animated.Text entering={FadeInUp.delay(300).duration(500)} style={[typography.h2, styles.centerText]}>
            That's okay.
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(450).duration(500)}
            style={[typography.body, styles.muted, styles.centerText]}
          >
            {minutes >= 1
              ? `You still showed up and focused for ${minutes} min — that counts. Every fire has quiet moments; next time will go great.`
              : 'Showing up is the first spark. Every fire has quiet moments; next time will go great.'}
          </Animated.Text>
        </ScreenEnter>
        <View style={styles.actions}>
          <PrimaryButton label="Try again" onPress={again} />
          <SecondaryButton label="Home" onPress={goHome} />
        </View>
      </SafeAreaView>
    );
  }

  const progress = getLevelProgress(result.total);
  const next = LEVELS[LEVELS.findIndex((l) => l.name === result.level) + 1];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenEnter>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {demoTag}
          <View style={styles.hero}>
            {/* Celebrating: happy wave + star burst (a bigger one for a level-up). */}
            <Phire
              size={180}
              state="wave"
              burst={result.leveledUp ? 'big' : 'stars'}
              interactive
              chatty="complete"
              glowColors={LEVEL_GLOW[result.level]}
            />
          </View>

          <CountUp to={result.gained} />

          {result.leveledUp && (
            <Animated.View entering={ZoomIn.delay(500).springify()} style={styles.bannerWrap}>
              <LinearGradient colors={fireGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
                <Text style={styles.bannerText}>Level up! You're now {result.level}</Text>
              </LinearGradient>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(700).duration(500)} style={styles.card}>
            <Text style={typography.bodyStrong}>
              You've now focused <Text style={styles.mono}>{formatHours(result.total)}</Text> on {skill?.name ?? 'this skill'}{' '}
              — Level: <Text style={{ color: colors.fireStart }}>{result.level}</Text>
            </Text>
            {next && (
              <>
                <View style={styles.track}>
                  <LinearGradient
                    colors={fireGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.fill, { width: `${Math.max(4, progress * 100)}%` }]}
                  />
                </View>
                <Text style={typography.caption}>
                  Next: {next.name} at {next.minHours}h
                </Text>
              </>
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.actions}>
          <PrimaryButton label="Home" onPress={goHome} />
          <SecondaryButton label="Start another" onPress={again} />
        </View>
      </ScreenEnter>
    </SafeAreaView>
  );
}

/** "+N min" counting up from 0; only this component re-renders while it counts. */
function CountUp({ to }: { to: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const DURATION = 1200;
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / DURATION);
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    const delay = setTimeout(() => (frame = requestAnimationFrame(step)), 300);
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(frame);
    };
  }, [to]);

  return (
    <Text style={styles.countUp} accessibilityLabel={`Plus ${to} minutes`}>
      +{value} <Text style={styles.countUnit}>min</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  failBg: { backgroundColor: colors.mutedBackground },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  hero: { paddingVertical: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  centerText: { textAlign: 'center' },
  demoTag: { textAlign: 'center', marginBottom: spacing.sm },
  selfStretch: { alignSelf: 'stretch', marginTop: spacing.lg },
  muted: { color: colors.mutedText },
  countUp: { ...typography.numberXL, color: colors.fireStart, marginTop: spacing.md },
  countUnit: { ...typography.numberL, color: colors.fireStart },
  bannerWrap: { alignSelf: 'stretch', marginTop: spacing.lg, borderRadius: radii.card, ...shadows.glow },
  banner: { borderRadius: radii.card, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center' },
  bannerText: { ...typography.h3, color: colors.textOnFire },
  card: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  mono: { fontFamily: typography.number.fontFamily },
  track: { height: 8, borderRadius: radii.full, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.full },
  actions: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm },
});
