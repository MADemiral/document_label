import { Component, Output, EventEmitter, signal, ViewChild, ElementRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../service/api.service';
import { DocumentAnalysisResult } from '../../interfaces/document-analysis/document-analysis-response.interface';


// PDF.js types
declare global {
  const pdfjsLib: any;
  interface Window {
    pdfjsLib: any;
  }
}

export interface FileUploadData {
  file: File;
  id: string;
  uploadDate: Date;
  content?: string;
  isProcessing?: boolean;
  hasError?: boolean;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
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
  
  // PDF.js status
  pdfJsLoaded = signal<boolean>(false);
  
  // Configuration
  readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  readonly allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  
  readonly allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx'];

  // Math object for template
  Math = Math;

  ngOnInit() {
    console.log('🚀 FileUploadComponent initialized');
    
    // PDF.js availability check
    console.log('🔍 PDF.js availability check:');
    console.log('  - window.pdfjsLib:', typeof (window as any).pdfjsLib);
    console.log('  - global pdfjsLib:', typeof pdfjsLib);
    
    this.initializePdfJs();
    
    // Additional check after 2 seconds
    setTimeout(() => {
      const pdfLib = (window as any).pdfjsLib || pdfjsLib;
      console.log('🔍 PDF.js delayed check:', typeof pdfLib !== 'undefined' ? '✅ Available' : '❌ Not Available');
    }, 2000);
  }

  /**
   * Initialize PDF.js library with retry logic
   */
  private async initializePdfJs(): Promise<void> {
    let retryCount = 0;
    const maxRetries = 15; // Daha fazla retry
    
    const checkPdfJs = () => {
      // window.pdfjsLib veya global pdfjsLib'i kontrol et
      const pdfLib = (window as any).pdfjsLib || (window as any).pdfjsLib || pdfjsLib;
      
      if (typeof pdfLib !== 'undefined') {
        // PDF.js yüklendi
        pdfLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        // Global olarak erişilebilir yap
        (window as any).pdfjsLib = pdfLib;
        
        this.pdfJsLoaded.set(true);
        console.log('✅ PDF.js successfully loaded and configured');
        return true;
      }
      return false;
    };

    // Hemen kontrol et
    if (checkPdfJs()) {
      return;
    }

    console.log('⏳ Waiting for PDF.js to load...');

    // 300ms aralıklarla tekrar dene
    const retryInterval = setInterval(() => {
      retryCount++;
      
      if (checkPdfJs()) {
        clearInterval(retryInterval);
        return;
      }
      
      if (retryCount >= maxRetries) {
        clearInterval(retryInterval);
        console.warn('⚠️ PDF.js could not be loaded after maximum retries');
        // PDF olmadan da devam edebiliriz
      }
    }, 300);
  }

  /**
   * Trigger file input click
   */
  triggerFileInput(): void {
    this.fileInput?.nativeElement?.click();
  }

  /**
   * Handle file selection from input
   */
  onFileSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.processFiles(Array.from(target.files));
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
    this.isDragOver.set(false);
  }

  /**
   * Handle file drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  /**
   * Process selected/dropped files
   */
  private processFiles(files: File[]): void {
    const validFiles: FileUploadData[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const validation = this.validateFile(file);
      if (validation.isValid) {
        const fileData: FileUploadData = {
          file,
          id: this.generateFileId(),
          uploadDate: new Date(),
          isProcessing: false
        };
        validFiles.push(fileData);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      this.uploadError.emit(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      this.simulateUpload(validFiles);
    }
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
        error: `Desteklenmeyen dosya türü (${this.allowedExtensions.join(', ')})` 
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

    const uploadDuration = 2000; // 2 seconds
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
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }

    // Start processing files to extract content
    files.forEach(fileData => this.processFileContent(fileData));
  }

  /**
   * Process file content and send to API
   */
  private async processFileContent(fileData: FileUploadData): Promise<void> {
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

      console.log(`🔄 Processing file: ${fileData.file.name}`);
      
      // Extract content
      const content = await this.extractFileContent(fileData.file);
      
      console.log(`📝 Content extracted (${content.length} chars)`);
      
      // Update file with content
      this.uploadedFiles.update(files => 
        files.map(f => f.id === fileData.id ? { 
          ...f, 
          content, 
          isProcessing: false 
        } : f)
      );

      console.log('📡 Sending to API for analysis...');
      
      // Send to API
      const apiResponse = await this.apiService.sendDocumentAnalyze({ content });

      console.log('📡 API Response received:', apiResponse);

      // Create analysis result
      const analysisResult: DocumentAnalysisResult = {
        id: fileData.id,
        title: fileData.file.name,
        fileName: fileData.file.name,
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
        content: content
      });

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
   * Extract content from file based on type
   */
  private async extractFileContent(file: File): Promise<string> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    console.log(`📄 Extracting content from ${file.name} (${fileExtension})`);
    
    try {
      if (fileExtension === 'pdf') {
        return await this.extractPdfContent(file);
      } else if (fileExtension === 'txt') {
        return await this.extractTextContent(file);
      } else {
        // For other file types, treat as text
        return await this.extractTextContent(file);
      }
    } catch (error) {
      console.error(`Error extracting content from ${file.name}:`, error);
      throw new Error(`${file.name} dosyasından içerik çıkarılamadı`);
    }
  }

  /**
   * Extract content from text file
   */
  private async extractTextContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content && content.trim()) {
          console.log(`📄 Text extracted: ${content.length} characters`);
          resolve(content.trim());
        } else {
          reject(new Error('Dosyada okunabilir içerik bulunamadı'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Dosya okunamadı'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Extract PDF content using PDF.js with enhanced error handling
   */
  private async extractPdfContent(file: File): Promise<string> {
    try {
      // Check if PDF.js is loaded
      const pdfLib = (window as any).pdfjsLib;
      
      if (!this.pdfJsLoaded() || typeof pdfLib === 'undefined') {
        console.warn('PDF.js not loaded, trying fallback...');
        
        // Wait a bit more for PDF.js to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const pdfLibRetry = (window as any).pdfjsLib;
        if (typeof pdfLibRetry === 'undefined') {
          return `PDF dosyası "${file.name}" yüklendi. PDF.js kütüphanesi yüklenemedi - text dosyası olarak deneyin.`;
        }
      }

      console.log(`📄 Starting PDF extraction for: ${file.name} (${this.formatFileSize(file.size)})`);
      
      // Validate PDF file
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Dosya PDF formatında değil');
      }
      
      const arrayBuffer = await file.arrayBuffer();
      console.log(`📄 PDF file loaded to memory: ${arrayBuffer.byteLength} bytes`);
      
      // Enhanced PDF loading configuration
      const loadingTask = pdfLib.getDocument({
        data: arrayBuffer,
        verbosity: 0, // Reduce console output
        maxImageSize: 1024 * 1024, // 1MB max image size
        disableFontFace: true, // Disable font rendering for text extraction
        useSystemFonts: false, // Don't load system fonts
        disableRange: false,
        disableStream: false,
        disableAutoFetch: false,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/'
      });
      
      // Set timeout for PDF loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PDF loading timeout')), 30000); // 30 second timeout
      });
      
      const pdf = await Promise.race([loadingTask.promise, timeoutPromise]) as any;
      
      console.log(`📄 PDF loaded successfully: ${pdf.numPages} pages`);
      
      let fullText = '';
      let successfulPages = 0;
      
      // Extract text from each page with individual error handling
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          console.log(`📄 Processing page ${pageNum}/${pdf.numPages}...`);
          
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false
          });
          
          // Extract text items and join them
          const pageText = textContent.items
            .filter((item: any) => item.str && typeof item.str === 'string' && item.str.trim())
            .map((item: any) => item.str)
            .join(' ')
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
          
          if (pageText) {
            fullText += pageText + '\n\n';
            successfulPages++;
            console.log(`📄 Page ${pageNum} extracted: ${pageText.length} characters`);
          } else {
            console.warn(`⚠️ Page ${pageNum} contains no readable text`);
          }
          
          // Clean up page resources
          page.cleanup();
          
        } catch (pageError) {
          console.warn(`⚠️ Error processing page ${pageNum}:`, pageError);
          // Continue with next page
          continue;
        }
      }
      
      // Clean up PDF resources
      pdf.destroy();
      
      const result = fullText.trim();
      
      if (!result || result.length < 10) {
        console.warn('Very little or no text extracted from PDF');
        
        if (successfulPages === 0) {
          return `PDF dosyası "${file.name}" işlendi ancak hiçbir sayfadan okunabilir metin çıkarılamadı. Bu PDF görsel tabanlı olabilir veya şifreli olabilir.`;
        } else {
          return `PDF dosyası "${file.name}" kısmen işlendi. ${successfulPages}/${pdf.numPages} sayfa başarıyla okundu ancak çok az metin bulundu: ${result}`;
        }
      }
      
      console.log(`✅ PDF extraction completed: ${result.length} characters from ${successfulPages}/${pdf.numPages} pages`);
      return result;
      
    } catch (error) {
      console.error('❌ PDF content extraction error:', error);
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('invalid pdf') || errorMessage.includes('invalid header')) {
          return `"${file.name}" geçerli bir PDF dosyası değil. Dosya bozuk olabilir.`;
        } else if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
          return `"${file.name}" şifreli bir PDF dosyası. Şifresiz PDF kullanın.`;
        } else if (errorMessage.includes('timeout')) {
          return `"${file.name}" çok büyük veya karmaşık. Daha küçük bir PDF deneyin.`;
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          return `PDF.js kütüphanesi yüklenemiyor. İnternet bağlantınızı kontrol edin.`;
        }
      }
      
      return `PDF dosyası "${file.name}" okunamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}. Text dosyası olarak kaydetmeyi deneyin.`;
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
    this.uploadedFiles.update(files => 
      files.filter(f => f.id !== fileId)
    );
    
    // Remove from processing set if it's being processed
    this.processingFiles.update(set => {
      const newSet = new Set(set);
      newSet.delete(fileId);
      return newSet;
    });
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

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file icon class based on extension
   */
  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const iconMap: { [key: string]: string } = {
      'pdf': 'fas fa-file-pdf text-red-500',
      'doc': 'fas fa-file-word text-blue-500',
      'docx': 'fas fa-file-word text-blue-500',
      'txt': 'fas fa-file-alt text-gray-500',
      'xls': 'fas fa-file-excel text-green-500',
      'xlsx': 'fas fa-file-excel text-green-500',
      'ppt': 'fas fa-file-powerpoint text-orange-500',
      'pptx': 'fas fa-file-powerpoint text-orange-500'
    };
    
    return iconMap[extension || ''] || 'fas fa-file text-gray-400';
  }

  /**
   * Get upload status text
   */
  getUploadStatusText(): string {
    if (this.isUploading()) {
      return `Yükleniyor... ${Math.round(this.uploadProgress())}%`;
    }
    
    const processingCount = this.processingFiles().size;
    if (processingCount > 0) {
      return `${processingCount} dosya işleniyor...`;
    }
    
    const fileCount = this.uploadedFiles().length;
    return fileCount > 0 ? `${fileCount} dosya yüklendi` : 'Dosya seçin';
  }

  /**
   * Get file processing status
   */
  getFileStatus(fileData: FileUploadData): string {
    if (fileData.hasError) {
      return 'Hata';
    }
    if (fileData.isProcessing) {
      return 'İşleniyor...';
    }
    if (fileData.content) {
      return 'İşlendi';
    }
    return 'Hazır';
  }

  /**
   * Track by function for ngFor
   */
  trackByFileId(index: number, item: FileUploadData): string {
    return item.id;
  }
}