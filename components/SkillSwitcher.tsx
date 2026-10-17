// Header skill switcher: shows the active skill; tap to switch skills or add a new one.
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet from './BottomSheet';
import PressableScale from './PressableScale';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { useAppStore } from '../store/useAppStore';
import { impact } from '../lib/feedback';
import { getLevel } from '../lib/levels';
import { SKILL_PALETTE, colors, radii, skillColors, spacing, typography } from '../theme';

const MAX_NAME = 24;

// Quick picks when adding a skill, each with a fitting colour.
const SUGGESTIONS: { name: string; color: string }[] = [
  { name: 'Sport', color: '#4CAF7A' },
  { name: 'Music', color: skillColors.Music },
  { name: 'Design', color: skillColors.Design },
  { name: 'Writing', color: skillColors.Writing },
  { name: 'Coding', color: skillColors.Coding },
  { name: 'Reading', color: skillColors.Reading },
  { name: 'Language', color: '#5B8DEF' },
  { name: 'Drawing', color: '#C77DDB' },
  { name: 'Cooking', color: '#E8A33D' },
  { name: 'Meditation', color: '#3FA7C9' },
];

const formatTotal = (minutes: number) => (minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`);

export default function SkillSwitcher() {
  const skills = useAppStore((s) => s.skills);
  const activeSkillId = useAppStore((s) => s.activeSkillId);
  const setActiveSkill = useAppStore((s) => s.setActiveSkill);
  const addSkill = useAppStore((s) => s.addSkill);
  const active = skills.find((k) => k.id === activeSkillId) ?? skills[0];

  const deleteSkill = useAppStore((s) => s.deleteSkill);
  const sessions = useAppStore((s) => s.sessions);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'list' | 'add' | 'delete'>('list');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(SKILL_PALETTE[0]);

  const unusedColor = () => SKILL_PALETTE.find((c) => !skills.some((s) => s.color === c)) ?? SKILL_PALETTE[0];

  const openSheet = () => {
    setMode('list');
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    // Reset after the close animation.
    setTimeout(() => {
      setMode('list');
      setName('');
    }, 320);
  };
  const startAdding = () => {
    setName('');
    setColor(unusedColor());
    setMode('add');
  };
  const choose = (id: string) => {
    setActiveSkill(id);
    close();
  };

  // Delete: always ask first, inside the sheet (not a system dialog).
  const askDelete = (id: string) => {
    setToDelete(id);
    setMode('delete');
  };
  const confirmDelete = () => {
    if (toDelete) deleteSkill(toDelete);
    impact('light');
    setToDelete(null);
    setMode('list');
  };
  const doomed = skills.find((s) => s.id === toDelete);
  const doomedSessions = doomed ? sessions.filter((x) => x.skillId === doomed.id).length : 0;
  const canDelete = skills.length > 1;

  const trimmed = name.trim();
  const existing = skills.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  const save = () => {
    if (!trimmed) return;
    // Typing a name you already have just switches to it.
    const skill = existing ?? addSkill(trimmed, color);
    choose(skill.id);
  };

  if (!active) return null;

  return (
    <>
      <PressableScale
        onPress={openSheet}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Current skill: ${active.name}, level ${getLevel(active.totalMinutes)}. Switch or add a skill`}
        style={styles.trigger}
      >
        <View style={[styles.dot, { backgroundColor: active.color }]} />
        <View style={styles.triggerText}>
          <Text style={typography.h3} numberOfLines={1}>
            {active.name}
            <Text style={styles.total}> · {formatTotal(active.totalMinutes)}</Text>
          </Text>
          <Text style={[typography.caption, styles.level]} numberOfLines={1}>
            Level: {getLevel(active.totalMinutes)}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.mutedText} />
      </PressableScale>

      <BottomSheet visible={open} onClose={close}>
        {mode === 'delete' && doomed ? (
          <>
            <View style={styles.warnIcon}>
              <Ionicons name="warning" size={28} color={colors.danger} />
            </View>
            <Text style={[typography.h2, styles.center]}>Delete {doomed.name}?</Text>
            <Text style={[typography.body, styles.muted, styles.center, styles.warnText]}>
              {doomedSessions > 0
                ? `This removes ${doomed.name} and its ${doomedSessions} ${doomedSessions === 1 ? 'session' : 'sessions'} (${formatTotal(doomed.totalMinutes)} of focus). This can't be undone.`
                : `This removes ${doomed.name}. It has no sessions yet.`}
            </Text>
            <View style={styles.actions}>
              <PrimaryButton label="Keep it" onPress={() => setMode('list')} />
              <PressableScale onPress={confirmDelete} accessibilityRole="button" style={styles.dangerButton}>
                <Text style={[typography.h3, styles.dangerText]}>Delete {doomed.name}</Text>
              </PressableScale>
            </View>
          </>
        ) : mode === 'list' ? (
          <>
            <Text style={typography.h2}>Your skills</Text>
            <Text style={[typography.caption, styles.sub]}>Pick what you're growing right now.</Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} bounces={false}>
              {skills.map((s) => {
                const selected = s.id === active.id;
                return (
                  <PressableScale
                    key={s.id}
                    onPress={() => choose(s.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[styles.row, selected && { borderColor: s.color, backgroundColor: `${s.color}14` }]}
                  >
                    <View style={[styles.rowDot, { backgroundColor: s.color }]} />
                    <Text style={[typography.bodyStrong, styles.flex]} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={[typography.number, styles.muted]}>{formatTotal(s.totalMinutes)}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={s.color} />}
                    {canDelete && (
                      <PressableScale
                        onPress={() => askDelete(s.id)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${s.name}`}
                        style={styles.trash}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.mutedText} />
                      </PressableScale>
                    )}
                  </PressableScale>
                );
              })}
            </ScrollView>
            {!canDelete && (
              <Text style={[typography.caption, styles.hint]}>Add another skill to be able to delete this one.</Text>
            )}
            <PressableScale onPress={startAdding} accessibilityRole="button" style={styles.addRow}>
              <Ionicons name="add-circle" size={24} color={colors.fireStart} />
              <Text style={[typography.bodyStrong, styles.addText]}>Add a skill</Text>
            </PressableScale>
          </>
        ) : (
          <>
            <Text style={typography.h2}>Add a skill</Text>
            <Text style={[typography.caption, styles.sub]}>What else do you want to grow?</Text>
            <TextInput
              value={name}
              onChangeText={(t) => setName(t.slice(0, MAX_NAME))}
              placeholder="e.g. Sport, Guitar, Spanish"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={save}
              accessibilityLabel="Skill name"
            />
            <View style={styles.chips}>
              {SUGGESTIONS.filter((sg) => !skills.some((s) => s.name.toLowerCase() === sg.name.toLowerCase())).map(
                (sg) => (
                  <PressableScale
                    key={sg.name}
                    onPress={() => {
                      setName(sg.name);
                      setColor(sg.color);
                    }}
                    style={[styles.chip, trimmed === sg.name && { borderColor: sg.color, backgroundColor: `${sg.color}1A` }]}
                  >
                    <Text style={typography.bodyStrong}>{sg.name}</Text>
                  </PressableScale>
                ),
              )}
            </View>
            <Text style={[typography.label, styles.colorLabel]}>COLOUR</Text>
            <View style={styles.colors}>
              {SKILL_PALETTE.map((c) => (
                <PressableScale
                  key={c}
                  onPress={() => setColor(c)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: c === color }}
                  accessibilityLabel={`Colour ${c}`}
                  style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchSelected]}
                />
              ))}
            </View>
            <View style={styles.actions}>
              <PrimaryButton
                label={existing ? `Switch to ${existing.name}` : trimmed ? `Add ${trimmed}` : 'Add skill'}
                onPress={save}
                disabled={!trimmed}
              />
              <SecondaryButton label="Back" variant="ghost" onPress={() => setMode('list')} />
            </View>
          </>
        )}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  muted: { color: colors.mutedText },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: 190 },
  triggerText: { flexShrink: 1 },
  level: { color: colors.mutedText, marginTop: -2 },
  dot: { width: 10, height: 10, borderRadius: radii.full },
  total: { fontFamily: typography.number.fontFamily, color: colors.mutedText },
  sub: { marginTop: spacing.xxs, marginBottom: spacing.md },
  list: { maxHeight: 300 },
  listContent: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  rowDot: { width: 14, height: 14, borderRadius: radii.full },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  addText: { color: colors.fireStart },
  input: {
    ...typography.body,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'web' ? spacing.sm : spacing.xs,
    minHeight: 48,
    backgroundColor: colors.background,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  chip: {
    paddingVertical: spacing.xxs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorLabel: { marginTop: spacing.md, marginBottom: spacing.xs },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: 32, height: 32, borderRadius: radii.full, borderWidth: 3, borderColor: 'transparent' },
  swatchSelected: { borderColor: colors.deepAccent },
  actions: { gap: spacing.xs, marginTop: spacing.lg },
  center: { textAlign: 'center' },
  trash: { padding: spacing.xxs, marginLeft: spacing.xxs },
  hint: { marginTop: spacing.xs, marginLeft: spacing.xxs },
  warnIcon: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE8E5',
    marginBottom: spacing.sm,
  },
  warnText: { marginTop: spacing.xs },
  dangerButton: {
    minHeight: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.danger,
  },
  dangerText: { color: colors.danger },
});
