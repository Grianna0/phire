import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Skill = {
  id: string;
  name: string;
  color: string;
  totalMinutes: number;
  sessionsCount: number;
};

export type Session = {
  id: string;
  skillId: string;
  startedAt: number;
  durationMinutes: number;
  completed: boolean;
  distractions: number;
};

export type TrackId = 'melody1' | 'melody2' | 'melody3';
export const TRACK_ORDER: TrackId[] = ['melody1', 'melody2', 'melody3'];

export type Settings = {
  defaultDuration: 15 | 25 | 45 | 90;
  /** Master sound switch: background music and sound effects. */
  soundOn: boolean;
  hapticsOn: boolean;
  reminderTime: string;
  currentTrack: TrackId;
  /** Last exact length picked with "Custom" in the duration sheet (minutes). */
  customDuration: number;
};

export type AppState = {
  onboarded: boolean;
  skills: Skill[];
  activeSkillId: string;
  sessions: Session[];
  currentStreak: number;
  lastSessionDate: string;
  settings: Settings;
};

export type AppActions = {
  completeOnboarding: () => void;
  /** Creates a skill and returns it. The first skill added becomes active. */
  addSkill: (name: string, color: string) => Skill;
  setActiveSkill: (skillId: string) => void;
  /** Removes a skill and its sessions. The last remaining skill can't be deleted. */
  deleteSkill: (skillId: string) => void;
  /** Starts a session (defaults: active skill, settings.defaultDuration) and returns its id. */
  startSession: (skillId?: string, durationMinutes?: number) => string;
  /** Marks a session completed, credits the skill and updates the streak. */
  completeSession: (sessionId: string, actualMinutes?: number) => void;
  /** Ends a session early. It stays in history as not completed, with the minutes actually spent. */
  abandonSession: (sessionId: string) => void;
  incrementDistraction: (sessionId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setSoundOn: (on: boolean) => void;
  setCurrentTrack: (track: TrackId) => void;
  /** melody1 → melody2 → melody3 → melody1. Works while muted, so unmuting plays the new track. */
  nextTrack: () => void;
  resetData: () => void;
  /** Show onboarding again without touching skills or sessions (dev tools). */
  restartOnboarding: () => void;
  /** Replace all saved data at once (dev tools: sample data / restoring a backup). */
  replaceData: (data: AppState) => void;
};

export type AppStore = AppState & AppActions;

const initialState: AppState = {
  onboarded: false,
  skills: [],
  activeSkillId: '',
  sessions: [],
  currentStreak: 0,
  lastSessionDate: '',
  settings: {
    defaultDuration: 25,
    soundOn: true,
    hapticsOn: true,
    reminderTime: '09:00',
    currentTrack: 'melody1',
    customDuration: 30,
  },
};

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Local calendar date as YYYY-MM-DD. */
export const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const nextStreak = (lastSessionDate: string, currentStreak: number, now: Date) => {
  const today = toDateKey(now);
  if (lastSessionDate === today) return currentStreak;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return lastSessionDate === toDateKey(yesterday) ? currentStreak + 1 : 1;
};

/** The streak as of today: a stored streak whose last session was before yesterday has lapsed. */
export const getLiveStreak = (lastSessionDate: string, currentStreak: number, now = new Date()) => {
  if (!lastSessionDate) return 0;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return lastSessionDate === toDateKey(now) || lastSessionDate === toDateKey(yesterday) ? currentStreak : 0;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      completeOnboarding: () => set({ onboarded: true }),

      addSkill: (name, color) => {
        const skill: Skill = { id: makeId(), name: name.trim(), color, totalMinutes: 0, sessionsCount: 0 };
        set((s) => ({
          skills: [...s.skills, skill],
          activeSkillId: s.activeSkillId || skill.id,
        }));
        return skill;
      },

      setActiveSkill: (skillId) => {
        if (get().skills.some((sk) => sk.id === skillId)) set({ activeSkillId: skillId });
      },

      deleteSkill: (skillId) =>
        set((s) => {
          const skills = s.skills.filter((sk) => sk.id !== skillId);
          if (skills.length === s.skills.length || skills.length === 0) return {};
          return {
            skills,
            sessions: s.sessions.filter((x) => x.skillId !== skillId),
            // Deleting the current skill moves you to the first remaining one.
            activeSkillId: s.activeSkillId === skillId ? skills[0].id : s.activeSkillId,
          };
        }),

      startSession: (skillId, durationMinutes) => {
        const { activeSkillId, settings } = get();
        const session: Session = {
          id: makeId(),
          skillId: skillId ?? activeSkillId,
          startedAt: Date.now(),
          durationMinutes: durationMinutes ?? settings.defaultDuration,
          completed: false,
          distractions: 0,
        };
        set((s) => ({ sessions: [...s.sessions, session] }));
        return session.id;
      },

      completeSession: (sessionId, actualMinutes) => {
        const state = get();
        const session = state.sessions.find((x) => x.id === sessionId);
        if (!session || session.completed) return;

        const minutes = actualMinutes ?? session.durationMinutes;
        const now = new Date();
        set({
          sessions: state.sessions.map((x) =>
            x.id === sessionId ? { ...x, completed: true, durationMinutes: minutes } : x,
          ),
          skills: state.skills.map((sk) =>
            sk.id === session.skillId
              ? { ...sk, totalMinutes: sk.totalMinutes + minutes, sessionsCount: sk.sessionsCount + 1 }
              : sk,
          ),
          currentStreak: nextStreak(state.lastSessionDate, state.currentStreak, now),
          lastSessionDate: toDateKey(now),
        });
      },

      abandonSession: (sessionId) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === sessionId && !x.completed
              ? { ...x, durationMinutes: Math.floor((Date.now() - x.startedAt) / 60000) }
              : x,
          ),
        })),

      incrementDistraction: (sessionId) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === sessionId ? { ...x, distractions: x.distractions + 1 } : x,
          ),
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setSoundOn: (on) => get().updateSettings({ soundOn: on }),
      setCurrentTrack: (track) => get().updateSettings({ currentTrack: track }),
      nextTrack: () => {
        const i = TRACK_ORDER.indexOf(get().settings.currentTrack);
        get().updateSettings({ currentTrack: TRACK_ORDER[(i + 1) % TRACK_ORDER.length] });
      },

      resetData: () => set(initialState),
      restartOnboarding: () => set({ onboarded: false }),
      replaceData: (data) => set({ ...initialState, ...data, settings: { ...initialState.settings, ...data.settings } }),
    }),
    {
      name: 'phire-app-state',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Deep-merge settings so fields added later (e.g. currentTrack) get their defaults
      // instead of being wiped by an older saved settings object.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AppState>;
        return { ...current, ...saved, settings: { ...current.settings, ...saved.settings } };
      },
      // Persist data only, never the action functions.
      partialize: ({
        onboarded,
        skills,
        activeSkillId,
        sessions,
        currentStreak,
        lastSessionDate,
        settings,
      }): AppState => ({
        onboarded,
        skills,
        activeSkillId,
        sessions,
        currentStreak,
        lastSessionDate,
        settings,
      }),
    },
  ),
);
