import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useAppStore } from '../store/useAppStore';
import { TRACKS } from './tracks';

const VOLUME = 0.5;

/**
 * Global looping background music. Call once near the app root.
 * - One player at a time: switching tracks removes the old player before the new one starts.
 * - Plays only while sound is on and the app is in the foreground.
 * - Never throws: a missing/broken file just logs a warning.
 */
export function useBackgroundAudio() {
  const soundOn = useAppStore((s) => s.settings.soundOn);
  const track = useAppStore((s) => s.settings.currentTrack);
  const playerRef = useRef<AudioPlayer | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  // Mix with the sound-effect players and with other apps; respect the silent switch.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch((e) =>
      console.warn('[audio] could not set audio mode', e),
    );
  }, []);

  // Foreground/background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setAppActive(next === 'active'));
    return () => sub.remove();
  }, []);

  // (Re)load the player whenever the track changes; free the old one first.
  useEffect(() => {
    let player: AudioPlayer | null = null;
    try {
      player = createAudioPlayer(TRACKS[track].source);
      player.loop = true;
      player.volume = VOLUME;
      playerRef.current = player;
    } catch (e) {
      console.warn(`[audio] could not load ${track}`, e);
    }
    return () => {
      if (playerRef.current === player) playerRef.current = null;
      try {
        player?.pause();
        player?.remove();
      } catch (e) {
        console.warn(`[audio] could not release ${track}`, e);
      }
    };
  }, [track]);

  // Play or pause. Runs after the load effect above, so a new track starts right away.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (soundOn && appActive) player.play();
      else player.pause();
    } catch (e) {
      console.warn('[audio] play/pause failed', e);
    }
  }, [soundOn, appActive, track]);

  // Web: browsers block audio until the first user interaction, so retry on the first tap.
  useEffect(() => {
    if (Platform.OS !== 'web' || !soundOn) return;
    const retry = () => {
      const player = playerRef.current;
      if (player && !player.playing && AppState.currentState === 'active') {
        try {
          player.play();
        } catch {
          // Still blocked; the next tap will try again.
        }
      }
    };
    document.addEventListener('pointerdown', retry);
    return () => document.removeEventListener('pointerdown', retry);
  }, [soundOn, track]);
}

/** Renders nothing; mounts the background music for the whole app. */
export function BackgroundAudio() {
  useBackgroundAudio();
  return null;
}
