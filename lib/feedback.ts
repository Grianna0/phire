import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/useAppStore';

// Haptics that respect the user's settings and never throw (web has no haptics).
// Sound effects live in ./sounds.

export function haptic(kind: 'success' | 'error' | 'warning') {
  if (Platform.OS === 'web' || !useAppStore.getState().settings.hapticsOn) return;
  const type = {
    success: Haptics.NotificationFeedbackType.Success,
    error: Haptics.NotificationFeedbackType.Error,
    warning: Haptics.NotificationFeedbackType.Warning,
  }[kind];
  Haptics.notificationAsync(type).catch(() => {});
}

/** Physical "tap" feel: light for taps, medium for bigger moments like starting a session. */
export function impact(strength: 'light' | 'medium' = 'light') {
  if (Platform.OS === 'web' || !useAppStore.getState().settings.hapticsOn) return;
  const style = strength === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium;
  Haptics.impactAsync(style).catch(() => {});
}

/** Yes/no confirmation that also works on web, where Alert.alert does nothing. */
export function confirm(title: string, message: string, confirmLabel: string, cancelLabel = 'Cancel') {
  return new Promise<boolean>((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(`${title}\n\n${message}`));
      return;
    }
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
