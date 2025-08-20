import { Component, Input, Output, EventEmitter, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  showDetails?: boolean;
  details?: { [key: string]: any };
  isProcessing?: boolean;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent implements OnInit, OnDestroy {
  
  // Input properties
  @Input() isVisible = false;
  @Input() config: ConfirmationConfig = {
    title: 'Confirm Action',
    message: 'Are you sure?',
    confirmText: 'CONFIRM',
    cancelText: 'CANCEL',
    type: 'warning'
  };
  
  // Output events
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  
  // Internal signals
  private originalBodyOverflow = '';
  
  ngOnInit(): void {
    // Listen for escape key globally
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.restoreBodyScroll();
  }
  
  /**
   * Handle keyboard events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isVisible) return;
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.onCancel();
        break;
      case 'Enter':
        event.preventDefault();
        this.onConfirm();
        break;
    }
  }
  
  /**
   * Handle backdrop click
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }
  
  /**
   * Handle confirm button click
   */
  onConfirm(): void {
    if (this.config.isProcessing) return;
    
    console.log('✅ Dialog confirmed');
    this.confirmed.emit();
  }
  
  /**
   * Handle cancel button click
   */
  onCancel(): void {
    if (this.config.isProcessing) return;
    
    console.log('❌ Dialog cancelled');
    this.cancelled.emit();
    this.onClose();
  }
  
  /**
   * Handle close dialog
   */
  onClose(): void {
    this.restoreBodyScroll();
    this.closed.emit();
  }
  
  /**
   * Prevent body scroll when dialog is open
   */
  private preventBodyScroll(): void {
    this.originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * Restore body scroll
   */
  private restoreBodyScroll(): void {
    document.body.style.overflow = this.originalBodyOverflow || 'auto';
  }
  
  /**
   * Watch for visibility changes
   */
  ngOnChanges(): void {
    if (this.isVisible) {
      this.preventBodyScroll();
    } else {
      this.restoreBodyScroll();
    }
  }
  
  /**
   * Get dialog type class
   */
  getTypeClass(): string {
    return `dialog-${this.config.type || 'warning'}`;
  }
  
  /**
   * Get type icon
   */
  getTypeIcon(): string {
    const icons = {
      danger: 'fas fa-skull-crossbones',
      warning: 'fas fa-exclamation-triangle', 
      info: 'fas fa-info-circle',
      success: 'fas fa-check-circle'
    };
    return icons[this.config.type || 'warning'];
  }
  
  /**
   * Get type color
   */
  getTypeColor(): string {
    const colors = {
      danger: '#ff5577',
      warning: '#ffcc44',
      info: '#55ccff',
      success: '#00ff88'
    };
    return colors[this.config.type || 'warning'];
  }
  
  /**
   * Get detail entries for display
   */
  getDetailEntries(): Array<{key: string, value: any}> {
    if (!this.config.details) return [];
    
    return Object.entries(this.config.details).map(([key, value]) => ({
      key: this.formatDetailKey(key),
      value: this.formatDetailValue(value)
    }));
  }
  
  /**
   * Format detail key for display
   */
  private formatDetailKey(key: string): string {
    // Convert camelCase to readable format
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  /**
   * Format detail value for display
   */
  private formatDetailValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
