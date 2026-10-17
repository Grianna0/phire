import { Platform, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AudioHeaderControls from './AudioHeaderControls';
import PressableScale from './PressableScale';
import SkillSwitcher from './SkillSwitcher';
import { ChartIcon, GearIcon } from './icons';
import { colors, spacing } from '../theme';

// Home's single header: skill switcher on the left; audio, stats and settings on the right.

export function HomeHeaderLeft() {
  return (
    <View style={styles.left}>
      <SkillSwitcher />
    </View>
  );
}

export function HomeHeaderRight() {
  const navigation = useNavigation();
  return (
    <View style={styles.actions}>
      <AudioHeaderControls />
      <View style={styles.divider} />
      <PressableScale onPress={() => navigation.navigate('Stats')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Stats">
        <ChartIcon size={24} />
      </PressableScale>
      <PressableScale
        onPress={() => navigation.navigate('Settings')}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <GearIcon size={24} />
      </PressableScale>
    </View>
  );
}

// Native headers already inset their left/right slots; the web header doesn't.
const EDGE = Platform.OS === 'web' ? spacing.lg : spacing.xxs;

const styles = StyleSheet.create({
  left: { paddingLeft: EDGE },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingRight: EDGE },
  divider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: colors.border },
});
