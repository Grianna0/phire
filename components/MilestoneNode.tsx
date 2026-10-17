// Level milestones on the path: a rounded diamond that's locked, in progress (pulsing) or reached.
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableScale from './PressableScale';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { formatHoursValue, type LevelName } from '../lib/levels';
import { colors, radii, shadows, spacing, typography } from '../theme';

export type MilestoneStatus = 'locked' | 'current' | 'completed';

export type Milestone = {
  level: LevelName;
  /** Hours of focus needed to reach this level. */
  hours: number;
  status: MilestoneStatus;
};

/** Outer box of the node (the diamond plus room for its pulse/glow). */
export const MILESTONE_SIZE = 88;
const DIAMOND = 58; // side of the square before it's turned 45° (≈ 82 corner to corner)
const LOCKED_BG = '#E4DCD3';
const LOCKED_ICON = '#A79F97';

const iconFor = (m: Milestone): keyof typeof Ionicons.glyphMap =>
  m.status === 'locked' ? 'lock-closed' : m.status === 'current' ? 'flag' : m.hours === 0 ? 'flame' : 'trophy';

/** The diamond itself (also used, larger and still, in the info sheet). */
function Badge({ milestone, color, scale = 1 }: { milestone: Milestone; color: string; scale?: number }) {
  const { status } = milestone;
  const d = DIAMOND * scale;
  const bg = status === 'locked' ? LOCKED_BG : color;
  return (
    <View style={{ width: MILESTONE_SIZE * scale, height: MILESTONE_SIZE * scale, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={[
          styles.diamond,
          status !== 'locked' && shadows.md,
          status === 'current' && { shadowColor: color, shadowOpacity: 0.55, shadowRadius: 14 },
          { width: d, height: d, borderRadius: 16 * scale, backgroundColor: bg },
          status === 'current' && { borderWidth: 3 * scale, borderColor: '#FFFFFF' },
        ]}
      />
      <Ionicons
        name={iconFor(milestone)}
        size={28 * scale}
        color={status === 'locked' ? LOCKED_ICON : '#FFFFFF'}
      />
      {status === 'completed' && (
        <View style={[styles.check, { borderColor: color, transform: [{ scale }] }]}>
          <Ionicons name="checkmark" size={13} color={color} />
        </View>
      )}
    </View>
  );
}

type NodeProps = { milestone: Milestone; color: string; onPress: () => void };

export default function MilestoneNode({ milestone, color, onPress }: NodeProps) {
  const { status, level, hours } = milestone;

  // In progress: the node breathes (1 → 1.05) with a soft halo in the skill colour.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (status !== 'current') return;
    pulse.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [status, pulse]);
  const nodeStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.05 }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + pulse.value * 0.22,
    transform: [{ scale: 1 + pulse.value * 0.12 }],
  }));

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${level} milestone, ${hours} hours. ${
        status === 'completed' ? 'Reached' : status === 'current' ? 'In progress' : 'Locked'
      }. Tap for details.`}
      style={styles.center}
    >
      <View>
        {status === 'current' && <Animated.View style={[styles.halo, { backgroundColor: color }, haloStyle]} />}
        <Animated.View style={[status === 'locked' && styles.dim, nodeStyle]}>
          <Badge milestone={milestone} color={color} />
        </Animated.View>
      </View>
      <View style={styles.label}>
        <Text
          style={[
            typography.bodyStrong,
            status === 'current' && { color },
            status === 'locked' && styles.mutedText,
          ]}
          numberOfLines={1}
        >
          {level}
        </Text>
        <Text style={[typography.caption, styles.mono]}>{hours}h</Text>
      </View>
    </PressableScale>
  );
}

// ─── Info sheet content ─────────────────────────────────────────────────────

type SheetProps = {
  milestone: Milestone;
  color: string;
  totalMinutes: number;
  /** Average session length, for the "about N sessions" estimate. */
  avgSessionMinutes: number;
  onStart: () => void;
  onClose: () => void;
};

/** What goes inside the bottom sheet when a milestone is tapped. */
export function MilestoneDetails({ milestone, color, totalMinutes, avgSessionMinutes, onStart, onClose }: SheetProps) {
  const { level, hours, status } = milestone;
  const have = formatHoursValue(totalMinutes);
  const progress = hours > 0 ? Math.min(1, totalMinutes / (hours * 60)) : 1;
  const leftMinutes = Math.max(0, hours * 60 - totalMinutes);
  const sessionsLeft = Math.max(1, Math.ceil(leftMinutes / Math.max(1, avgSessionMinutes)));

  return (
    <View style={styles.sheet}>
      <Badge milestone={milestone} color={color} scale={1.2} />
      <Text style={[typography.label, styles.mutedText, styles.kicker]}>
        {status === 'completed' ? 'MILESTONE REACHED' : status === 'current' ? 'NEXT MILESTONE' : 'LOCKED MILESTONE'}
      </Text>
      <Text style={[typography.h2, styles.centerText]}>{level}</Text>
      <Text style={[typography.body, styles.mutedText, styles.centerText]}>
        {hours === 0 ? 'Where every fire begins' : `${hours} hours of focus`}
      </Text>

      {status === 'completed' ? (
        <Text style={[typography.bodyStrong, styles.centerText, styles.status]}>
          {hours === 0 ? 'You lit the first spark. 🔥' : `You made it! You're at ${have} hours now.`}
        </Text>
      ) : (
        <>
          <Text style={[typography.bodyStrong, styles.centerText, styles.status]}>
            You are at <Text style={[styles.mono, { color }]}>{have}</Text> / {hours} hours
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(3, progress * 100)}%`, backgroundColor: color }]} />
          </View>
          <Text style={[typography.caption, styles.centerText]}>
            {formatHoursValue(leftMinutes)} hours to go
            {status === 'current' ? ` · about ${sessionsLeft} ${sessionsLeft === 1 ? 'session' : 'sessions'}` : ''}
          </Text>
        </>
      )}

      <View style={styles.actions}>
        {status === 'current' ? (
          <>
            <PrimaryButton label="Start focus" onPress={onStart} />
            <SecondaryButton label="Close" variant="ghost" onPress={onClose} />
          </>
        ) : (
          <PrimaryButton label="Got it" onPress={onClose} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  diamond: { position: 'absolute', transform: [{ rotate: '45deg' }] },
  dim: { opacity: 0.75 },
  halo: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: radii.full,
  },
  check: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Background chip so the dotted line passes behind the label.
  label: {
    alignItems: 'center',
    marginTop: -2,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.card,
    backgroundColor: colors.background,
  },
  mutedText: { color: colors.mutedText },
  mono: { fontFamily: typography.number.fontFamily },
  sheet: { alignItems: 'center' },
  kicker: { marginTop: spacing.sm, marginBottom: spacing.xxs },
  centerText: { textAlign: 'center' },
  status: { marginTop: spacing.md, marginBottom: spacing.sm },
  track: {
    alignSelf: 'stretch',
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.locked,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  fill: { height: '100%', borderRadius: radii.full },
  actions: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.lg },
});
