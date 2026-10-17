import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import Phire from '../components/Phire';
import PrimaryButton from '../components/PrimaryButton';
import ScreenEnter from '../components/ScreenEnter';
import { FlameIcon, LockIcon } from '../components/icons';
import { getLiveStreak, useAppStore, type Session, type Skill } from '../store/useAppStore';
import { colors, radii, shadows, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>;

const MILESTONE_HOURS = [10, 50, 100];
const FORECAST_TARGETS = [10, 50, 100, 500];
const DAY_MS = 86_400_000;

const hours1 = (minutes: number) => `${(minutes / 60).toFixed(1)}h`;

export default function StatsScreen({ navigation }: Props) {
  const skills = useAppStore((s) => s.skills);
  const sessions = useAppStore((s) => s.sessions);
  const activeSkillId = useAppStore((s) => s.activeSkillId);
  const currentStreak = useAppStore((s) => s.currentStreak);
  const lastSessionDate = useAppStore((s) => s.lastSessionDate);

  const completed = useMemo(() => sessions.filter((s) => s.completed), [sessions]);
  const totalMinutes = skills.reduce((sum, s) => sum + s.totalMinutes, 0);
  const streak = getLiveStreak(lastSessionDate, currentStreak);
  const ranked = useMemo(() => [...skills].sort((a, b) => b.totalMinutes - a.totalMinutes), [skills]);
  const maxMinutes = Math.max(1, ranked[0]?.totalMinutes ?? 0);
  const forecastSkill = skills.find((s) => s.id === activeSkillId) ?? ranked[0];

  if (completed.length === 0) {
    return (
      <ScreenEnter style={[styles.container, styles.empty]}>
        <Phire size={140} state="sleep" interactive chatty="stats" />
        <Text style={[typography.h2, styles.center]}>No focus time yet</Text>
        <Text style={[typography.body, styles.muted, styles.center]}>
          Your hours, streak and milestones will glow here after your first session.
        </Text>
        <PrimaryButton label="Start focusing" onPress={() => navigation.popTo('Home')} style={styles.emptyButton} />
      </ScreenEnter>
    );
  }

  return (
    <ScreenEnter style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Headline number + streak */}
        <View style={styles.headline}>
          <Text style={[typography.numberXL, styles.total]}>{hours1(totalMinutes)}</Text>
          <Text style={typography.caption}>total focus across all skills</Text>
          <View style={[styles.streak, streak === 0 && styles.streakOff]}>
            <Text style={[typography.bodyStrong, streak > 0 && styles.streakText]}>
              🔥 {streak} day streak
            </Text>
          </View>
        </View>

        {/* Per-skill bars */}
        <Text style={[typography.label, styles.sectionTitle]}>BY SKILL</Text>
        <View style={styles.card}>
          {ranked.map((skill) => (
            <View key={skill.id} style={styles.barRow}>
              <View style={styles.barLabel}>
                <Text style={typography.bodyStrong}>{skill.name}</Text>
                <Text style={[typography.number, styles.muted]}>{hours1(skill.totalMinutes)}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: skill.color,
                      width: `${skill.totalMinutes === 0 ? 0 : Math.max(3, (skill.totalMinutes / maxMinutes) * 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Milestones: one row per skill, columns 10h / 50h / 100h */}
        <Text style={[typography.label, styles.sectionTitle]}>MILESTONES</Text>
        <View style={styles.card}>
          {ranked.map((skill, i) => (
            <View key={skill.id} style={[styles.badgeRow, i > 0 && styles.badgeRowDivider]}>
              <Text style={[typography.caption, styles.badgeSkill]} numberOfLines={1}>
                {skill.name}
              </Text>
              <View style={styles.badges}>
                {MILESTONE_HOURS.map((h) => (
                  <Badge key={h} hours={h} color={skill.color} unlocked={skill.totalMinutes >= h * 60} />
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Forecast */}
        {forecastSkill && <Forecast skill={forecastSkill} sessions={completed} />}
      </ScrollView>
    </ScreenEnter>
  );
}

function Badge({ hours, color, unlocked }: { hours: number; color: string; unlocked: boolean }) {
  return (
    <View style={styles.badge} accessibilityLabel={`${hours} hours ${unlocked ? 'unlocked' : 'locked'}`}>
      <View style={[styles.badgeCircle, unlocked ? { backgroundColor: color } : styles.badgeLocked]}>
        {unlocked ? <FlameIcon size={22} /> : <LockIcon size={16} />}
      </View>
      <Text style={[typography.number, !unlocked && styles.muted]}>{hours}h</Text>
    </View>
  );
}

function Forecast({ skill, sessions }: { skill: Skill; sessions: Session[] }) {
  const since = Date.now() - 14 * DAY_MS;
  const recentMinutes = sessions
    .filter((s) => s.skillId === skill.id && s.startedAt >= since)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const perDay = recentMinutes / 14;
  const target = FORECAST_TARGETS.find((h) => skill.totalMinutes < h * 60);

  let message: string;
  if (!target) {
    message = `You've passed 500h on ${skill.name}. Legendary — keep the fire going.`;
  } else if (perDay === 0) {
    message = `Focus on ${skill.name} a few times this week to see when you'll hit ${target}h.`;
  } else {
    const days = (target * 60 - skill.totalMinutes) / perDay;
    const eta = days < 7 ? `~${Math.max(1, Math.ceil(days))} days` : `~${Math.max(1, Math.round(days / 7))} weeks`;
    message = `At your current pace, you'll hit ${target}h of ${skill.name} in ${eta}.`;
  }

  return (
    <View style={[styles.card, styles.forecast]}>
      <Text style={typography.h3}>Forecast</Text>
      <Text style={[typography.body, styles.muted]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyButton: { alignSelf: 'stretch', marginTop: spacing.lg },
  center: { textAlign: 'center' },
  muted: { color: colors.mutedText },
  headline: { alignItems: 'center', gap: spacing.xxs, marginBottom: spacing.xl },
  total: { color: colors.fireStart },
  streak: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: '#FFEDE3',
  },
  streakOff: { backgroundColor: colors.locked },
  streakText: { color: colors.fireStart },
  sectionTitle: { marginBottom: spacing.xs, marginLeft: spacing.xxs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  barRow: { gap: spacing.xs },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 10, borderRadius: radii.full, backgroundColor: colors.locked, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.full },
  badgeRow: { gap: spacing.xs },
  badgeRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.md },
  badgeSkill: { marginLeft: spacing.xxs },
  badges: { flexDirection: 'row', justifyContent: 'space-around' },
  badge: { alignItems: 'center', gap: spacing.xxs },
  badgeCircle: { width: 56, height: 56, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  badgeLocked: { backgroundColor: colors.locked },
  forecast: { gap: spacing.xs },
});
