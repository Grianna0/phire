import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useAppStore } from '../store/useAppStore';

// Short one-shot effects. Each has its own player, so they play over the background music
// (audio mode is 'mixWithOthers', see useBackgroundAudio) instead of interrupting it.

export type SoundEffect = 'success' | 'levelup' | 'fail';

const SOURCES: Record<SoundEffect, number> = {
  success: require('../assets/sounds/success.wav'), // soft chime
  levelup: require('../assets/sounds/levelup.wav'), // sparkle
  fail: require('../assets/sounds/fail.wav'),
};

const players: Partial<Record<SoundEffect, AudioPlayer>> = {};

function getPlayer(effect: SoundEffect) {
  if (!players[effect]) {
    const player = createAudioPlayer(SOURCES[effect]);
    player.volume = 0.8;
    players[effect] = player;
  }
  return players[effect];
}

/** Load effects ahead of time so they play instantly later. */
export function preloadSoundEffects() {
  try {
    (Object.keys(SOURCES) as SoundEffect[]).forEach(getPlayer);
  } catch (e) {
    console.warn('[audio] could not preload sound effects', e);
  }
}

export function playSoundEffect(effect: SoundEffect) {
  if (!useAppStore.getState().settings.soundOn) return;
  try {
    const player = getPlayer(effect);
    void player.seekTo(0);
    player.play();
  } catch (e) {
    console.warn(`[audio] could not play ${effect}`, e);
  }
}
