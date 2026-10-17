// DEV ONLY: one place to test the app freely — every Phire state and expression, every result
// screen, onboarding, and realistic sample data (with a one-tap restore of your own data).
// Reachable from Settings → Developer, which only exists in development builds.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import Phire, { type PhireHandle, type PhireState } from '../components/Phire';
import PressableScale from '../components/PressableScale';
import { useAppStore } from '../store/useAppStore';
import { hasBackup, loadSampleData, restoreBackup } from '../lib/devTools';
import type { PhireMood } from '../lib/phireLines';
import { colors, radii, shadows, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DevTools'>;

const STATES: PhireState[] = ['default', 'wave', 'sad', 'sleep', 'working', 'sport'];
const MOODS: { mood?: PhireMood; label: string }[] = [
  { label: 'Any line' },
  { mood: 'tongue', label: 'Tongue' },
  { mood: 'blush', label: 'Blush' },
  { mood: 'stars', label: 'Stars' },
  { mood: 'idea', label: 'Tip' },
];

export default function DevToolsScreen({ navigation }: Props) {
  const phire = useRef<PhireHandle>(null);
  const [state, setState] = useState<PhireState>('default');
  const activeSkillId = useAppStore((s) => s.activeSkillId);
  const restartOnboarding = useAppStore((s) => s.restartOnboarding);
  const [backup, setBackup] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refreshBackup = useCallback(() => {
    hasBackup().then(setBackup).catch(() => setBackup(false));
  }, []);
  useEffect(refreshBackup, [refreshBackup]);

  const demo = (kind: 'success' | 'levelup' | 'fail') =>
    navigation.navigate('SessionComplete', { sessionId: 'demo', success: kind !== 'fail', duration: 25, demo: kind });

  const sample = async () => {
    await loadSampleData();
    refreshBackup();
    setNote('Sample data loaded: 3 skills, ~3 weeks of sessions, a 5-day streak. Design is 15 min from a level-up.');
  };
  const restore = async () => {
    const ok = await restoreBackup();
    refreshBackup();
    setNote(ok ? 'Your own data is back.' : 'No backup to restore.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[typography.caption, styles.intro]}>
        Only in development builds. Nothing here changes your data unless it says so.
      </Text>

      {/* ── Phire playground ── */}
      <Section title="PHIRE">
        <View style={styles.stage}>
          <Phire ref={phire} state={state} size={170} interactive />
        </View>
        <Label>State</Label>
        <Chips>
          {STATES.map((s) => (
            <Chip key={s} label={s} selected={s === state} onPress={() => setState(s)} />
          ))}
        </Chips>
        <Label>Say a line (with its face)</Label>
        <Chips>
          {MOODS.map((m) => (
            <Chip key={m.label} label={m.label} onPress={() => phire.current?.say(m.mood)} />
          ))}
        </Chips>
        <Label>Effects</Label>
        <Chips>
          <Chip label="Star burst" onPress={() => phire.current?.burst(false)} />
          <Chip label="Big burst (level-up)" onPress={() => phire.current?.burst(true)} />
        </Chips>
      </Section>

      {/* ── Screens ── */}
      <Section title="SCREENS">
        <Chips>
          <Chip label="Session success" onPress={() => demo('success')} />
          <Chip label="Level up" onPress={() => demo('levelup')} />
          <Chip label="Stopped early" onPress={() => demo('fail')} />
          <Chip
            label="1-minute focus session"
            disabled={!activeSkillId}
            onPress={() => navigation.navigate('FocusSession', { duration: 1, skillId: activeSkillId })}
          />
          <Chip label="Stats" onPress={() => navigation.navigate('Stats')} />
        </Chips>
        <Text style={typography.caption}>
          Result screens are demos (nothing saved). The 1-minute session is real and adds 1 min if you finish it.
        </Text>
      </Section>

      {/* ── Onboarding ── */}
      <Section title="ONBOARDING">
        <Chips>
          <Chip label="Restart onboarding" onPress={restartOnboarding} />
        </Chips>
        <Text style={typography.caption}>
          Shows the intro again. Your skills and sessions stay; picking a skill you already have just selects it.
        </Text>
      </Section>

      {/* ── Data ── */}
      <Section title="DATA">
        <Chips>
          <Chip label="Load sample data" onPress={sample} />
          <Chip label="Restore my data" disabled={!backup} onPress={restore} />
        </Chips>
        <Text style={typography.caption}>
          {backup
            ? 'Your real data is backed up. Restore it any time.'
            : 'Loading sample data backs up your real data first.'}
        </Text>
        {note && <Text style={[typography.bodyStrong, styles.note]}>{note}</Text>}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[typography.label, styles.sectionTitle]}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <Text style={[typography.caption, styles.label]}>{children}</Text>;
}

function Chips({ children }: { children: ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

function Chip({
  label,
  onPress,
  selected = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
    >
      <Text style={[typography.bodyStrong, selected && styles.chipTextSelected]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  intro: { marginBottom: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionTitle: { marginBottom: spacing.xs, marginLeft: spacing.xxs },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.md, gap: spacing.sm, ...shadows.sm },
  // Room above for the speech bubble.
  stage: { alignItems: 'center', paddingTop: spacing.xxl + spacing.md, paddingBottom: spacing.sm },
  label: { marginTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: { backgroundColor: colors.fireStart, borderColor: colors.fireStart },
  chipTextSelected: { color: colors.textOnFire },
  chipDisabled: { opacity: 0.4 },
  note: { color: colors.fireStart },
});
