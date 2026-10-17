export type LevelName = 'First Steps' | 'Beginner' | 'Master' | 'Legend';

type LevelDef = { name: LevelName; minHours: number; maxHours: number };

// Lower bound inclusive, upper bound exclusive (exactly 10h is Beginner).
export const LEVELS: readonly LevelDef[] = [
  { name: 'First Steps', minHours: 0, maxHours: 10 },
  { name: 'Beginner', minHours: 10, maxHours: 50 },
  { name: 'Master', minHours: 50, maxHours: 100 },
  { name: 'Legend', minHours: 100, maxHours: Infinity },
];

/** Phire's glow per level: [center, middle, edge] of the halo behind him. */
export const LEVEL_GLOW: Record<LevelName, readonly [string, string, string]> = {
  'First Steps': ['#FFCE7A', '#FFB347', '#FF7A45'], // warm orange
  Beginner: ['#BFE0FF', '#6FAEFF', '#3D7BE8'], // blue
  Master: ['#E3C8FF', '#B07CFF', '#7C45E6'], // purple
  Legend: ['#FFF0A8', '#FFD23F', '#FFA41C'], // gold
};

function findLevel(totalMinutes: number): LevelDef {
  const hours = Math.max(0, totalMinutes) / 60;
  return LEVELS.find((l) => hours < l.maxHours) ?? LEVELS[LEVELS.length - 1];
}

export function getLevel(totalMinutes: number): LevelName {
  return findLevel(totalMinutes).name;
}

/** Progress (0..1) through the current level. Legend has no ceiling, so it is always 1. */
export function getLevelProgress(totalMinutes: number): number {
  const level = findLevel(totalMinutes);
  if (!Number.isFinite(level.maxHours)) return 1;
  const hours = Math.max(0, totalMinutes) / 60;
  const progress = (hours - level.minHours) / (level.maxHours - level.minHours);
  return Math.min(1, Math.max(0, progress));
}

export type LevelInfo = {
  levelName: LevelName;
  /** Hours it took to reach the current level. */
  hoursRequired: number;
  /** Hours needed for the next level (Legend, the last one, repeats its own threshold). */
  nextLevelHours: number;
  /** The next level, or null at Legend. */
  nextLevelName: LevelName | null;
  /** 0..1 from the current level's start to the next level (1 at Legend). */
  progressToNextLevel: number;
};

export function getLevelInfo(totalMinutes: number): LevelInfo {
  const level = findLevel(totalMinutes);
  const next = LEVELS[LEVELS.indexOf(level) + 1] ?? null;
  return {
    levelName: level.name,
    hoursRequired: level.minHours,
    nextLevelHours: next ? next.minHours : level.minHours,
    nextLevelName: next?.name ?? null,
    progressToNextLevel: getLevelProgress(totalMinutes),
  };
}

/** Hours for display: "6.5", "42", "0". One decimal below 100h, dropped when it's .0. */
export function formatHoursValue(minutes: number): string {
  const h = Math.max(0, minutes) / 60;
  if (h >= 100) return String(Math.floor(h));
  return String(Math.floor(h * 10) / 10);
}
