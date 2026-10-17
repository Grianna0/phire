import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { impact } from '../lib/feedback';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Light haptic on press (default true). */
  haptics?: boolean;
};

/** Pressable with the app-wide pressed state (scale 0.97) and a light tap haptic. */
export default function PressableScale({ style, haptics = true, onPress, disabled, ...rest }: Props) {
  const handlePress = (e: GestureResponderEvent) => {
    if (haptics) impact('light');
    onPress?.(e);
  };

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [style, pressed && !disabled && { transform: [{ scale: 0.97 }] }]}
    />
  );
}
