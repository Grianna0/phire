import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Phire from '../components/Phire';
import MiniFlame from '../components/MiniFlame';
import PrimaryButton from '../components/PrimaryButton';
import PressableScale from '../components/PressableScale';
import { useAppStore } from '../store/useAppStore';
import {
  colors,
  radii,
  shadows,
  skillColors,
  spacing,
  typography,
  type SkillPresetName,
} from '../theme';

const STEP_COUNT = 3;
const fadeUp = (delay = 0) => FadeInUp.duration(500).delay(delay);

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => Math.min(s + 1, STEP_COUNT - 1));

  return (
    <SafeAreaView style={styles.container}>
      <StepDots step={step} />
      <View style={styles.stage}>
        {/* Keyed per step so each one slides in from the right as the previous slides out left. */}
        {step === 0 && (
          <Animated.View key="meet" entering={FadeIn.duration(300)} exiting={SlideOutLeft} style={styles.step}>
            <MeetPhireStep onContinue={next} />
          </Animated.View>
        )}
        {step === 1 && (
          <Animated.View key="habit" entering={SlideInRight} exiting={SlideOutLeft} style={styles.step}>
            <HabitStep onContinue={next} />
          </Animated.View>
        )}
        {step === 2 && (
          <Animated.View key="skill" entering={SlideInRight} style={styles.step}>
            <PickSkillStep />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Step ${step + 1} of ${STEP_COUNT}`}>
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
      ))}
    </View>
  );
}

/** Scrollable body with the primary action pinned to the bottom. */
function StepLayout({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      <View style={styles.footer}>{footer}</View>
    </View>
  );
}

// ─── Step 1: Meet Phire ──────────────────────────────────────────────────────

function MeetPhireStep({ onContinue }: { onContinue: () => void }) {
  return (
    <StepLayout footer={<PrimaryButton label="Continue" onPress={onContinue} />}>
      <View style={styles.centered}>
        <Animated.View entering={fadeUp(100)} style={styles.hero}>
          <Phire size={220} state="default" interactive chatty="onboarding" />
        </Animated.View>
        <Animated.Text entering={fadeUp(250)} style={[typography.h1, styles.center]}>
          Your focus, turned into something alive
        </Animated.Text>
        <Animated.Text entering={fadeUp(400)} style={[typography.body, styles.muted, styles.center]}>
          Meet Phire — a little fire that grows while you focus, and dims when you drift. No punishment. Just warmth.
        </Animated.Text>
      </View>
    </StepLayout>
  );
}

// ─── Step 2: The power of habit ──────────────────────────────────────────────

const HABIT_CARDS = [
  { stage: 1, text: '20 min / day → 10 hours / month' },
  { stage: 2, text: '10 hours = a real start on any skill' },
  { stage: 3, text: 'One year = 120 hours of deep focus' },
] as const;

function HabitStep({ onContinue }: { onContinue: () => void }) {
  return (
    <StepLayout footer={<PrimaryButton label="Continue" onPress={onContinue} />}>
      <Animated.Text entering={fadeUp(100)} style={[typography.h1, styles.headline]}>
        20 minutes a day changes everything
      </Animated.Text>
      <View style={styles.cardList}>
        {HABIT_CARDS.map((card, i) => (
          <Animated.View key={card.stage} entering={fadeUp(300 + i * 150)} style={styles.habitCard}>
            <View style={styles.flameBadge}>
              <MiniFlame stage={card.stage} size={48} />
            </View>
            <Text style={[typography.bodyStrong, styles.flex]}>{card.text}</Text>
          </Animated.View>
        ))}
      </View>
    </StepLayout>
  );
}

// ─── Step 3: Pick your first skill ───────────────────────────────────────────

const SKILL_PRESETS: { name: SkillPresetName; emoji: string }[] = [
  { name: 'Design', emoji: '🎨' },
  { name: 'Writing', emoji: '✍️' },
  { name: 'Coding', emoji: '💻' },
  { name: 'Reading', emoji: '📚' },
  { name: 'Music', emoji: '🎵' },
];

function PickSkillStep() {
  const [selected, setSelected] = useState<SkillPresetName | null>(null);
  const addSkill = useAppStore((s) => s.addSkill);
  const setActiveSkill = useAppStore((s) => s.setActiveSkill);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  // Finishing onboarding swaps the root navigator to Home (see App.tsx).
  const start = () => {
    if (!selected) return;
    // Re-running onboarding (dev tools) with a skill you already have selects it, no duplicate.
    const existing = useAppStore.getState().skills.find((s) => s.name === selected);
    const skill = existing ?? addSkill(selected, skillColors[selected]);
    setActiveSkill(skill.id);
    completeOnboarding();
  };

  return (
    <StepLayout
      footer={
        <PrimaryButton
          label={selected ? `Start with ${selected}` : 'Pick a skill to start'}
          onPress={start}
          disabled={!selected}
        />
      }
    >
      <Animated.Text entering={fadeUp(100)} style={[typography.h1, styles.headline]}>
        What are you growing?
      </Animated.Text>
      <View style={styles.cardList}>
        {SKILL_PRESETS.map((skill, i) => (
          <Animated.View key={skill.name} entering={fadeUp(200 + i * 80)}>
            <SkillCard
              name={skill.name}
              emoji={skill.emoji}
              selected={selected === skill.name}
              onPress={() => setSelected(skill.name)}
            />
          </Animated.View>
        ))}
      </View>
    </StepLayout>
  );
}

type SkillCardProps = { name: SkillPresetName; emoji: string; selected: boolean; onPress: () => void };

function SkillCard({ name, emoji, selected, onPress }: SkillCardProps) {
  const accent = skillColors[name];
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(selected ? 1.02 : 1, { duration: 180 });
  }, [selected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <PressableScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }}>
      <Animated.View
        style={[
          styles.skillCard,
          selected && { borderColor: accent, backgroundColor: `${accent}12` },
          animatedStyle,
        ]}
      >
        <View style={[styles.skillIcon, { backgroundColor: `${accent}26` }]}>
          <Text style={typography.emoji}>{emoji}</Text>
        </View>
        <Text style={[typography.h3, styles.flex]}>{name}</Text>
        <View style={[styles.radio, selected && { borderColor: accent }]}>
          {selected && <View style={[styles.radioDot, { backgroundColor: accent }]} />}
        </View>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  stage: { flex: 1, overflow: 'hidden' },
  step: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.md },
  dot: { width: 8, height: 8, borderRadius: radii.full, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.fireStart },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  hero: { marginBottom: spacing.lg },
  center: { textAlign: 'center' },
  muted: { color: colors.mutedText },
  headline: { marginBottom: spacing.xl },
  cardList: { gap: spacing.md },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  flameBadge: {
    width: 64,
    height: 64,
    borderRadius: radii.card,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  skillIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: radii.full },
});
