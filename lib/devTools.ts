// DEV ONLY helpers behind the Developer tools screen: sample data and a one-slot backup of your
// real data, so you can explore freely and come back to where you were.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toDateKey, useAppStore, type AppState, type Session, type Skill } from '../store/useAppStore';
import { skillColors } from '../theme';

const BACKUP_KEY = 'phire-dev-backup';
const DAY = 86_400_000;

/** Snapshot of just the data fields (no actions). */
function currentData(): AppState {
  const { onboarded, skills, activeSkillId, sessions, currentStreak, lastSessionDate, settings } =
    useAppStore.getState();
  return { onboarded, skills, activeSkillId, sessions, currentStreak, lastSessionDate, settings };
}

export async function hasBackup() {
  return (await AsyncStorage.getItem(BACKUP_KEY)) !== null;
}

/** Saves your current data once; a later sample load won't overwrite the original backup. */
async function backUpOnce() {
  if (await hasBackup()) return;
  await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(currentData()));
}

export async function restoreBackup() {
  const raw = await AsyncStorage.getItem(BACKUP_KEY);
  if (!raw) return false;
  useAppStore.getState().replaceData(JSON.parse(raw) as AppState);
  await AsyncStorage.removeItem(BACKUP_KEY);
  return true;
}

/**
 * Realistic data: 3 skills (one 15 min short of a level-up, one at Master), ~3 weeks of sessions including a
 * stopped one, and a 5-day streak. Backs up your real data first.
 */
export async function loadSampleData() {
  await backUpOnce();
  const now = Date.now();
  const skills: Skill[] = [
    { id: 'demo-music', name: 'Music', color: skillColors.Music, totalMinutes: 0, sessionsCount: 0 },
    { id: 'demo-design', name: 'Design', color: skillColors.Design, totalMinutes: 0, sessionsCount: 0 },
    { id: 'demo-coding', name: 'Coding', color: skillColors.Coding, totalMinutes: 0, sessionsCount: 0 },
  ];
  const sessions: Session[] = [];
  const add = (skillId: string, daysAgo: number, minutes: number, completed = true) =>
    sessions.push({
      id: `demo-${skillId}-${daysAgo}-${sessions.length}`,
      skillId,
      startedAt: now - daysAgo * DAY - 3_600_000,
      durationMinutes: minutes,
      completed,
      distractions: completed ? 0 : 1,
    });
  // Music: lots of recent practice (shows a long path and a forecast)
  [0, 1, 2, 3, 4, 6, 7, 9, 11, 13, 16, 20].forEach((d, i) => add('demo-music', d, [25, 45, 25, 15, 45][i % 5]));
  add('demo-music', 5, 8, false); // a stopped session
  // Design: a few sessions; Coding: just one
  [2, 5, 8, 12].forEach((d) => add('demo-design', d, 25));
  add('demo-coding', 3, 15);

  for (const s of sessions) {
    const sk = skills.find((k) => k.id === s.skillId);
    if (sk && s.completed) {
      sk.totalMinutes += s.durationMinutes;
      sk.sessionsCount += 1;
    }
  }
  // Put Design 15 min short of 10h, so a 15-min session triggers a level-up.
  skills[1].totalMinutes = 585;
  // Coding is a veteran at 62h (Master): shows reached milestones on the path and a purple glow.
  skills[2].totalMinutes = 62 * 60;

  useAppStore.getState().replaceData({
    ...currentData(),
    onboarded: true,
    skills,
    activeSkillId: 'demo-music',
    sessions,
    currentStreak: 5,
    lastSessionDate: toDateKey(new Date(now)),
  });
}
