// file-view.component.ts - document görüntüleyici

import { Component, Input, Output, EventEmitter, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../service/api.service';
//import { ApiService } from '../../service/api.service';

// Backend model'e uygun document interface
export interface DocumentViewData {
  document_id: number;
  title?: string; // Yeni eklenen başlık alanı
  content: string;
  summary: string;
  labels: LabelViewData[];
  uploaded_at?: string;
  created_at?: string;
  // Display için ek alanlar
  file_type?: string;
  size?: number;
  score?: number;
  search_type?: string;
}

export interface LabelViewData {
  label_id: number;
  label_name: string;
}

@Component({
  selector: 'app-file-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-view.component.html',
  styleUrls: ['./file-view.component.scss']
})
export class FileViewComponent implements OnInit {
  @Input({ required: true }) document!: DocumentViewData;
  @Input() isModal = false;
  @Input() showActions = true;
  @Input() searchQuery = '';
  
  @Output() closeView = new EventEmitter<void>();
  @Output() editDocument = new EventEmitter<DocumentViewData>();
  @Output() deleteDocument = new EventEmitter<DocumentViewData>();
  @Output() downloadDocument = new EventEmitter<DocumentViewData>();
  @Output() shareDocument = new EventEmitter<DocumentViewData>();
  @Output() labelClick = new EventEmitter<string>();

  // Service injection
 private apiService = inject(ApiService);

  // Signals for UI state
  isLoading = signal(false);
  showFullContent = signal(false);
  activeTab = signal<'content' | 'summary' | 'metadata'>('content');
  isEditing = signal(false);
  editableLabels = signal<string[]>([]);
  newLabelInput = signal('');
  saveMessage = signal('');

  // Computed properties
  documentTitle = computed(() => {
    if (this.document?.title) {
      return this.document.title;
    }
    
    if (this.document?.summary) {
      return this.truncateText(this.document.summary, 60);
    }
    
    if (this.document?.content) {
      return this.truncateText(this.document.content, 60);
    }
    
    return `Document ${this.document?.document_id || ''}`;
  });

  contentStats = computed(() => {
    const content = this.document?.content || '';
    return {
      characters: content.length,
      words: content.trim() ? content.trim().split(/\s+/).length : 0,
      paragraphs: content.split('\n\n').length,
      lines: content.split('\n').length
    };
  });

  highlightedContent = computed(() => {
    let content = this.document?.content || '';
    
    // Highlight search query if provided
    if (this.searchQuery.trim()) {
      const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
      content = content.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    return content;
  });

  highlightedSummary = computed(() => {
    let summary = this.document?.summary || '';
    
    // Highlight search query in summary
    if (this.searchQuery.trim() && summary) {
      const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
      summary = summary.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    return summary;
  });

  formattedCreatedDate = computed(() => {
    if (!this.document?.created_at) return 'Bilinmiyor';
    
    try {
      return new Date(this.document.created_at).toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Geçersiz tarih';
    }
  });

  formattedUploadDate = computed(() => {
    if (!this.document?.uploaded_at) return 'Bilinmiyor';
    
    try {
      return new Date(this.document.uploaded_at).toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Geçersiz tarih';
    }
  });

  ngOnInit() {
    if (this.document?.labels) {
      this.editableLabels.set(this.document.labels.map(label => label.label_name));
    }
  }

  // ==================== TAB METHODS ====================

  setActiveTab(tab: 'content' | 'summary' | 'metadata'): void {
    this.activeTab.set(tab);
  }

  // ==================== CONTENT METHODS ====================

  toggleFullContent(): void {
    this.showFullContent.update(show => !show);
  }

  copyContent(): void {
    const content = this.document?.content || '';
    
    navigator.clipboard.writeText(content).then(() => {
      this.showTemporaryMessage('✅ İçerik panoya kopyalandı!');
    }).catch(() => {
      this.showTemporaryMessage('❌ Kopyalama başarısız!');
    });
  }

  copyDocumentLink(): void {
    const url = `${window.location.origin}/document/${this.document?.document_id}`;
    
    navigator.clipboard.writeText(url).then(() => {
      this.showTemporaryMessage('✅ Döküman linki kopyalandı!');
    }).catch(() => {
      this.showTemporaryMessage('❌ Link kopyalama başarısız!');
    });
  }

  // ==================== LABEL EDITING ====================

  startEditingLabels(): void {
    this.isEditing.set(true);
    this.editableLabels.set(this.document.labels.map(label => label.label_name));
  }

  cancelEditingLabels(): void {
    this.isEditing.set(false);
    this.editableLabels.set(this.document.labels.map(label => label.label_name));
    this.newLabelInput.set('');
  }

  addLabel(): void {
    const newLabel = this.newLabelInput().trim();
    if (newLabel && !this.editableLabels().includes(newLabel)) {
      this.editableLabels.update(labels => [...labels, newLabel]);
      this.newLabelInput.set('');
    }
  }

  removeLabel(index: number): void {
    this.editableLabels.update(labels => labels.filter((_, i) => i !== index));
  }

  onLabelInputKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addLabel();
    }
  }

  onLabelClick(label: string): void {
    this.labelClick.emit(label);
  }

  async saveLabels(): Promise<void> {
    // TODO: API call to update document labels
    this.isLoading.set(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update document labels
      this.document.labels = this.editableLabels().map((labelName, idx) => ({
        label_id: idx, // You may want to generate or fetch the correct id
        label_name: labelName
      }));
      this.isEditing.set(false);
      this.showTemporaryMessage('✅ Etiketler güncellendi!');
      
    } catch (error) {
      this.showTemporaryMessage('❌ Etiket güncelleme başarısız!');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ==================== ACTION METHODS ====================

  onCloseView(): void {
    this.closeView.emit();
  }

  onEditDocument(): void {
    this.editDocument.emit(this.document);
  }

  /**
   * Delete document - SADECE EVENT EMİT ET
   */
  onDeleteDocument(): void {
    console.log('🗑️ Delete button clicked, emitting to parent...');
    
    // Parent component'e emit et - confirmation orada olacak
    this.deleteDocument.emit(this.document);
  }

  onDownloadDocument(): void {
    this.downloadDocument.emit(this.document);
  }

  onShareDocument(): void {
    this.shareDocument.emit(this.document);
  }

  // ==================== UTILITY METHODS ====================

  getFileIcon(): string {
    const fileType = this.document?.file_type || 'txt';
    
    switch (fileType.toLowerCase()) {
      case 'pdf': return 'fas fa-file-pdf text-red-500';
      case 'doc':
      case 'docx': return 'fas fa-file-word text-blue-500';
      case 'xls':
      case 'xlsx': return 'fas fa-file-excel text-green-500';
      case 'ppt':
      case 'pptx': return 'fas fa-file-powerpoint text-orange-500';
      case 'txt': return 'fas fa-file-alt text-gray-500';
      case 'html': return 'fas fa-file-code text-orange-400';
      default: return 'fas fa-file text-gray-400';
    }
  }

  getScoreClass(): string {
    if (!this.document?.score) return '';
    
    const score = this.document.score;
    if (score >= 0.8) return 'score-high';
    if (score >= 0.6) return 'score-medium';
    return 'score-low';
  }

  getSearchTypeText(): string {
    const typeMap: { [key: string]: string } = {
      'semantic': 'Anlamsal Arama',
      'label': 'Etiket Araması',
      'both': 'Karma Arama'
    };
    
    return typeMap[this.document?.search_type || ''] || '';
  }

  formatSize(size?: number): string {
    if (!size) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let sizeValue = size;
    
    while (sizeValue >= 1024 && unitIndex < units.length - 1) {
      sizeValue /= 1024;
      unitIndex++;
    }
    
    return `${sizeValue.toFixed(1)} ${units[unitIndex]}`;
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength 
      ? text.substring(0, maxLength) + '...'
      : text;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private showTemporaryMessage(message: string): void {
    this.saveMessage.set(message);
    setTimeout(() => {
      this.saveMessage.set('');
    }, 3000);
  }

  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.editableLabels()) !== JSON.stringify(this.document.labels);
  }

  onNewLabelInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target && target.value !== undefined) {
      this.newLabelInput.set(target.value);
    }
  }
}
