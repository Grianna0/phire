import type { TextStyle } from 'react-native';
// Per-weight imports so only these font files are bundled.
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono/400Regular';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono/500Medium';
import { colors } from './colors';

/** Pass to `useFonts` at app start. Keys become the fontFamily names below. */
export const fontAssets = {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  DMMono_400Regular,
  DMMono_500Medium,
};

export const fonts = {
  regular: 'Nunito_400Regular',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

export const typography = {
  display: { fontFamily: fonts.extraBold, fontSize: 34, lineHeight: 40, color: colors.text },
  h1: { fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 34, color: colors.text },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.text },
  h3: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.text },
  bodyStrong: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 22, color: colors.text },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.mutedText },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: colors.mutedText },
  // Numbers: timers, minutes, stats
  timer: { fontFamily: fonts.monoMedium, fontSize: 48, lineHeight: 56, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  numberXL: { fontFamily: fonts.monoMedium, fontSize: 64, lineHeight: 72, color: colors.text },
  numberL: { fontFamily: fonts.monoMedium, fontSize: 32, lineHeight: 38, color: colors.text },
  number: { fontFamily: fonts.mono, fontSize: 16, lineHeight: 22, color: colors.text },
  // Emoji icons inside badges and cards
  emoji: { fontSize: 24, lineHeight: 30 },
  emojiL: { fontSize: 32, lineHeight: 40 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
