import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import Phire from '../components/Phire';
import PrimaryButton from '../components/PrimaryButton';
import BottomSheet from '../components/BottomSheet';
import SessionPath from '../components/SessionPath';
import PressableScale from '../components/PressableScale';
import ScreenEnter from '../components/ScreenEnter';
import { FlameIcon } from '../components/icons';
import MinutePicker from '../components/MinutePicker';
import { LEVEL_GLOW, getLevel } from '../lib/levels';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore, type Settings } from '../store/useAppStore';
import { colors, radii, shadows, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type Duration = Settings['defaultDuration'];

const DURATIONS: Duration[] = [15, 25, 45, 90];
const FADE_MS = 200;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const skills = useAppStore((s) => s.skills);
  const activeSkillId = useAppStore((s) => s.activeSkillId);
  const sessions = useAppStore((s) => s.sessions);
  const defaultDuration = useAppStore((s) => s.settings.defaultDuration);

  const activeSkill = skills.find((s) => s.id === activeSkillId) ?? skills[0];
  const completed = useMemo(
    () =>
      sessions
        .filter((s) => s.skillId === activeSkill?.id && s.completed)
        .sort((a, b) => a.startedAt - b.startedAt),
    [sessions, activeSkill?.id],
  );

  const customDuration = useAppStore((s) => s.settings.customDuration);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [sheetOpen, setSheetOpen] = useState(false);
  // A preset (15/25/45/90) or "custom" with exact minutes from the picker.
  const [preset, setPreset] = useState<Duration | 'custom'>(defaultDuration);
  const [custom, setCustom] = useState(customDuration);
  const duration = preset === 'custom' ? custom : preset;

  // ─── Skill switch (from the header's skill switcher): new skill's content fades/slides in ───
  const fade = useSharedValue(1);
  const firstSkill = useRef(activeSkill?.id);
  useEffect(() => {
    if (activeSkill?.id === firstSkill.current) return;
    firstSkill.current = activeSkill?.id;
    fade.value = 0;
    fade.value = withTiming(1, { duration: FADE_MS * 2 });
  }, [activeSkill?.id, fade]);
  const contentStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: (1 - fade.value) * 12 }],
  }));

  // Each skill's content starts at the top, with Phire in view.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeSkill?.id]);

  const begin = () => {
    if (!activeSkill) return;
    // Remember the exact length for next time.
    if (preset === 'custom') updateSettings({ customDuration: custom });
    setSheetOpen(false);
    navigation.navigate('FocusSession', { duration, skillId: activeSkill.id });
  };

  if (!activeSkill) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={typography.body}>No skills yet.</Text>
      </SafeAreaView>
    );
  }

  return (
    // The navigation header (HomeHeader) covers the top inset; this screen handles the bottom itself.
    <SafeAreaView style={styles.container} edges={[]}>
      <ScreenEnter>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={contentStyle}>
            <View style={styles.hero}>
              {/* Chats on his own only while Home is on screen (it stays mounted under other screens). */}
              {/* His glow shows the skill's level: orange → blue → purple → gold. */}
              <Phire
                size={180}
                state="default"
                interactive
                chatty={isFocused && !sheetOpen ? 'home' : undefined}
                glowColors={LEVEL_GLOW[getLevel(activeSkill.totalMinutes)]}
              />
            </View>

            {completed.length === 0 && (
              <View style={styles.emptyCard}>
                <View style={[styles.emptyIcon, { backgroundColor: activeSkill.color }]}>
                  <FlameIcon size={20} />
                </View>
                <Text style={[typography.body, styles.flex]}>
                  You haven't focused yet. Start your first session — Phire is waiting.
                </Text>
              </View>
            )}

            <SessionPath
              color={activeSkill.color}
              completed={completed}
              totalMinutes={activeSkill.totalMinutes}
              onStart={() => setSheetOpen(true)}
            />
          </Animated.View>
        </ScrollView>

        {/* Floating start button over a soft fade */}
        <View style={[styles.floating, { paddingBottom: insets.bottom + spacing.md }]} pointerEvents="box-none">
          <LinearGradient
            colors={[`${colors.background}00`, colors.background]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <PrimaryButton label="Start focus" onPress={() => setSheetOpen(true)} />
        </View>
      </ScreenEnter>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text style={typography.h2}>How long will you focus?</Text>
        <Text style={[typography.caption, styles.sheetSub]}>{activeSkill.name}</Text>
        <View style={styles.durations}>
          {DURATIONS.map((d) => {
            const selected = d === preset;
            return (
              <PressableScale
                key={d}
                onPress={() => setPreset(d)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={[styles.durationCard, selected && styles.durationSelected]}
              >
                <Text style={[typography.numberL, selected && styles.durationTextSelected]}>{d}</Text>
                <Text style={[typography.caption, selected && styles.durationTextSelected]}>min</Text>
              </PressableScale>
            );
          })}
          {/* Custom: any exact number of minutes */}
          <PressableScale
            onPress={() => setPreset('custom')}
            accessibilityRole="radio"
            accessibilityState={{ checked: preset === 'custom' }}
            accessibilityLabel="Custom length"
            style={[styles.durationCard, preset === 'custom' && styles.durationSelected]}
          >
            <Ionicons name="options-outline" size={26} color={preset === 'custom' ? colors.fireStart : colors.text} />
            <Text style={[typography.caption, preset === 'custom' && styles.durationTextSelected]}>Custom</Text>
          </PressableScale>
        </View>
        {preset === 'custom' && (
          <View style={styles.custom}>
            <MinutePicker value={custom} onChange={setCustom} />
          </View>
        )}
        <PrimaryButton label={`Begin · ${duration} min`} onPress={begin} />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg },
  // Extra room on top for Phire's speech bubble.
  hero: { alignItems: 'center', paddingTop: spacing.xxl + spacing.md, paddingBottom: spacing.xl },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floating: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sheetSub: { marginTop: spacing.xxs, marginBottom: spacing.lg },
  durations: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  custom: { marginTop: -spacing.xs, marginBottom: spacing.lg },
  durationCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  durationSelected: { borderColor: colors.fireStart, backgroundColor: '#FFEDE3' },
  durationTextSelected: { color: colors.fireStart },
});
