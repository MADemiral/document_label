import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DoomConfig {
  documentTitle: string;
  documentId: string;
  isProcessing: boolean;
}

@Component({
  selector: 'app-doom-ready',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doom-captcha.component.html',
  styleUrls: ['./doom-captcha.component.scss']
})
export class DoomReadyComponent implements OnInit, OnDestroy {
  @Input() isVisible: boolean = false;
  @Input() config: DoomConfig = {
    documentTitle: 'Unknown Document',
    documentId: 'unknown',
    isProcessing: false
  };

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  // ⚡ Simple Game State
  enemiesKilled = 0;
  gameActive = false;
  gameCompleted = false;
  statusMessage = 'Loading DOOM...';

  ngOnInit(): void {
    console.log('🎮 DOOM Component initialized');
    this.setupMessageListener();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * 📨 Listen to DOOM iframe messages
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      // Only accept from same origin
      if (event.origin !== window.location.origin) return;
      
      const message = event.data;
      if (!message?.type || message.origin !== 'doom-iframe') return;

      console.log('📨 Received from DOOM:', message);

      switch (message.type) {
        case 'doom-player-born':
          this.gameActive = true;
          this.statusMessage = 'Use arrow keys + spacebar to shoot!';
          break;

        case 'doom-enemy-killed':
          this.onEnemyKilled();
          break;

        case 'doom-player-death':
          this.onPlayerDeath();
          break;
      }
    });
  }

  /**
   * 👹 Handle enemy killed
   */
  private onEnemyKilled(): void {
    this.enemiesKilled++;
    console.log(`👹 Enemy killed! Total: ${this.enemiesKilled}/3`);

    // Update status based on kills
    if (this.enemiesKilled === 1) {
      this.statusMessage = '🔥 First kill! Keep going...';
    } else if (this.enemiesKilled === 2) {
      this.statusMessage = '💀 Two down! One more to go...';
    } else if (this.enemiesKilled >= 3) {
      this.statusMessage = '🎉 CAPTCHA SOLVED! Mission complete!';
      this.gameCompleted = true;
    }
  }

  /**
   * 💀 Handle player death
   */
  private onPlayerDeath(): void {
    console.log('💀 Player died - resetting kills');
    this.enemiesKilled = 0;
    this.gameCompleted = false;
    this.statusMessage = '💀 You died! Try again...';
  }

  /**
   * ✅ Confirm deletion
   */
  onConfirm(): void {
    if (!this.gameCompleted || this.enemiesKilled < 3) {
      console.log('⚠️ Cannot confirm - complete the game first');
      return;
    }
    
    console.log('✅ DOOM captcha confirmed');
    this.confirmed.emit();
  }

  /**
   * ❌ Cancel
   */
  onCancel(): void {
    console.log('❌ DOOM captcha cancelled');
    this.cancelled.emit();
    this.onClose();
  }

  /**
   * 🚪 Close modal
   */
  onClose(): void {
    this.enemiesKilled = 0;
    this.gameCompleted = false;
    this.gameActive = false;
    this.statusMessage = 'Loading DOOM...';
    this.closed.emit();
  }

  /**
   * 🖱️ Backdrop click
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  /**
   * 🧹 Cleanup
   */
  private cleanup(): void {
    console.log('🧹 DOOM component cleanup');
  }
}