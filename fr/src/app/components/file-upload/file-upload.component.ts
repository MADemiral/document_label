import { Component, EventEmitter, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../service/api.service';
import { DocumentAnalysisResult } from '../../interfaces/document-analysis/document-analysis-response.interface';

// FileUploadData interface'ini güncelleyin
export interface FileUploadData {
  id: string;
  file: File;
  uploadDate: Date;
  isProcessing: boolean;
  content: string | null;
  analysisResult?: any;
  error?: string | null; // Bu satırı ekleyin
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
  @Output() fileUploaded = new EventEmitter<File>();
  @Output() analysisCompleted = new EventEmitter<{result: DocumentAnalysisResult, content: string}>();
  @Output() uploadError = new EventEmitter<string>();

  // Service injection
  private apiService = inject(ApiService); 
  
  // Signals for reactive state management
  uploadedFiles = signal<FileUploadData[]>([]);
  isDragOver = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  processingFiles = signal<Set<string>>(new Set());
  
  // Configuration
  readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  readonly allowedTypes = ['application/pdf']; // Only PDF for now
  readonly allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx'];

  // Math object for template
  // Removed duplicate Math property

  /**
   * Trigger file input click
   */
  triggerFileInput(): void {
    const fileInput = document.querySelector('.file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Handle file selection from input
   */
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.handleFiles(files);
      // Clear input value to allow selecting the same file again
      input.value = '';
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // Only set to false if leaving the upload terminal completely
    if (!(event.currentTarget instanceof Element) || !event.currentTarget.contains(event.relatedTarget as Node)) {
      this.isDragOver.set(false);
    }
  }

  /**
   * Handle file drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.handleFiles(files);
    }
  }

  /**
   * Process selected/dropped files
   */
  private handleFiles(files: File[]): void {
    for (const file of files) {
      const validation = this.validateFile(file);
      if (validation.isValid) {
        this.uploadFile(file);
      } else {
        // Create error file entry
        const errorFileData: FileUploadData = {
          id: this.generateFileId(),
          file: file,
          uploadDate: new Date(),
          isProcessing: false,
          content: null,
          error: validation.error || 'Validation error'
        };
        
        const currentFiles = this.uploadedFiles();
        this.uploadedFiles.set([...currentFiles, errorFileData]);
      }
    }
  }

  /**
   * Upload a valid file (add to uploadedFiles and simulate upload)
   */
  private uploadFile(file: File): void {
    const fileData: FileUploadData = {
      id: this.generateFileId(),
      file: file,
      uploadDate: new Date(),
      isProcessing: false,
      content: null
    };
    this.simulateUpload([fileData]);
  }

  /**
   * Validate file
   */
  private validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.maxFileSize) {
      return { 
        isValid: false, 
        error: `Dosya boyutu çok büyük (maksimum ${this.formatFileSize(this.maxFileSize)})` 
      };
    }

    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: `Desteklenmeyen dosya formatı: ${fileExtension}`
      };
    }

    return { isValid: true };
  }

  /**
   * Simulate file upload with progress
   */
  private simulateUpload(files: FileUploadData[]): void {
    this.isUploading.set(true);
    this.uploadProgress.set(0);

    const uploadDuration = 1000; // 1 second
    const interval = 50; // Update every 50ms
    const steps = uploadDuration / interval;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const progress = (currentStep / steps) * 100;
      this.uploadProgress.set(Math.min(progress, 100));

      if (currentStep >= steps) {
        clearInterval(progressInterval);
        this.completeUpload(files);
      }
    }, interval);
  }

  /**
   * Complete upload process
   */
  private completeUpload(files: FileUploadData[]): void {
    const currentFiles = this.uploadedFiles();
    this.uploadedFiles.set([...currentFiles, ...files]);
    
    this.isUploading.set(false);
    this.uploadProgress.set(0);
    
    // Reset file input
    // Emit file uploaded events BEFORE processing
    files.forEach(fileData => {
      this.fileUploaded.emit(fileData.file); // Emit File object
    });

    // Start processing files by sending directly to backend
    files.forEach(fileData => this.processFileWithBackend(fileData));
  }

  /**
   * Process file with backend (no frontend text extraction)
   */
  private async processFileWithBackend(fileData: FileUploadData): Promise<void> {
    try {
      this.processingFiles.update(set => {
        const newSet = new Set(set);
        newSet.add(fileData.id);
        return newSet;
      });

      // Update file processing state
      this.uploadedFiles.update(files => 
        files.map(f => f.id === fileData.id ? { ...f, isProcessing: true } : f)
      );

      console.log(`🔄 Processing file with backend: ${fileData.file.name}`);
      
      // Send file directly to backend API
      const apiResponse = await this.apiService.sendDocumentAnalyze(fileData.file);

      console.log('📡 API Response received:', apiResponse);

      // Update file with processing complete
      this.uploadedFiles.update(files => 
        files.map(f => f.id === fileData.id ? { 
          ...f, 
          isProcessing: false,
          content: apiResponse.summary
        } : f)
      );

      // Create analysis result
      const analysisResult: DocumentAnalysisResult = {
        id: fileData.id,
        title: apiResponse.filename || fileData.file.name,
        fileName: apiResponse.filename || fileData.file.name,
        labels: apiResponse.labels,
        summary: apiResponse.summary,
        analysisDate: new Date(),
        fileMetadata: {
          size: fileData.file.size,
          type: fileData.file.type,
          lastModified: new Date(fileData.file.lastModified)
        }
      };

      // Emit analysis completed event
      this.analysisCompleted.emit({
        result: analysisResult,
        content: apiResponse.summary
      });

      // Note: fileUploaded is emitted in completeUpload, not here
      // This ensures File object is available before analysis starts

    } catch (error) {
      console.error('❌ File processing error:', error);
      this.uploadError.emit(`Dosya işleme hatası: ${error}`);
      
      // Update file with error state
      this.uploadedFiles.update(files => 
        files.map(f => f.id === fileData.id ? { 
          ...f, 
          isProcessing: false,
          hasError: true 
        } : f)
      );
    } finally {
      this.processingFiles.update(set => {
        const newSet = new Set(set);
        newSet.delete(fileData.id);
        return newSet;
      });
    }
  }

  /**
   * Check if file is being processed
   */
  isFileProcessing(fileId: string): boolean {
    return this.processingFiles().has(fileId);
  }

  /**
   * Remove uploaded file
   */
  removeFile(fileId: string): void {
    const currentFiles = this.uploadedFiles();
    const filteredFiles = currentFiles.filter(f => f.id !== fileId);
    this.uploadedFiles.set(filteredFiles);
    
    // Remove from processing set if it exists
    const processing = this.processingFiles();
    if (processing.has(fileId)) {
      processing.delete(fileId);
      this.processingFiles.set(new Set(processing));
    }
  }

  /**
   * Clear all uploaded files
   */
  clearAllFiles(): void {
    this.uploadedFiles.set([]);
    this.processingFiles.set(new Set());
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Retro helper methods for terminal display
  getFileTypeChar(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const typeMap: { [key: string]: string } = {
      'pdf': 'P',
      'doc': 'W',
      'docx': 'W', 
      'txt': 'T',
      'xls': 'X',
      'xlsx': 'X',
      'ppt': 'S',
      'pptx': 'S',
      'zip': 'Z',
      'rar': 'R',
      'jpg': 'I',
      'jpeg': 'I',
      'png': 'I',
      'gif': 'I',
      'mp4': 'V',
      'mp3': 'A'
    };
    return typeMap[ext || ''] || 'F';
  }

  getFileStatusChar(fileData: FileUploadData): string {
    if (fileData.isProcessing) return '⟳';
    if (fileData.error) return '✗';
    if (fileData.content || fileData.analysisResult) return '✓';
    return '○';
  }

  truncateFilename(filename: string, maxLength: number): string {
    if (filename.length <= maxLength) return filename;
    
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - (extension?.length || 0) - 4);
    
    return `${truncatedName}...${extension}`;
  }

  /**
   * Get upload status text
   */
  getUploadStatusText(): string {
    if (this.isUploading()) {
      return 'UPLOADING FILES...';
    }
    
    const processingCount = this.processingFiles().size;
    if (processingCount > 0) {
      return `PROCESSING ${processingCount} FILE(S)...`;
    }
    
    const totalFiles = this.uploadedFiles().length;
    if (totalFiles > 0) {
      return `${totalFiles} FILE(S) READY FOR ANALYSIS`;
    }
    
    return 'SYSTEM READY';
  }

  /**
   * Track by function for ngFor
   */
  trackByFileId(index: number, item: FileUploadData): string {
    return item.id;
  }

  // Math helper for template
  get Math() {
    return Math;
  }

  /**
   * Format file size for display (e.g., 1.2 MB)
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${size} ${sizes[i]}`;
  }
}