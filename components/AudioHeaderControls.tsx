import { Platform, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableScale from './PressableScale';
import { useAppStore } from '../store/useAppStore';
import { TRACKS } from '../lib/tracks';
import { colors, spacing } from '../theme';

const ICON_SIZE = 24;

/** Header buttons: mute/unmute music and skip to the next melody (light haptic on each). */
export default function AudioHeaderControls({ edgePadding = false }: { edgePadding?: boolean }) {
  const soundOn = useAppStore((s) => s.settings.soundOn);
  const track = useAppStore((s) => s.settings.currentTrack);
  const setSoundOn = useAppStore((s) => s.setSoundOn);
  const nextTrack = useAppStore((s) => s.nextTrack);

  return (
    <View style={[styles.row, edgePadding && Platform.OS === 'web' && styles.webEdge]}>
      <PressableScale
        onPress={() => setSoundOn(!soundOn)}
        hitSlop={10}
        accessibilityRole="switch"
        accessibilityState={{ checked: soundOn }}
        accessibilityLabel={soundOn ? 'Mute music' : 'Unmute music'}
      >
        <Ionicons name={soundOn ? 'volume-high' : 'volume-mute'} size={ICON_SIZE} color={colors.deepAccent} />
      </PressableScale>
      {/* Changes the track even while muted, so unmuting plays the new one. */}
      <PressableScale
        onPress={nextTrack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Next melody (now ${TRACKS[track].label})`}
      >
        <Ionicons name="play-skip-forward" size={ICON_SIZE} color={colors.deepAccent} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xxs },
  // When used alone as headerRight: the web header doesn't inset its right slot.
  webEdge: { paddingRight: spacing.lg },
});
