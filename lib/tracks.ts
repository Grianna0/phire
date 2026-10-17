import { TRACK_ORDER, type TrackId } from '../store/useAppStore';

// Background music. To use your own music, replace these files keeping the same names.
// (Metro bundles them at build time, so a file must exist for each entry; the placeholders are silent.)
export const TRACKS: Record<TrackId, { label: string; source: number }> = {
  melody1: { label: 'Melody 1', source: require('../assets/audio/melody1.mp3') },
  melody2: { label: 'Melody 2', source: require('../assets/audio/melody2.mp3') },
  melody3: { label: 'Melody 3', source: require('../assets/audio/melody3.mp3') },
};

export const TRACK_IDS = TRACK_ORDER;
