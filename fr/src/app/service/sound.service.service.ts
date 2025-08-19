import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext?: AudioContext;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.log('Audio context not supported:', error);
    }
  }

  // Boot başlangıç sesi - Uzun ve etkileyici
  playSound(soundName: string): void {
    switch (soundName) {
      case 'bootStart':
        this.playBootStartSequence();
        break;
      case 'stepComplete':
        this.playStepCompleteSound();
        break;
      case 'bootComplete':
        this.playBootCompleteSequence();
        break;
      default:
        this.playBeep(800, 200);
    }
  }

  // Boot başlangıç ses dizisi (3-4 saniye)
  private playBootStartSequence(): void {
    // Power on sound - Düşük frekanstan yükseğe
    this.createTone(200, 0.5, 0.15, 'sawtooth'); // Deep power on
    
    setTimeout(() => {
      // System beep sequence
      this.createTone(800, 0.2, 0.1, 'square');
    }, 600);
    
    setTimeout(() => {
      this.createTone(1000, 0.2, 0.1, 'square');
    }, 900);
    
    setTimeout(() => {
      this.createTone(1200, 0.3, 0.1, 'square');
    }, 1200);
  }

  // Step tamamlanma sesi - Kısa ve net (0.3-0.5 saniye)
  private playStepCompleteSound(): void {
    // İki tonlu başarı sesi
    this.createTone(600, 0.15, 0.08, 'square');
    setTimeout(() => {
      this.createTone(900, 0.15, 0.08, 'square');
    }, 150);
  }

  // Boot tamamlanma ses dizisi (2-3 saniye)
  private playBootCompleteSequence(): void {
    // Başarı fanfarı
    const notes = [523, 659, 784, 1047, 1319]; // C, E, G, C, E
    const durations = [0.3, 0.3, 0.3, 0.5, 0.8]; // Son nota daha uzun
    
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.createTone(freq, durations[index], 0.12, 'triangle');
      }, index * 200);
    });
  }

  // Step başlangıç beep'i - Çok kısa (0.1 saniye)
  playBeep(frequency: number, duration: number): void {
    this.createTone(frequency, duration / 1000, 0.08, 'square');
  }

  // Typing sesi - Çok kısa (0.05 saniye)
  playTypingSound(): void {
    const frequency = Math.random() * 300 + 400; // 400-700 Hz arası
    this.createTone(frequency, 0.05, 0.03, 'square');
  }

  // Error sesi - Orta uzunluk (0.5-1 saniye)
  playErrorSound(): void {
    this.createTone(200, 0.8, 0.15, 'sawtooth');
  }

  // Skip sesi - Orta uzunluk (0.3 saniye)
  playSkipSound(): void {
    // Düşük frekanslı uyarı sesi
    this.createTone(400, 0.3, 0.1, 'triangle');
  }

  // Ana ses yaratma metodu
  private createTone(
    frequency: number, 
    duration: number, 
    volume: number, 
    waveType: OscillatorType = 'square'
  ): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const filterNode = this.audioContext.createBiquadFilter();

      // Audio routing: oscillator -> filter -> gain -> destination
      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Oscillator ayarları
      oscillator.frequency.value = frequency;
      oscillator.type = waveType;

      // Filter ayarları (retro bilgisayar sesi için)
      filterNode.type = 'lowpass';
      filterNode.frequency.value = frequency * 2;
      filterNode.Q.value = 1;

      // Volume envelope (doğal ses için)
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Decay

      // Oscillator'ı başlat ve durdur
      oscillator.start(now);
      oscillator.stop(now + duration);

    } catch (error) {
      console.log('Audio creation failed:', error);
    }
  }

  // Ses bağlamı durumunu kontrol et
  resumeAudioContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}
