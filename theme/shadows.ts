import type { ViewStyle } from 'react-native';

// Warm-tinted (deep accent / fire orange) shadows instead of black.
// `boxShadow` is supported on iOS, Android and web in the New Architecture.
export const shadows = {
  sm: { boxShadow: '0px 2px 8px rgba(45, 42, 62, 0.06)' },
  md: { boxShadow: '0px 6px 20px rgba(45, 42, 62, 0.08), 0px 2px 6px rgba(255, 122, 69, 0.06)' },
  lg: { boxShadow: '0px 12px 32px rgba(45, 42, 62, 0.10), 0px 4px 12px rgba(255, 122, 69, 0.08)' },
  /** Soft orange glow for primary fire buttons. */
  glow: { boxShadow: '0px 8px 24px rgba(255, 122, 69, 0.35)' },
} satisfies Record<string, ViewStyle>;
