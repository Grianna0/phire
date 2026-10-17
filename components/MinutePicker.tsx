// Exact-minutes picker: −5 / − / [typed number] / + / +5. Hold − or + to repeat.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import PressableScale from './PressableScale';
import { colors, radii, spacing, typography } from '../theme';

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 180;

const clamp = (n: number) => Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(n)));

type Props = {
  value: number;
  onChange: (minutes: number) => void;
};

export default function MinutePicker({ value, onChange }: Props) {
  // Text being typed (may be empty or out of range until it's committed).
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  // Hold-to-repeat: starts after a short press-and-hold, then speeds up.
  const valueRef = useRef(value);
  valueRef.current = value;
  const repeat = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stopRepeat = () => clearTimeout(repeat.current);
  useEffect(() => stopRepeat, []);
  const step = (delta: number) => onChange(clamp(valueRef.current + delta));
  const startRepeat = (delta: number) => {
    let interval = 180;
    const tick = () => {
      step(delta);
      interval = Math.max(50, interval * 0.85);
      repeat.current = setTimeout(tick, interval);
    };
    tick();
  };

  const commit = () => {
    const n = parseInt(draft, 10);
    const next = Number.isFinite(n) ? clamp(n) : value;
    setDraft(String(next));
    onChange(next);
  };

  const button = (label: string, delta: number, small = false) => (
    <PressableScale
      onPress={() => step(delta)}
      onLongPress={() => startRepeat(delta)}
      onPressOut={stopRepeat}
      delayLongPress={350}
      disabled={(delta < 0 && value <= MIN_MINUTES) || (delta > 0 && value >= MAX_MINUTES)}
      accessibilityRole="button"
      accessibilityLabel={`${delta > 0 ? 'Add' : 'Remove'} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'minute' : 'minutes'}`}
      style={[styles.button, small && styles.buttonSmall]}
    >
      <Text style={[small ? typography.bodyStrong : typography.h2, styles.buttonText]}>{label}</Text>
    </PressableScale>
  );

  return (
    <View>
      <View style={styles.row}>
        {button('−5', -5, true)}
        {button('−', -1)}
        <View style={styles.valueBox}>
          <TextInput
            value={draft}
            onChangeText={(t) => {
              const digits = t.replace(/[^0-9]/g, '').slice(0, 3);
              const n = parseInt(digits, 10);
              // Too long snaps to the maximum, so the box never shows more than Begin will use.
              if (n > MAX_MINUTES) {
                setDraft(String(MAX_MINUTES));
                onChange(MAX_MINUTES);
                return;
              }
              setDraft(digits);
              // Apply valid numbers right away, so tapping Begin with the keyboard open uses them.
              if (n >= MIN_MINUTES) onChange(n);
            }}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="number-pad"
            returnKeyType="done"
            selectTextOnFocus
            maxLength={3}
            style={styles.input}
            accessibilityLabel="Minutes"
          />
          <Text style={typography.caption}>min</Text>
        </View>
        {button('+', 1)}
        {button('+5', 5, true)}
      </View>
      <Text style={[typography.caption, styles.hint]}>
        Tap the number to type it · hold − or + to change faster · {MIN_MINUTES}–{MAX_MINUTES} min
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  button: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  buttonSmall: { width: 46, height: 46 },
  buttonText: { color: colors.fireStart },
  valueBox: { flex: 1, alignItems: 'center' },
  input: {
    ...typography.numberL,
    color: colors.fireStart,
    textAlign: 'center',
    minWidth: 90,
    paddingVertical: 0,
  },
  hint: { textAlign: 'center', marginTop: spacing.sm },
});
