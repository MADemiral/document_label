import { Component, Input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ConfirmDocumentResponse } from '../../service/api.service';

import { ConfirmDocumentRequest } from '../../interfaces/document-analysis/document-analysis-request.interface';
import { DocumentAnalysisResult } from '../../interfaces/document-analysis/document-analysis-response.interface';

@Component({
  selector: 'app-document-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-analysis.component.html',
  styleUrls: ['./document-analysis.component.scss']
})
export class DocumentAnalysisComponent implements OnInit {
  @Input() analysisResult!: DocumentAnalysisResult;
  @Input() originalContent: string = ''; // Ana içerik için input ekleyelim
  @Output() labelsUpdated = new EventEmitter<string[]>();
  @Output() saveCompleted = new EventEmitter<ConfirmDocumentResponse>();
  @Output() closeAnalysis = new EventEmitter<void>();
  
  // Service injection
  private apiService = inject(ApiService);
  
  // Signals for reactive state
  editableLabels = signal<string[]>([]);
  newLabelInput = signal<string>('');
  isEditing = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  saveError = signal<string>('');
  saveSuccess = signal<string>('');
  
  ngOnInit() {
    if (this.analysisResult?.labels) {
      this.editableLabels.set([...this.analysisResult.labels]);
    }
  }

  /**
   * Add new label
   */
  addLabel(): void {
    const newLabel = this.newLabelInput().trim();
    if (newLabel && !this.editableLabels().includes(newLabel)) {
      this.editableLabels.update(labels => [...labels, newLabel]);
      this.newLabelInput.set('');
      this.emitLabelsUpdate();
      this.clearMessages();
    }
  }

  /**
   * Remove label
   */
  removeLabel(index: number): void {
    this.editableLabels.update(labels => labels.filter((_, i) => i !== index));
    this.emitLabelsUpdate();
    this.clearMessages();
  }

  /**
   * Handle enter key for adding label
   */
  onLabelInputKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addLabel();
    }
  }

  /**
   * Toggle edit mode
   */
  toggleEditMode(): void {
    this.isEditing.update(editing => !editing);
    if (!this.isEditing()) {
      // Reset to original labels if canceling edit
      this.editableLabels.set([...this.analysisResult.labels]);
      this.clearMessages();
    }
  }

  /**
   * Save analysis to database via API
   */
  async saveAnalysis(): Promise<void> {
    if (!this.originalContent) {
      this.saveError.set('İçerik bulunamadı. Lütfen dosyayı tekrar yükleyin.');
      return;
    }

    this.isSaving.set(true);
    this.clearMessages();

    try {
      // Prepare API request
      const confirmRequest: ConfirmDocumentRequest = {
        title: this.analysisResult.title || 'Untitled Document',
        content: this.originalContent,
        summary: this.analysisResult.summary,
        labels: this.editableLabels(),
        fileName: this.analysisResult.fileName
      };

      console.log('Sending confirm request:', confirmRequest);

      // Call API
      const response = await this.apiService.confirmDocument(confirmRequest);
      
      console.log('API Response:', response);

      // Handle response
      if (response.status === 'saved') {
        this.saveSuccess.set(`Döküman başarıyla kaydedildi! ID: ${response.document_id}`);
        
        // Update analysis result with saved data
       /* const updatedResult: DocumentAnalysisResult = {
          ...this.analysisResult,
          labels: response.labels
        };*/

        // Emit save completed event
        this.saveCompleted.emit(response);

        // Reset edit mode after successful save
        this.isEditing.set(false);

        // Auto close after 3 seconds
        setTimeout(() => {
          this.handleCloseAnalysis();
        }, 3000);

      } else if (response.status === 'duplicate_skipped') {
        this.saveError.set('Benzer bir döküman zaten mevcut. Kaydetme atlandı.');
      }

    } catch (error: any) {
      console.error('Save error:', error);
      
      let errorMessage = 'Kaydetme sırasında hata oluştu.';
      
      if (error.status === 400) {
        errorMessage = 'Geçersiz veri. Lütfen tüm alanları kontrol edin.';
      } else if (error.status === 500) {
        errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      } else if (error.error?.detail) {
        errorMessage = error.error.detail;
      }

      this.saveError.set(errorMessage);
      
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Close analysis panel
   */
  handleCloseAnalysis(): void {
    if (this.isEditing() && !this.saveSuccess()) {
      const hasChanges = JSON.stringify(this.editableLabels()) !== JSON.stringify(this.analysisResult.labels);
      if (hasChanges && !confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinizden emin misiniz?')) {
        return;
      }
    }
    this.closeAnalysis.emit();
  }

  /**
   * Clear success/error messages
   */
  private clearMessages(): void {
    this.saveError.set('');
    this.saveSuccess.set('');
  }

  /**
   * Reset saving state (call this from parent after save)
   */
  resetSavingState(): void {
    this.isSaving.set(false);
    this.isEditing.set(false);
    this.clearMessages();
  }

  /**
   * Emit labels update
   */
  private emitLabelsUpdate(): void {
    this.labelsUpdated.emit(this.editableLabels());
  }

  /**
   * Get label color class
   */
  getLabelColorClass(index: number): string {
    const colors = [
      'label-blue', 'label-green', 'label-purple', 'label-pink',
      'label-indigo', 'label-yellow', 'label-red', 'label-gray'
    ];
    return colors[index % colors.length];
  }

  /**
   * Track by function for performance
   */
  trackByIndex(index: number, _item: string): number {
    return index;
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.editableLabels()) !== JSON.stringify(this.analysisResult.labels);
  }

  /**
   * Get save button text
   */
  getSaveButtonText(): string {
    if (this.isSaving()) {
      return 'Kaydediliyor...';
    }
    return this.hasUnsavedChanges() ? 'Değişiklikleri Kaydet' : 'Kaydet';
  }

  /**
   * Check if save button should be disabled
   */
  isSaveDisabled(): boolean {
    return this.isSaving() || !this.isEditing() || this.editableLabels().length === 0;
  }
}
