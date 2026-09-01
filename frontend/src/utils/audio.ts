import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Sound synthesizer using Web Audio API on web, and Haptics on mobile.
// Background music is a gentle synthesized loop (no audio assets needed).
class SoundManager {
  private audioCtx: any = null;
  private soundEnabled: boolean = true;
  private vibrationEnabled: boolean = true;
  private musicEnabled: boolean = false;
  private musicTimer: any = null;
  private musicIndex: number = 0;

  // Lazily create the Web Audio context. Creating it inside a user gesture
  // (e.g. toggling a switch, tapping the board) lets it start in 'running' state.
  private ensureAudio(): any | null {
    if (this.audioCtx) return this.audioCtx;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
          // Unlock the context on the first user gesture (browsers block audio otherwise).
          const unlock = () => {
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
              this.audioCtx.resume().catch(() => {});
            }
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
          };
          window.addEventListener('pointerdown', unlock);
          window.addEventListener('keydown', unlock);
          window.addEventListener('touchstart', unlock);
        }
      } catch (e) {
        console.log('Web Audio not supported');
      }
    }
    return this.audioCtx;
  }

  private resume() {
    const ctx = this.ensureAudio();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (enabled) {
      // Create + resume the AudioContext during this user gesture (the toggle)
      // so the browser unlocks audio for subsequent playTone() calls.
      const ctx = this.ensureAudio();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Play a short confirmation tone so the user hears sound immediately.
      this.playTone(440, 'sine', 0.1, 0.15);
    }
  }

  setVibrationEnabled(enabled: boolean) {
    this.vibrationEnabled = enabled;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled) this.startMusic();
    else this.stopMusic();
  }

  private triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'notification') {
    if (!this.vibrationEnabled) return;
    try {
      if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === 'notification') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // ignore
    }
  }

  private playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.08, gainVal: number = 0.15) {
    if (!this.soundEnabled) return;
    const ctx = this.ensureAudio();
    if (!ctx) return;
    this.resume();
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // ignore audio errors
    }
  }

  // ---- Background music (synthesized ambient loop) ----

  startMusic() {
    if (!this.musicEnabled) return;
    const ctx = this.ensureAudio();
    if (!ctx) return;
    this.resume();
    this.stopMusicLoop();
    this.musicIndex = 0;
    this.scheduleMusicBar();
  }

  stopMusic() {
    this.musicEnabled = false;
    this.stopMusicLoop();
  }

  private stopMusicLoop() {
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // Soft chord progression: Am - F - G - C
  private scheduleMusicBar() {
    if (!this.musicEnabled) return;
    const ctx = this.ensureAudio();
    if (!ctx) return;

    // Wait for the context to be unlocked (browser needs a user gesture).
    if (ctx.state === 'suspended') {
      this.musicTimer = setTimeout(() => this.scheduleMusicBar(), 500);
      return;
    }

    const chords = [
      [220.0, 261.63, 329.63],   // Am
      [174.61, 220.0, 261.63],   // F
      [196.0, 246.94, 293.66],   // G
      [130.81, 164.81, 196.0],   // C
    ];
    const chord = chords[this.musicIndex % chords.length];
    const now = ctx.currentTime + 0.05;

    // Low bass note under the chord
    this.playMusicNote(chord[0] / 2, now, 2.0, 0.05);

    // Gentle arpeggio across the chord tones
    chord.forEach((freq, i) => {
      this.playMusicNote(freq, now + i * 0.32, 1.1, 0.035);
      this.playMusicNote(freq * 2, now + i * 0.32 + 0.16, 0.8, 0.02);
    });

    this.musicIndex++;
    this.musicTimer = setTimeout(() => this.scheduleMusicBar(), 1280);
  }

  private playMusicNote(freq: number, startTime: number, duration: number, gainVal: number) {
    const ctx = this.audioCtx;
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainVal, startTime + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    } catch (e) {
      // ignore audio errors
    }
  }

  // ---- Game sound effects ----

  playMove() {
    this.triggerHaptic('light');
    this.playTone(320, 'sine', 0.06, 0.2);
  }

  playCapture() {
    this.triggerHaptic('medium');
    this.playTone(480, 'triangle', 0.08, 0.25);
    setTimeout(() => this.playTone(340, 'triangle', 0.08, 0.2), 40);
  }

  playCheck() {
    this.triggerHaptic('heavy');
    this.playTone(720, 'sine', 0.12, 0.3);
    setTimeout(() => this.playTone(600, 'sine', 0.15, 0.3), 80);
  }

  playWin() {
    this.triggerHaptic('notification');
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.18, 0.25), idx * 100);
    });
  }

  playLoss() {
    this.triggerHaptic('heavy');
    const notes = [440, 392, 349, 293]; // A4, G4, F4, D4
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.2, 0.15), idx * 120);
    });
  }
}

export const soundManager = new SoundManager();
