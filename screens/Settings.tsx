import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import PressableScale from '../components/PressableScale';
import ScreenEnter from '../components/ScreenEnter';
import { useAppStore, type Settings } from '../store/useAppStore';
import { confirm, haptic, impact } from '../lib/feedback';
import { colors, radii, shadows, spacing, typography } from '../theme';

const DURATIONS: Settings['defaultDuration'][] = [15, 25, 45, 90];
const REMINDER_TIMES = ['07:00', '09:00', '12:00', '18:00', '21:00'];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const resetData = useAppStore((s) => s.resetData);

  const reset = async () => {
    const ok = await confirm(
      'Reset all data?',
      'This deletes your skills, sessions and streak, and takes you back to the start. It can’t be undone.',
      'Reset',
    );
    if (!ok) return;
    haptic('warning');
    // Root navigator switches to Onboarding once `onboarded` is false.
    resetData();
  };

  const setHapticsOn = (value: boolean) => {
    updateSettings({ hapticsOn: value });
    if (value) impact('light');
  };

  return (
    <ScreenEnter style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="FOCUS">
          <Row label="Default duration" stacked>
            <Segmented
              options={DURATIONS}
              value={settings.defaultDuration}
              format={(d) => `${d}m`}
              onChange={(d) => updateSettings({ defaultDuration: d })}
            />
          </Row>
          <Row label="Daily reminder" stacked last>
            <View style={styles.chips}>
              {REMINDER_TIMES.map((t) => {
                const selected = t === settings.reminderTime;
                return (
                  <PressableScale
                    key={t}
                    onPress={() => updateSettings({ reminderTime: t })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[typography.number, selected && styles.chipTextSelected]}>{t}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </Row>
        </Section>

        <Section title="FEEL">
          <Row label="Haptics" last>
            <ThemedSwitch value={settings.hapticsOn} onValueChange={setHapticsOn} />
          </Row>
        </Section>
        <Text style={[typography.caption, styles.note]}>Audio controls are available in the top header.</Text>

        <Section title="DATA">
          <PressableScale onPress={reset} accessibilityRole="button" style={styles.row}>
            <Text style={[typography.bodyStrong, styles.danger]}>Reset all data</Text>
          </PressableScale>
        </Section>

        {/* DEV ONLY: hidden in release builds. */}
        {__DEV__ && (
          <Section title="DEVELOPER">
            <PressableScale
              onPress={() => navigation.navigate('DevTools')}
              accessibilityRole="button"
              style={styles.row}
            >
              <Text style={typography.bodyStrong}>Developer tools</Text>
              <Text style={[typography.bodyStrong, styles.muted]}>›</Text>
            </PressableScale>
          </Section>
        )}

        <Section title="ABOUT">
          <Row label="Version">
            <Text style={[typography.number, styles.muted]}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </Row>
          <Row label="Made as a portfolio concept" last />
        </Section>
      </ScrollView>
    </ScreenEnter>
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

function Row({
  label,
  children,
  stacked = false,
  last = false,
}: {
  label: string;
  children?: ReactNode;
  stacked?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, stacked && styles.rowStacked, !last && styles.rowDivider]}>
      <Text style={typography.bodyStrong}>{label}</Text>
      {children}
    </View>
  );
}

function ThemedSwitch(props: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Switch
      {...props}
      trackColor={{ false: colors.border, true: colors.fireStart }}
      thumbColor={colors.surface}
      ios_backgroundColor={colors.border}
      // react-native-web colors the "on" thumb separately (defaults to teal).
      {...(Platform.OS === 'web' ? { activeThumbColor: colors.surface } : null)}
    />
  );
}

function Segmented<T extends number>({
  options,
  value,
  onChange,
  format,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o === value;
        return (
          <PressableScale
            key={o}
            onPress={() => onChange(o)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[typography.number, selected ? styles.segmentTextSelected : styles.muted]}>{format(o)}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.lg },
  // Sits just under the FEEL card, inside its section spacing.
  note: { marginTop: -spacing.md, marginBottom: spacing.lg, marginLeft: spacing.xxs },
  sectionTitle: { marginBottom: spacing.xs, marginLeft: spacing.xxs },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, ...shadows.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowStacked: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  muted: { color: colors.mutedText },
  danger: { color: colors.danger },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.full,
    padding: spacing.xxs,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs, borderRadius: radii.full },
  segmentSelected: { backgroundColor: colors.surface, ...shadows.sm },
  segmentTextSelected: { color: colors.fireStart, fontFamily: typography.number.fontFamily },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.fireStart, borderColor: colors.fireStart },
  chipTextSelected: { color: colors.textOnFire },
});
