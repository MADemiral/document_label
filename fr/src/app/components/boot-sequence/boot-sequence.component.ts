import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BootService } from '../../service/boot.service.service';
import { AudioService } from '../../service/sound.service.service';


interface BootStep {
  id: number;
  name: string;
  message: string;
  duration: number;
  completed: boolean;
  progress: number;
  type: string;
}

interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  networkStatus: string;
}

@Component({
  selector: 'app-boot-sequence',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './boot-sequence.component.html',
  styleUrls: ['./boot-sequence.component.scss']
})
export class BootSequenceComponent implements OnInit, OnDestroy {
  
  // Signals for reactive state
  isBooting = signal<boolean>(true);
  currentStep = signal<number>(0);
  totalProgress = signal<number>(0);
  bootCompleted = signal<boolean>(false);

  // Boot steps configuration
  bootSteps: BootStep[] = [
    { id: 1, name: 'BIOS', message: 'Initializing Basic Input/Output System', duration: 800, completed: false, progress: 0, type: 'success' },
    { id: 2, name: 'MEMORY', message: 'Testing system memory banks', duration: 600, completed: false, progress: 0, type: 'success' },
    { id: 3, name: 'STORAGE', message: 'Detecting storage devices', duration: 700, completed: false, progress: 0, type: 'success' },
    { id: 4, name: 'NETWORK', message: 'Configuring network interfaces', duration: 900, completed: false, progress: 0, type: 'success' },
    { id: 5, name: 'DRIVERS', message: 'Loading device drivers', duration: 1000, completed: false, progress: 0, type: 'success' },
    { id: 6, name: 'SECURITY', message: 'Initializing security protocols', duration: 500, completed: false, progress: 0, type: 'success' },
    { id: 7, name: 'KERNEL', message: 'Starting system kernel', duration: 400, completed: false, progress: 0, type: 'success' }
  ];

  // System statistics
  systemStats: SystemStats = {
    cpuUsage: 0,
    memoryUsage: 0,
    networkStatus: 'DISCONNECTED'
  };

  // ASCII Logo
  asciiLogo = `
██████╗  ██████╗  ██████╗    ██╗      █████╗ ██████╗ ███████╗██╗     
██╔══██╗██╔═══██╗██╔════╝    ██║     ██╔══██╗██╔══██╗██╔════╝██║     
██║  ██║██║   ██║██║         ██║     ███████║██████╔╝█████╗  ██║     
██║  ██║██║   ██║██║         ██║     ██╔══██║██╔══██╗██╔══╝  ██║     
██████╔╝╚██████╔╝╚██████╗    ███████╗██║  ██║██████╔╝███████╗███████╗
╚═════╝  ╚═════╝  ╚═════╝    ╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝
                                                                     
               SYSTEM v3.14 - BUILD 20250119.1337                   
`;

  private bootTimer?: number;
  private stepTimers: any[] = [];

  // Retro animation properties
  private loadingDotsCount = 0;
  private blinkingCursorVisible = true;

  constructor(
    private router: Router,
    private bootService: BootService,
    private audioService: AudioService // Ekleyin
  ) {}

  ngOnInit() {
    this.startRetroAnimations();
    this.startBootSequence();
  }

  ngOnDestroy() {
    this.clearTimers();
  }

  /**
   * Start the boot sequence animation with sounds
   */
  private startBootSequence(): void {
    this.isBooting.set(true);
    this.currentStep.set(0);
    this.totalProgress.set(0);
    this.bootCompleted.set(false);

    // Play boot start sound
    this.audioService.playSound('bootStart');

    // Initialize system stats
    this.updateSystemStats();

    // Start boot steps with sound
    this.executeBootStepsWithSound();
  }

  /**
   * Execute boot steps with sound effects
   */
  private executeBootStepsWithSound(): void {
    let totalDuration = 0;

    this.bootSteps.forEach((step, index) => {
      const timer = setTimeout(() => {
        this.currentStep.set(index + 1);
        
        // Step başlangıç beep'i - Çok kısa (100ms)
        this.audioService.playBeep(1000 + (index * 100), 100);
        
        this.executeStepWithSound(step, index);
        
        // Update total progress
        const progress = ((index + 1) / this.bootSteps.length) * 100;
        this.totalProgress.set(progress);

        // If last step, complete boot sequence
        if (index === this.bootSteps.length - 1) {
          setTimeout(() => {
            this.completeBootSequenceWithSound();
          }, step.duration);
        }
      }, totalDuration);

      this.stepTimers.push(timer);
      totalDuration += step.duration;
    });
  }

  /**
   * Execute a single boot step with sound
   */
  private executeStepWithSound(step: BootStep, index: number): void {
    step.completed = false;
    step.progress = 0;

    // Typing sound'ları daha seyrek çal (her 200ms'de bir)
    const typingInterval = setInterval(() => {
      if (step.progress < 100) {
        // %30 ihtimalle typing sesi çal (çok sık olmasın)
        if (Math.random() < 0.3) {
          this.audioService.playTypingSound();
        }
      }
    }, 200); // 200ms aralık

    // Simulate step progress with sound feedback
    const progressInterval = setInterval(() => {
      step.progress += Math.random() * 15 + 5;
      
      if (step.progress >= 100) {
        step.progress = 100;
        step.completed = true;
        clearInterval(progressInterval);
        clearInterval(typingInterval);
        
        // Step complete sesi (0.3 saniye)
        this.audioService.playSound('stepComplete');
        
        // Update system stats based on step
        this.updateSystemStatsForStep(step.name);
      }
    }, step.duration / 10);
  }

  /**
   * Update system statistics
   */
  private updateSystemStats(): void {
    // Simulate random system stats
    setInterval(() => {
      if (this.isBooting()) {
        this.systemStats.cpuUsage = Math.random() * 60 + 20;
        this.systemStats.memoryUsage = Math.random() * 80 + 10;
      }
    }, 500);
  }

  /**
   * Update system stats for specific step
   */
  private updateSystemStatsForStep(stepName: string): void {
    switch (stepName) {
      case 'NETWORK':
        this.systemStats.networkStatus = 'CONNECTED';
        break;
      case 'MEMORY':
        this.systemStats.memoryUsage = 75.8;
        break;
      case 'SERVICES':
        this.systemStats.cpuUsage = 45.2;
        break;
    }
  }

  /**
   * Complete the boot sequence with sound
   */
  private completeBootSequenceWithSound(): void {
    this.bootCompleted.set(true);
    this.totalProgress.set(100);
    
    // Play boot complete sound
    this.audioService.playSound('bootComplete');
    
    // Mark boot as completed in service
    this.bootService.completeBootSequence();

    // Navigate to main app after completion animation
    setTimeout(() => {
      this.router.navigate(['/app']);
    }, 2000);
  }

  /**
   * Skip boot sequence with sound
   */
  skipBootSequence(): void {
    // Skip sesi (0.3 saniye)
    this.audioService.playSkipSound();
    this.clearTimers();
    this.bootService.completeBootSequence();
    this.router.navigate(['/app']);
  }

  // Retro helper methods
  getLoadingDots(): string {
    return '.'.repeat((this.loadingDotsCount % 4) + 1);
  }

  getProgressBar(progress: number): string {
    const barLength = 20;
    const filled = Math.floor((progress / 100) * barLength);
    const empty = barLength - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  getBlinkingCursor(): string {
    return this.blinkingCursorVisible ? '_' : ' ';
  }

  // Retro terminal step message
  getStepMessage(step: BootStep): string {
    if (step.completed) {
      return step.message;
    } else if (step.progress > 0) {
      return `${step.message} ${step.progress.toFixed(0)}%`;
    } else {
      return step.message;
    }
  }

  // Start retro animations
  private startRetroAnimations(): void {
    // Loading dots animation
    setInterval(() => {
      this.loadingDotsCount++;
    }, 500);

    // Blinking cursor animation
    setInterval(() => {
      this.blinkingCursorVisible = !this.blinkingCursorVisible;
    }, 1000);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
    }
    
    this.stepTimers.forEach(timer => clearTimeout(timer));
    this.stepTimers = [];
  }

  /**
   * Start boot sequence with user interaction for audio
   */
  async startBootSequenceWithAudio(): Promise<void> {
    try {
      // AudioContext'i resume et (browser kısıtlaması için)
      this.audioService.resumeAudioContext();
      this.startBootSequence();
    } catch (error) {
      console.log('Audio initialization failed, continuing without sound');
      this.startBootSequence();
    }
  }
}