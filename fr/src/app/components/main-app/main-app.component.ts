import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // Bu import'u ekleyin
import { BootService } from '../../service/boot.service'; // Bu import'u ekleyin
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { DocumentAnalysisComponent } from '../document-analysis/document-analysis.component';
import { FileSearchComponent } from '../file-search/file-search.component';
import { ConfirmDocumentResponse, DocumentAnalysisResult } from '../../interfaces/document-analysis/document-analysis-response.interface';

@Component({
  selector: 'app-main-app',
  standalone: true,
  imports: [
    CommonModule, 
    FileUploadComponent, 
    DocumentAnalysisComponent,
    FileSearchComponent
  ],
  templateUrl: './main-app.component.html',
  styleUrls: ['./main-app.component.scss']
})
export class MainAppComponent {
  @ViewChild(DocumentAnalysisComponent) documentAnalysisComponent!: DocumentAnalysisComponent;
  @ViewChild(FileSearchComponent) fileSearchComponent!: FileSearchComponent;
  
  title = 'DOCUMENT LABEL SYSTEM v3.14';

  // UI state signals
  private searchModeSignal = signal(false);
  currentAnalysis = signal<DocumentAnalysisResult | null>(null);
  originalContent = signal<string>('');
  searchResults = signal<any[]>([]);
  uploadedFile = signal<File | null>(null);

  // Current time için
  currentTime = new Date().toLocaleTimeString();

  constructor(
    private router: Router,
    private bootService: BootService
  ) {
    // Update time every second
    setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString();
    }, 1000);
  }

  // Computed properties
  isSearchMode = () => this.searchModeSignal();

  // ==================== BOOT SEQUENCE ====================

  /**
   * Reboot the system (go back to boot sequence)
   */
  rebootSystem(): void {
    // Boot sequence'ı force et (sessionStorage'ı temizler)
    this.bootService.forceBootSequence();
    
    // Boot sequence'a git
    this.router.navigate(['/boot']);
  }

  // ==================== MODE MANAGEMENT ====================

  /**
   * Toggle between upload and search modes
   */
  toggleSearchMode(): void {
    this.searchModeSignal.update(current => !current);
      
    // Clear current analysis and search results when switching modes
    if (!this.searchModeSignal()) {
      this.searchResults.set([]);
    } else {
      this.currentAnalysis.set(null);
      this.originalContent.set('');
      this.uploadedFile.set(null);
    }
  }

  // ==================== UPLOAD MODE HANDLERS ====================

  /**
   * Handle file uploaded event
   */
  onFileUploaded(file: File): void {
    console.log('📁 File uploaded in app:', file);
    this.uploadedFile.set(file);
  }

  /**
   * Handle analysis completion from file upload
   */
  onAnalysisCompleted(event: {result: DocumentAnalysisResult, content: string}): void {
    console.log('📊 Analysis completed:', event);
    this.currentAnalysis.set(event.result);
    this.originalContent.set(event.content);
  }

  /**
   * Handle save completion
   */
  onSaveCompleted(response: ConfirmDocumentResponse): void {
    console.log('💾 Document saved successfully:', response);
    this.showSuccessMessage(`Document saved successfully! ID: ${response.document_id}`);
    
    // Clear uploaded file after successful save
    this.uploadedFile.set(null);
  }

  /**
   * Close analysis panel
   */
  onCloseAnalysis(): void {
    this.currentAnalysis.set(null);
    this.originalContent.set('');
    this.uploadedFile.set(null);
  }

  /**
   * Handle labels update
   */
  onLabelsUpdated(labels: string[]): void {
    console.log('🏷️ Labels updated:', labels);
    this.currentAnalysis.update(analysis => 
      analysis ? { ...analysis, labels } : null
    );
  }

  /**
   * Handle upload error
   */
  onUploadError(error: string): void {
    console.error('❌ Upload error:', error);
    this.showErrorMessage(`Dosya yükleme hatası: ${error}`);
    this.uploadedFile.set(null);
  }

  // ==================== SEARCH MODE HANDLERS ====================

  /**
   * Handle search results from file-search component
   */
  onSearchResults(results: any): void {
    console.log('🔍 Search results received:', results);
    this.searchResults.set(results.files || []);
  }

  /**
   * Handle search error
   */
  onSearchError(error: string): void {
    console.error('🔍 Search error:', error);
    this.searchResults.set([]);
  }

  /**
   * Handle search result selection
   */
  onSearchResultSelected(result: any): void {
    console.log('📋 Search result selected:', result);
    
    // Convert search result to analysis format for viewing
    const analysisResult: DocumentAnalysisResult = {
      id: result.id,
      title: result.title || 'Untitled Document',
      fileName: result.name || `Document ${result.id}`,
      labels: result.tags || result.keywords || [],
      summary: result.summary || '',
      analysisDate: new Date(),
      fileMetadata: {
        size: result.size || 0,
        type: result.type || 'document',
        lastModified: new Date(result.lastModified || Date.now())
      }
    };

    // Set as current analysis for viewing
    this.currentAnalysis.set(analysisResult);
    this.originalContent.set(result.content || '');
    this.uploadedFile.set(null);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Track by function for ngFor
   */
  trackByResultId(index: number, result: any): any {
    return result.document_id || index;
  }

  /**
   * Format file size for display
   */
  formatFileSize(size: number): string {
    if (!size) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = size;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    console.log('✅ Success:', message);
    // TODO: Implement proper toast notification
    alert(message);
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    console.error('❌ Error:', message);
    // TODO: Implement proper toast notification
    alert(message);
  }
}
