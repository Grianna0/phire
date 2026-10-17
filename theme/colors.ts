export const colors = {
  background: '#FFF8F0',
  surface: '#FFFFFF',
  fireStart: '#FF7A45',
  fireEnd: '#FFB347',
  deepAccent: '#2D2A3E',
  mutedText: '#8B8799',
  success: '#FF9E5E',
  warmGlow: '#FFCE7A',
  text: '#2D2A3E',
  textOnFire: '#FFFFFF',
  border: '#F1E6DA',
  danger: '#D9483B',
  locked: '#EEE7E0',
  // Focus mode (dark, warm)
  focusBackground: '#1A1424',
  focusText: '#F6EDE4',
  focusMuted: 'rgba(246, 237, 228, 0.55)',
  focusTrack: 'rgba(246, 237, 228, 0.08)',
  // Session failed (muted, warm)
  mutedBackground: '#F3EDE8',
} as const;

/** Start → end stops for expo-linear-gradient's `colors` prop. */
export const fireGradient = [colors.fireStart, colors.fireEnd] as const;

export type ColorName = keyof typeof colors;

/** Subtle accent per starter skill (onboarding presets). */
export const skillColors = {
  Design: '#F2879E',
  Writing: '#8F7FE8',
  Coding: '#4DAFA3',
  Reading: '#F0A04B',
  Music: '#E46A5A',
} as const;

export type SkillPresetName = keyof typeof skillColors;

/** Colours offered when adding a skill: the presets first, then a few more. */
export const SKILL_PALETTE = [
  ...Object.values(skillColors),
  '#4CAF7A', // green
  '#5B8DEF', // blue
  '#C77DDB', // lilac
  '#E8A33D', // amber
  '#3FA7C9', // teal blue
] as const;
