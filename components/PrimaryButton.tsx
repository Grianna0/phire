import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PressableScale from './PressableScale';
import { colors, fireGradient, radii, shadows, spacing, typography } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function PrimaryButton({ label, onPress, disabled = false, style }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.base, !disabled && shadows.glow, style]}
    >
      {disabled ? (
        <Text style={[styles.label, styles.labelDisabled]}>{label}</Text>
      ) : (
        <LinearGradient colors={fireGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          <Text style={styles.label}>{label}</Text>
        </LinearGradient>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
    minHeight: 56,
    justifyContent: 'center',
  },
  gradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typography.h3,
    color: colors.textOnFire,
    textAlign: 'center',
  },
  labelDisabled: {
    color: colors.mutedText,
  },
});
