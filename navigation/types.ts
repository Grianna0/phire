export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Settings: undefined;
  FocusSession: { duration: number; skillId: string };
  /** `duration` is the planned length, so "Try again"/"Start another" can reuse it. */
  SessionComplete: {
    sessionId: string;
    success: boolean;
    duration: number;
    /** Developer tools preview: show this outcome with fake numbers, saving nothing. */
    demo?: 'success' | 'levelup' | 'fail';
  };
  Stats: undefined;
  /** DEV ONLY: testing hub, opened from Settings. */
  DevTools: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
