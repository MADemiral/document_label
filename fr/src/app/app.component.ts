import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { DocumentAnalysisComponent } from './components/document-analysis/document-analysis.component';
import { FileSearchComponent } from './components/file-search/file-search.component';
import { ConfirmDocumentResponse, DocumentAnalysisResult } from './interfaces/document-analysis/document-analysis-response.interface';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    FileUploadComponent, 
    DocumentAnalysisComponent,
    FileSearchComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild(DocumentAnalysisComponent) documentAnalysisComponent!: DocumentAnalysisComponent;
  @ViewChild(FileSearchComponent) fileSearchComponent!: FileSearchComponent;
  
  title = 'Document Label Service';

  // UI state signals
  private searchModeSignal = signal(false);
  currentAnalysis = signal<DocumentAnalysisResult | null>(null);
  originalContent = signal<string>('');
  searchResults = signal<any[]>([]);
  uploadedFile = signal<File | null>(null); // Current uploaded file


  // Computed properties
  isSearchMode = () => this.searchModeSignal();

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
      this.uploadedFile.set(null); // Clear uploaded file
    }
  }

  // ==================== UPLOAD MODE HANDLERS ====================

  /**
   * Handle file uploaded event from file-upload component
   */
  onFileUploaded(file: File): void {
    console.log('📁 File uploaded in app:', file);
    this.uploadedFile.set(file); // Store the uploaded file
  }

  /**
   * Handle analysis completion from file upload
   */
  onAnalysisCompleted(event: {result: DocumentAnalysisResult, content: string}): void {
    console.log('📊 Analysis completed:', event);
    this.currentAnalysis.set(event.result);
    this.originalContent.set(event.content);
    
    // File is already stored in uploadedFile signal from onFileUploaded
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
    this.uploadedFile.set(null); // Clear uploaded file
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
    this.uploadedFile.set(null); // Clear file on error
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

    // Set as current analysis for viewing (no file for search results)
    this.currentAnalysis.set(analysisResult);
    this.originalContent.set(result.content || '');
    this.uploadedFile.set(null); // No file for search results
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