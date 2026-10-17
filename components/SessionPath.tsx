import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PressableScale from './PressableScale';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { FlameIcon, LockIcon } from './icons';
import BottomSheet from './BottomSheet';
import MilestoneNode, { MILESTONE_SIZE, MilestoneDetails, type Milestone } from './MilestoneNode';
import { LEVELS } from '../lib/levels';
import type { Session } from '../store/useAppStore';
import { colors, radii, shadows, spacing, typography } from '../theme';

type Props = {
  color: string;
  /** Completed sessions for this skill, oldest first. */
  completed: Session[];
  /** The skill's total focus time (the source of truth for levels). */
  totalMinutes: number;
  onStart: () => void;
};

type PathNode =
  | { kind: 'done'; key: string; minutes: number }
  | { kind: 'current'; key: string }
  | { kind: 'future'; key: string }
  | { kind: 'milestone'; key: string; milestone: Milestone };

export const NODE_GAP = 96;
const MILESTONE_GAP = 136; // milestones are bigger and carry a two-line label
const MAX_DONE = 10;
const MAX_LEAD_IN = 4; // most locked steps drawn between "Start" and the next milestone
const BETWEEN_LOCKED = 2; // locked steps between later (locked) milestones
const LEGEND_TAIL = 3; // at the top level there's no next milestone: a few steps ahead instead
const DEFAULT_SESSION = 25;
const AMPLITUDE = 56;
const SIZE = { done: 56, current: 76, future: 50, milestone: MILESTONE_SIZE } as const;
const LINE_COLOR = '#EADBCB';

/** Horizontal offset for node i: a gentle sine wave down the path. Milestones sit in the middle. */
const waveX = (i: number) => Math.sin(i * 0.85) * AMPLITUDE;

const averageMinutes = (completed: Session[]) =>
  completed.length
    ? completed.reduce((sum, s) => sum + s.durationMinutes, 0) / completed.length
    : DEFAULT_SESSION;

/**
 * The path, top to bottom, one chapter per level:
 *   reached milestones, interleaved with the last sessions at the point each level was crossed
 *   → "Start" (the next session) → a few locked steps → the next milestone (in progress)
 *   → later milestones, locked.
 * Scrolling up shows the past; the newest part is at the bottom.
 */
export function buildNodes(completed: Session[], totalMinutes: number): PathNode[] {
  const nodes: PathNode[] = [];
  const reached = (i: number): PathNode => ({
    kind: 'milestone',
    key: `ms-${LEVELS[i].name}`,
    milestone: { level: LEVELS[i].name, hours: LEVELS[i].minHours, status: 'completed' },
  });

  // Time not covered by the listed sessions (e.g. older data) counts from the start.
  const listed = completed.reduce((sum, s) => sum + s.durationMinutes, 0);
  let minutes = Math.max(0, totalMinutes - listed);
  let level = 0; // index of the last milestone reached; "First Steps" (0h) always is
  nodes.push(reached(0));
  const passMilestones = () => {
    while (level + 1 < LEVELS.length && minutes >= LEVELS[level + 1].minHours * 60) {
      level += 1;
      nodes.push(reached(level));
    }
  };
  passMilestones();

  // Older sessions still count towards milestones but aren't drawn, so the path stays short.
  const firstShown = Math.max(0, completed.length - MAX_DONE);
  completed.forEach((s, i) => {
    minutes += s.durationMinutes;
    if (i >= firstShown) nodes.push({ kind: 'done', key: s.id, minutes: s.durationMinutes });
    passMilestones();
  });

  nodes.push({ kind: 'current', key: 'current' });

  const next = LEVELS[level + 1];
  if (!next) {
    // Legend: nothing left to unlock, keep walking.
    for (let i = 0; i < LEGEND_TAIL; i++) nodes.push({ kind: 'future', key: `future-legend-${i}` });
    return nodes;
  }

  // Roughly as many steps as sessions left (the "Start" node is the first of them).
  const sessionsLeft = Math.ceil(Math.max(0, next.minHours * 60 - totalMinutes) / averageMinutes(completed));
  const leadIn = Math.min(MAX_LEAD_IN, Math.max(0, sessionsLeft - 1));
  for (let i = 0; i < leadIn; i++) nodes.push({ kind: 'future', key: `future-${level}-${i}` });
  nodes.push({
    kind: 'milestone',
    key: `ms-${next.name}`,
    milestone: { level: next.name, hours: next.minHours, status: 'current' },
  });

  for (let l = level + 2; l < LEVELS.length; l++) {
    for (let i = 0; i < BETWEEN_LOCKED; i++) nodes.push({ kind: 'future', key: `future-${l}-${i}` });
    nodes.push({
      kind: 'milestone',
      key: `ms-${LEVELS[l].name}`,
      milestone: { level: LEVELS[l].name, hours: LEVELS[l].minHours, status: 'locked' },
    });
  }
  return nodes;
}

const rowHeight = (n: PathNode) => (n.kind === 'milestone' ? MILESTONE_GAP : NODE_GAP);

export default function SessionPath({ color, completed, totalMinutes, onStart }: Props) {
  const [width, setWidth] = useState(0);
  const nodes = buildNodes(completed, totalMinutes);
  const currentIndex = nodes.findIndex((n) => n.kind === 'current');

  // Milestone info sheet. `shown` stays set while the sheet slides away.
  const [shown, setShown] = useState<Milestone | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openMilestone = (m: Milestone) => {
    setShown(m);
    setSheetOpen(true);
  };

  // Row tops: each node gets its own row height, so milestones have room to breathe.
  let top = 0;
  const points = nodes.map((n, i) => {
    const h = rowHeight(n);
    const y = top + h / 2;
    top += h;
    return { x: width / 2 + (n.kind === 'milestone' ? 0 : waveX(i)), y };
  });
  const height = top;

  const segment = (from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((p, i, arr) => {
        if (i === 0) return `M${p.x} ${p.y}`;
        const prev = arr[i - 1];
        const mid = (p.y - prev.y) / 2;
        return `C${prev.x} ${prev.y + mid} ${p.x} ${p.y - mid} ${p.x} ${p.y}`;
      })
      .join(' ');

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            {/* Walked part in the skill color, the rest muted */}
            {currentIndex > 0 && (
              <Path d={segment(0, currentIndex)} stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray="0.1 12" fill="none" />
            )}
            <Path
              d={segment(currentIndex, nodes.length - 1)}
              stroke={LINE_COLOR}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray="0.1 12"
              fill="none"
            />
          </Svg>

          {nodes.map((node, i) => {
            const size = SIZE[node.kind];
            const { x, y } = points[i];
            const slot = node.kind === 'milestone' ? styles.milestoneSlot : styles.nodeSlot;
            const half = node.kind === 'milestone' ? 80 : 50;
            return (
              <View key={node.key} style={[slot, { left: x - half, top: y - size / 2 }]}>
                {node.kind === 'done' && <DoneNode color={color} minutes={node.minutes} />}
                {node.kind === 'current' && <CurrentNode color={color} onPress={onStart} />}
                {node.kind === 'future' && <FutureNode />}
                {node.kind === 'milestone' && (
                  <MilestoneNode milestone={node.milestone} color={color} onPress={() => openMilestone(node.milestone)} />
                )}
              </View>
            );
          })}
        </>
      )}

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        {shown && (
          <MilestoneDetails
            milestone={shown}
            color={color}
            totalMinutes={totalMinutes}
            avgSessionMinutes={averageMinutes(completed)}
            onClose={() => setSheetOpen(false)}
            onStart={() => {
              setSheetOpen(false);
              onStart();
            }}
          />
        )}
      </BottomSheet>
    </View>
  );
}

function DoneNode({ color, minutes }: { color: string; minutes: number }) {
  return (
    <>
      <View style={[styles.circle, shadows.sm, { width: SIZE.done, height: SIZE.done, backgroundColor: color }]}>
        <FlameIcon size={24} />
      </View>
      <Text style={[typography.caption, styles.mono, styles.label]}>{minutes}m</Text>
    </>
  );
}

function CurrentNode({ color, onPress }: { color: string; onPress: () => void }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const s = SIZE.current;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel="Start next session" style={styles.center}>
      <View style={{ width: s, height: s }}>
        <Animated.View
          style={[styles.ring, { width: s, height: s, borderColor: color, backgroundColor: `${color}1F` }, ringStyle]}
        />
        <View style={[styles.circle, styles.currentInner, shadows.md, { backgroundColor: color }]}>
          <FlameIcon size={30} />
        </View>
      </View>
      <Text style={[typography.bodyStrong, styles.label, { color }]}>Start</Text>
    </PressableScale>
  );
}

function FutureNode() {
  return (
    <View style={[styles.circle, styles.future, { width: SIZE.future, height: SIZE.future }]}>
      <LockIcon size={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  // 100px-wide slot centered on the node's x, so labels can be wider than the circle.
  nodeSlot: { position: 'absolute', width: 100, alignItems: 'center', gap: spacing.xxs },
  milestoneSlot: { position: 'absolute', width: 160, alignItems: 'center' },
  center: { alignItems: 'center', gap: spacing.xxs },
  circle: { borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: radii.full, borderWidth: 3 },
  currentInner: { position: 'absolute', top: 9, left: 9, right: 9, bottom: 9 },
  future: { backgroundColor: '#F3EBE2', opacity: 0.85 },
  mono: { fontFamily: typography.number.fontFamily },
  // Background chip so the dotted line passes behind labels.
  label: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
});
