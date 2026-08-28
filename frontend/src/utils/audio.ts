import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Sound synthesizer using Web Audio API on web, and Haptics on mobile
class SoundManager {
  private audioCtx: any = null;
  private soundEnabled: boolean = true;
  private vibrationEnabled: boolean = true;

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      } catch (e) {
        console.log('Web Audio not supported');
      }
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  setVibrationEnabled(enabled: boolean) {
    this.vibrationEnabled = enabled;
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
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      
      gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // ignore audio errors
    }
  }

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
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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