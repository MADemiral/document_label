import { Injectable, signal } from '@angular/core';

export interface DoomCaptchaResult {
  completed: boolean;
  kills?: number;
  deaths?: number;
  score?: number;
  timeElapsed?: number;
}

export interface DoomGameStats {
  kills: number;
  deaths: number;
  score: number;
  timeElapsed: number;
}

@Injectable({
  providedIn: 'root'
})
export class DoomCaptchaResultService {
  // 🎮 Game State Signals
  private gameActive = signal<boolean>(false);
  private gameCompleted = signal<boolean>(false);
  private currentStats = signal<DoomGameStats>({
    kills: 0,
    deaths: 0,
    score: 0,
    timeElapsed: Date.now()
  });
  
  // Completion callback
  private completionCallback: ((result: DoomCaptchaResult) => void) | null = null;
  
  constructor() {
    console.log('🎮 DOOM Captcha Service initialized');
  }
  
  /**
   * Get game state signals - READ ONLY
   */
  getGameActive = () => this.gameActive.asReadonly();
  getGameCompleted = () => this.gameCompleted.asReadonly();
  getGameStats = () => this.currentStats.asReadonly();
  
  /**
   * Initialize DOOM listeners
   */
  initDoomListeners(): void {
    console.log('🎮 Initializing DOOM listeners...');
    
    window.addEventListener('message', (event) => {
      // ⚡ FIX: Filter out non-DOOM messages
      if (!this.isDoomMessage(event.data)) {
        return; // Ignore MetaMask, ads, etc.
      }
      
      console.log('📥 Received DOOM message:', event.data);
      
      // Handle DOOM message types
      switch (event.data.type) {
        case 'doom-engine-loaded':
          console.log('🎮 DOOM engine loaded');
          break;
          
        case 'doom-game-started':
          console.log('🎮 DOOM game started');
          this.gameActive.set(true);
          this.gameCompleted.set(false);
          break;
          
        case 'doom-enemy-killed':
          console.log('👹 Enemy killed:', event.data.kills);
          this.handleEnemyKilled(event.data.kills);
          break;
          
        case 'doom-player-died':
          console.log('💀 Player died');
          this.handlePlayerDeath();
          break;
          
        case 'doom-captcha-complete':
          console.log('🎉 DOOM captcha completed!');
          this.handleGameCompletion(event.data.stats);
          break;
      }
    });
  }
  
  /**
   * ⚡ NEW: Check if message is from DOOM
   */
  private isDoomMessage(data: any): boolean {
    // Must be an object with type
    if (!data || typeof data !== 'object' || !data.type) {
      return false;
    }
    
    // Must have DOOM-related type
    const doomTypes = [
      'doom-engine-loaded',
      'doom-game-started', 
      'doom-enemy-killed',
      'doom-player-died',
      'doom-captcha-complete'
    ];
    
    if (!doomTypes.includes(data.type)) {
      return false;
    }
    
    // Must have origin marker (from iframe)
    if (data.origin !== 'doom-iframe') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Handle enemy killed
   */
  private handleEnemyKilled(killCount: number): void {
    this.currentStats.set({
      ...this.currentStats(),
      kills: killCount,
      score: killCount * 100
    });
    
    // Check for completion
    if (killCount >= 3) {
      this.handleGameCompletion({
        completed: true,
        kills: killCount,
        deaths: this.currentStats().deaths,
        score: killCount * 100,
        timeElapsed: Math.floor((Date.now() - this.currentStats().timeElapsed) / 1000)
      });
    }
  }
  
  /**
   * Handle player death
   */
  private handlePlayerDeath(): void {
    this.currentStats.set({
      ...this.currentStats(),
      deaths: this.currentStats().deaths + 1,
      kills: 0, // Reset kills on death
      score: 0
    });
  }
  
  /**
   * Handle game completion
   */
  private handleGameCompletion(result: DoomCaptchaResult): void {
    console.log('🎉 Game completed with result:', result);
    
    this.gameCompleted.set(true);
    this.gameActive.set(false);
    
    // Update final stats
    this.currentStats.set({
      kills: result.kills || 0,
      deaths: result.deaths || 0,
      score: result.score || 0,
      timeElapsed: result.timeElapsed || 0
    });
    
    // Call completion callback
    if (this.completionCallback) {
      this.completionCallback(result);
    }
  }
  
  /**
   * Set completion callback
   */
  setCompletionCallback(callback: (result: DoomCaptchaResult) => void): void {
    this.completionCallback = callback;
  }
  
  /**
   * Reset game state
   */
  resetGame(): void {
    console.log('🔄 Resetting game state');
    this.gameActive.set(false);
    this.gameCompleted.set(false);
    this.currentStats.set({
      kills: 0,
      deaths: 0,
      score: 0,
      timeElapsed: Date.now()
    });
  }
  
  /**
   * Cleanup
   */
  cleanup(): void {
    console.log('🧹 Cleaning up DOOM service');
    this.resetGame();
    this.completionCallback = null;
  }
}