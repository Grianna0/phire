import { StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import PressableScale from './PressableScale';
import { colors, radii, spacing, typography } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  /** 'outline' = bordered pill; 'ghost' = text only, low contrast. */
  variant?: 'outline' | 'ghost';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function SecondaryButton({ label, onPress, variant = 'outline', style, textStyle }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={8}
      style={[styles.base, variant === 'outline' && styles.outline, style]}
    >
      <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel, textStyle]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  outline: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: { ...typography.h3, textAlign: 'center' },
  ghostLabel: { ...typography.bodyStrong, color: colors.mutedText },
});
