import { Component, Input, Output, EventEmitter, signal, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, EMPTY, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../service/api.service';
import { FileViewComponent, DocumentViewData } from '../file-view/file-view.component';
import { LabelSuggestion, LabelSuggestionsResponse } from '../../interfaces/file-search/file-search-response.interface';
import { ConfirmationConfig, ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

// ⚡ FIX: Updated import - updated interface
import { DoomConfig, DoomReadyComponent } from '../doom-captcha/doom-captcha.component';

@Component({
  selector: 'app-file-search',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    FileViewComponent, 
    ConfirmationDialogComponent,
    DoomReadyComponent
  ],
  templateUrl: './file-search.component.html',
  styleUrls: ['./file-search.component.scss']
})
export class FileSearchComponent implements OnInit, OnDestroy {
  
  // Timeout for temporary messages
  private messageTimeout: any = null;

  // Service injection
  private apiService = inject(ApiService);
  
  // Input properties
  @Input() placeholder = 'Döküman ara... (en az 3 karakter)';
  @Input() enableAdvancedSearch = true;
  
  // Output events
  @Output() searchResults = new EventEmitter<any>();
  @Output() searchError = new EventEmitter<string>();
  
  // Core search signals
  searchQuery = signal<string>('');
  suggestions = signal<LabelSuggestion[]>([]);
  showSuggestions = signal<boolean>(false);
  isLoadingSuggestions = signal<boolean>(false);
  activeSuggestionIndex = signal<number>(-1);
  totalResults = signal<number>(0);
  searchTime = signal<number>(0);
  isSearching = signal<boolean>(false);

  // Documents signal to store search results
  documents = signal<any[]>([]);
  
  // FILE VIEW SIGNALS - YENİ! 🎉
  showFileView = signal<boolean>(false);
  selectedDocument = signal<DocumentViewData | null>(null);
  isFileViewModal = signal<boolean>(true);

  // DELETE DIALOG SIGNALS
  documentToDelete = signal<DocumentViewData | null>(null);
  showDeleteDialog = signal<boolean>(false);

  // Dialog config signal for confirmation dialog
  dialogConfig = signal<ConfirmationConfig>({
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    type: 'info',
    showDetails: false,
    details: {},
    isProcessing: false
  });
  
  // Configuration signals
  enableAutoComplete = signal<boolean>(true);
  maxSuggestions = 8;
  minQueryLength = 3;
  
  // Search type signal (sadece API için)
  searchType = signal<'semantic' | 'label'>('label');
  
  // Advanced filters signals
  private showAdvancedFiltersSignal = signal<boolean>(false);
  private selectedFileTypeSignal = signal<string>('all');
  private selectedCategorySignal = signal<string>('all');
  private startDateSignal = signal<string>('');
  private endDateSignal = signal<string>('');
  
  // UI state signals
  private saveSuccessSignal = signal<string>('');
  private saveErrorSignal = signal<string>('');
  private isSavingSignal = signal<boolean>(false);
  showCharacterHint = signal<boolean>(false);
  
  // VIEW MODE SIGNALS - YENİ! 🎨
  viewMode = signal<'grid' | 'list' | 'cards'>('cards');
  showPreview = signal<boolean>(true);
  sortBy = signal<'relevance' | 'date' | 'name' | 'size'>('relevance');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // ⚡ NEW: DOOM CAPTCHA SIGNALS - FIXED INTERFACE
  showDoomCaptcha = signal<boolean>(false);
  doomConfig = signal<DoomConfig>({
    documentTitle: '',
    documentId: '',
    isProcessing: false
  });
  
  // Computed properties
  showAdvancedFilters = computed(() => this.showAdvancedFiltersSignal());
  selectedFileType = computed(() => this.selectedFileTypeSignal());
  selectedCategory = computed(() => this.selectedCategorySignal());
  saveSuccess = computed(() => this.saveSuccessSignal());
  saveError = computed(() => this.saveErrorSignal());
  isSaving = computed(() => this.isSavingSignal());
  
  // Static data
  fileTypes = ['all', 'pdf', 'doc', 'docx', 'txt', 'image'];
  
  categories = computed(() => [
    'all',
    'contract',
    'finance', 
    'report',
    'communication',
    'meeting',
    'document'
  ]);
  
  hasActiveFilters = computed(() => {
    return this.selectedFileTypeSignal() !== 'all' ||
           this.selectedCategorySignal() !== 'all' ||
           this.startDateSignal() !== '' ||
           this.endDateSignal() !== '';
  });
  
  isSaveDisabled = computed(() => {
    return this.isSavingSignal() || !this.searchQuery() || this.totalResults() === 0;
  });
  
  // Observables
  private suggestionSearchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  ngOnInit(): void {
    this.setupSuggestionSearch();
    // İlk yüklemede tüm dosyaları göster
    this.loadAllDocuments();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Setup suggestion search - SADECE ETİKET ÖNERİLERİ İÇİN
   * Otomatik arama YAPMAZ, sadece önerileri getirir
   */
  private setupSuggestionSearch(): void {
    this.suggestionSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
      switchMap(query => {
        // 3 karakterden az ise öneri gösterme
        if (!query || query.trim().length < this.minQueryLength) {
          this.suggestions.set([]);
          this.showSuggestions.set(false);
          this.isLoadingSuggestions.set(false);
          return EMPTY;
        }
        
        this.isLoadingSuggestions.set(true);
        
        // SADECE ETİKET ÖNERİLERİ AL - dosya araması YOK!
        return this.apiService.searchLabelSuggestions(query, this.maxSuggestions).pipe(
          catchError(error => {
            console.error('🏷️ Error fetching label suggestions:', error);
            this.isLoadingSuggestions.set(false);
            return of({ suggestions: [], total: 0, message: 'Error occurred' });
          })
        );
      })
    ).subscribe((response: LabelSuggestionsResponse) => {
      // SADECE etiket önerilerini göster - ARAMA YAPMA!
      this.suggestions.set(response.suggestions);
      this.isLoadingSuggestions.set(false);
      
      if (response.suggestions.length > 0) {
        this.showSuggestions.set(true);
        console.log(`🏷️ Found ${response.suggestions.length} label suggestions for "${this.searchQuery()}"`);
      } else {
        this.showSuggestions.set(false);
        console.log(`🏷️ No label suggestions found for "${this.searchQuery()}"`);
      }
    });
  }
  
  // ==================== INPUT HANDLERS ====================
  
  /**
   * Handle search input change - SADECE ÖNERİLER, ARAMA YOK!
   */
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value;
    
    this.searchQuery.set(query);
    this.activeSuggestionIndex.set(-1);
    
    if(this.searchType() === 'label') {
    // Karakter uyarısı göster
    if (query.trim().length > 0 && query.trim().length < this.minQueryLength) {
      this.showCharacterHint.set(true);
      this.showSuggestions.set(false);
    } else {
      this.showCharacterHint.set(false);
    }
    
    // SADECE etiket önerilerini tetikle - OTOMATIK ARAMA YOK!
    if (query.trim().length >= this.minQueryLength) {
      this.suggestionSearchSubject.next(query);
    } else {
      this.suggestions.set([]);
      this.showSuggestions.set(false);
    }
  }
    
    // Boş ise tüm dosyaları göster
    if (query.trim().length === 0) {
      this.loadAllDocuments();
    }
  }

  /**
   * Handle input focus
   */
  onInputFocus(): void {
    if (this.canShowSuggestions() && this.suggestions().length > 0) {
      this.showSuggestions.set(true);
    }
  }

  /**
   * Handle input blur
   */
  onInputBlur(): void {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      this.showSuggestions.set(false);
    }, 200);
  }
  
  /**
   * Handle search input keydown - Enter ile arama yap
   */
  onSearchKeyDown(event: KeyboardEvent): void {
    if (!this.showSuggestions() || this.suggestions().length === 0) {
      if (event.key === 'Enter') {
        // MANUEL ARAMA - Enter ile
        this.performManualSearch();
      } else if (event.key === 'Escape') {
        this.clearSearch();
      }
      return;
    }
    
    const currentIndex = this.activeSuggestionIndex();
    const maxIndex = this.suggestions().length - 1;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeSuggestionIndex.set(currentIndex < maxIndex ? currentIndex + 1 : 0);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.activeSuggestionIndex.set(currentIndex > 0 ? currentIndex - 1 : maxIndex);
        break;
        
      case 'Enter':
        event.preventDefault();
        if (currentIndex >= 0 && currentIndex <= maxIndex) {
          // Etiket seçildi - onunla DOSYA araması yap
          this.selectSuggestion(this.suggestions()[currentIndex]);
        } else {
          // Normal manuel arama
          this.performManualSearch();
        }
        break;
        
      case 'Escape':
        this.showSuggestions.set(false);
        this.activeSuggestionIndex.set(-1);
        break;
    }
  }
  
  // ==================== SEARCH METHODS ====================
  
  /**
   * Select suggestion - etiketle DOSYA ARAMASI yap
   */
  selectSuggestion(suggestion: LabelSuggestion): void {
    this.searchQuery.set(suggestion.name);
    this.showSuggestions.set(false);
    this.activeSuggestionIndex.set(-1);
    this.showCharacterHint.set(false);
    
    // Etiket seçildiğinde LABEL araması yap
    this.searchType.set('label');
    
    console.log(`🏷️ Selected label: "${suggestion.name}" - performing DOCUMENT search`);
    
    // Seçilen etiketle DOSYA ARAMASI yap
    this.performDocumentSearch();
  }

  /**
   * Manual search - Enter tuşu veya search butonu ile
   */
  performManualSearch(): void {
    const query = this.searchQuery().trim();
    
    if (query.length === 0) {
      this.loadAllDocuments();
      return;
    }
    
    if (query.length < this.minQueryLength) {
      console.log(`❌ Query too short: "${query}" (min ${this.minQueryLength} characters)`);
      return;
    }
    
  
    
    console.log(`🔍 Manual search: "${query}" - performing SEMANTIC search`);
    
    this.performDocumentSearch();
  }

  /**
   * Perform document search - model'e uygun mapping
   */
  private async performDocumentSearch(): Promise<void> {
    const query = this.searchQuery().trim();
    
    if (query.length < this.minQueryLength) {
      console.log(`❌ Query too short for search: "${query}"`);
      return;
    }
    
    try {
      this.isSearching.set(true);
      this.showSuggestions.set(false);
      
      const startTime = Date.now();
      const searchType = this.searchType();
      
      console.log(`🔍 DOCUMENT SEARCH: "${query}" with type: ${searchType}`);

      // Eğer etiket araması ise, sadece etiketle arama yap
      if (searchType === 'label') {
        this.apiService.searchDocumentsByLabel(query, 20).subscribe({
          next: (response) => {
            const searchTime = Date.now() - startTime;
            this.searchTime.set(searchTime);
            
            // Convert API results to display format - MODEL'E UYGUN
            const documents = response.results.map((result, index) => ({
              document_id: result.document_id,
              content: result.content || '',
              summary: result.summary || '',
              
              // FIX: Labels doğru şekilde çevir - API'de zaten {label_name, label_id} formatında
              labels: result.labels || [], // Direkt kullan, çevirme yapmaya gerek yok!
              
              title: result.title || 'Untitled Document',
              search_type: searchType,
              
              // Frontend display için ek alanlar
              id: `doc_${result.document_id}`,
              name: this.generateDocumentName(result, index),
              file_type: this.inferFileType(result.content || ''),
              size: (result.content || '').length,
              lastModified: this.formatDate(new Date().toISOString()),
              
              // Search highlight için
              highlightedContent: this.highlightSearchTerms(result.content || '', query),
              highlightedSummary: this.highlightSearchTerms(result.summary || '', query)
            }));
            
            console.log('📄 Documents:', documents);
            this.documents.set(documents);
            this.totalResults.set(documents.length);
            
            // Parent component'e emit et
            this.searchResults.emit({
              files: documents,
              totalCount: documents.length,
              searchTime,
              searchQuery: query,
              searchType,
              documents // Raw document data
            });
            
            this.isSearching.set(false);
          },
          error: (error) => {
            console.error('❌ Document search error:', error);
            this.searchError.emit('Dosya araması sırasında hata oluştu');
            this.isSearching.set(false);
          }
        });
      } else {
        this.apiService.searchDocumentsSemantic({query:query, limit: 20}).subscribe({
          next: (response) => {
            const searchTime = Date.now() - startTime;
            this.searchTime.set(searchTime);
            
            console.log(`📄 Found ${response.results.length} documents in ${searchTime}ms`);
            
            // Convert API results to display format - MODEL'E UYGUN
            const documents = response.results.map((result, index) => ({
              document_id: result.document_id,
              title: result.title || 'Untitled Document',
              content: result.content || '',
              summary: result.summary || '',
              
              // FIX: Semantic search'te labels nasıl geliyor kontrol et
              labels: Array.isArray(result.labels) 
                ? result.labels.map((label: any) => 
                    typeof label === 'string' 
                      ? { label_name: label, label_id: null }
                      : label
                  )
                : [],
                
              score: result.score || 0,
              search_type: searchType,
              
              // Frontend display için ek alanlar
              id: `doc_${result.document_id}`,
              name: this.generateDocumentName(result, index),
              file_type: this.inferFileType(result.content_preview || ''),
              size: (result.content_preview || '').length,
              lastModified: this.formatDate(new Date().toISOString()),
              
              // Search highlight için
              highlightedContent: this.highlightSearchTerms(result.content_preview || '', query),
              highlightedSummary: this.highlightSearchTerms(result.summary || '', query)
            }));
            
            this.documents.set(documents);
            this.totalResults.set(documents.length);
            
            // Parent component'e emit et
            this.searchResults.emit({
              files: documents,
              totalCount: documents.length,
              searchTime,
              searchQuery: query,
              searchType,
              documents // Raw document data
            });
            
            this.isSearching.set(false);
          },
          error: (error) => {
            console.error('❌ Document search error:', error);
            this.searchError.emit('Dosya araması sırasında hata oluştu');
            this.isSearching.set(false);
          }
        });
      }

      this.isSearching.set(false);

    } catch (error) {
      console.error('❌ Document search error:', error);
      this.searchError.emit('Dosya araması sırasında hata oluştu');
      this.isSearching.set(false);
    }
  }

  /**
   * Handle search type change - semantic/label/both
   */
  onSearchTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newType = target.value as 'semantic' | 'label'  ;
    this.searchType.set(newType);
    
    console.log(`🔧 Search type changed to: ${newType}`);
    
    // Aktif sorgu varsa yeniden ara
    if (this.searchQuery().trim().length >= this.minQueryLength) {
      this.performDocumentSearch();
    }
  }

  /**
   * Load all documents - model'e uygun mapping
   */
  private async loadAllDocuments(): Promise<void> {
    try {
      this.isSearching.set(true);
      console.log('📂 Loading all documents...');
      
      const startTime = Date.now();
      const response = await this.apiService.getAllDocuments();
      
      const searchTime = Date.now() - startTime;
      this.searchTime.set(searchTime);
      
      console.log(`📄 Loaded ${response.documents.length} documents in ${searchTime}ms`);
      
      // Backend'den gelen documents'ı display format'a çevir
      const documents = response.documents.map((doc: any, index: number) => ({
        // Backend model alanları
        title: doc.title || 'Untitled Document',
        document_id: doc.document_id,
        content: doc.content || '',
        summary: doc.summary || '',
        labels: doc.labels || [],
        uploaded_at: doc.uploaded_at,
        created_at: doc.created_at,
        
        // Frontend display alanları
        id: `doc_${doc.document_id}`,
        name: this.generateDocumentName(doc, index),
        file_type: this.inferFileType(doc.content || ''),
        size: (doc.content || '').length,
        lastModified: doc.created_at || new Date().toISOString(),
        
        // UI için ek alanlar
        highlightedContent: doc.content || '',
        highlightedSummary: doc.summary || ''
      }));
      
      this.documents.set(documents);
      this.totalResults.set(documents.length);
      
      // Parent'e emit et
      this.searchResults.emit({
        files: documents,
        totalCount: documents.length,
        searchTime,
        searchQuery: '',
        searchType: 'all',
        documents: documents
      });
      
    } catch (error) {
      console.error('❌ Error loading documents:', error);
      this.searchError.emit('Dosyalar yüklenirken hata oluştu');
    } finally {
      this.isSearching.set(false);
    }
  }

  /**
   * Clear search and show all documents
   */
  clearSearch(): void {
    this.searchQuery.set('');
    this.showSuggestions.set(false);
    this.showCharacterHint.set(false);
    this.activeSuggestionIndex.set(-1);
    
    // Tüm dosyaları tekrar yükle
    this.loadAllDocuments();
  }

  /**
   * Clear search results
   */
 /* private clearSearchResults(): void {
    this.totalResults.set(0);
    this.searchTime.set(0);
    
    this.searchResults.emit({
      files: [],
      totalCount: 0,
      searchTime: 0,
      suggestions: []
    });
  }*/
  
  // ==================== ADVANCED FILTERS ====================
  
  /**
   * Toggle advanced filters
   */
  toggleAdvancedFilters(): void {
    this.showAdvancedFiltersSignal.update(current => !current);
  }

  /**
   * Handle file type change
   */
  onFileTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedFileTypeSignal.set(target.value);
    this.applyFilters();
  }

  /**
   * Handle category change
   */
  onCategoryChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedCategorySignal.set(target.value);
    this.applyFilters();
  }

  /**
   * Get start date value
   */
  getStartDateValue(): string {
    return this.startDateSignal();
  }

  /**
   * Handle start date change
   */
  onStartDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.startDateSignal.set(target.value);
    this.applyFilters();
  }

  /**
   * Get end date value
   */
  getEndDateValue(): string {
    return this.endDateSignal();
  }

  /**
   * Handle end date change
   */
  onEndDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.endDateSignal.set(target.value);
    this.applyFilters();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.selectedFileTypeSignal.set('all');
    this.selectedCategorySignal.set('all');
    this.startDateSignal.set('');
    this.endDateSignal.set('');
    this.applyFilters();
  }

  /**
   * Apply filters to the document search
   */
  applyFilters(): void {
    // Optionally, you can add logic to filter documents based on selected filters.
    // For now, just re-perform the document search with current filters.
    if (this.searchQuery().trim().length >= this.minQueryLength) {
      this.performDocumentSearch();
    } else {
      this.loadAllDocuments();
    }
  }

  /**
   * Get save button text
   */
  getSaveButtonText(): string {
    if (this.isSavingSignal()) {
      return 'Saving...';
    }
    return 'Save Search Results';
  }

  /**
   * Clear messages
   */
  clearMessages(): void {
    this.saveSuccessSignal.set('');
    this.saveErrorSignal.set('');
  }
  
  // ==================== FILE VIEW METHODS - YENİ! ====================
  
  /**
   * Open document in file view
   */
  openDocumentView(document: any): void {
    console.log('🔍 Opening document view for:', document.document_id);
    
    // Convert to DocumentViewData format
    const viewData: DocumentViewData = {
      document_id: document.document_id,
      content: document.content || '',
      summary: document.summary || '',
      labels: document.labels || [],
      uploaded_at: document.uploaded_at,
      created_at: document.created_at,
      title: document.title,
      file_type: document.file_type,
      size: document.size,
      score: document.score,
      search_type: document.search_type
    };
    
    this.selectedDocument.set(viewData);
    this.showFileView.set(true);
    
  
  }
  
  /**
   * Close file view
   */
  closeFileView(): void {
    console.log('❌ Closing file view');
    this.showFileView.set(false);
    this.selectedDocument.set(null);
    
    // ⚡ FIX: Re-enable body scroll with window.document
    window.document.body.style.overflow = 'auto';
  }
  
  /**
   * Handle file view edit document
   */
  onFileViewEditDocument(document: DocumentViewData): void {
    console.log('✏️ Edit document:', document.document_id);
    // TODO: Implement edit functionality
    this.closeFileView();
  }
  
  /**
   * Handle file view delete document - CUSTOM DIALOG
   */
  onFileViewDeleteDialog(documentData: DocumentViewData): void {
    console.log('🗑️ Delete requested for document:', documentData.document_id);
    
    // Set document to delete
    this.documentToDelete.set(documentData);
    
    // Configure dialog
    this.dialogConfig.set({
      title: 'CRITICAL OPERATION - DELETE CONFIRMATION',
      message: `You are about to <strong>PERMANENTLY DELETE</strong> the document:<br><br>"<strong>${documentData.title}</strong>"<br><br>This action <strong>CANNOT BE UNDONE</strong>!`,
      confirmText: 'DELETE PERMANENTLY',
      cancelText: 'CANCEL OPERATION',
      type: 'danger',
      showDetails: true,
      details: {
        documentId: documentData.document_id,
        title: documentData.title,
        size: `${documentData.size} bytes`,
        type: documentData.file_type?.toUpperCase() || 'UNKNOWN',
        status: 'MARKED FOR DELETION'
      },
      isProcessing: false
    });
    
    // Show dialog
    this.showDeleteDialog.set(true);
  }
  
  /**
   * Handle dialog confirmation - FIX
   */
  onDeleteConfirmed(): void {
    const documentData = this.documentToDelete();
    if (!documentData) return;
    
    console.log('✅ Delete confirmed for:', documentData.document_id);
    
    // Show processing state
    this.dialogConfig.update(config => ({
      ...config,
      isProcessing: true
    }));
    
    // Perform delete
    this.deleteDocumentFromSystem(documentData);
  }
  
  /**
   * Handle dialog cancellation
   */
  onDeleteCancelled(): void {
    console.log('❌ Delete cancelled by user');
    this.closeDeleteDialog();
  }
  
  /**
   * Handle dialog close
   */
  onDeleteDialogClosed(): void {
    this.closeDeleteDialog();
  }
  
  /**
   * Close delete dialog
   */
  private closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.documentToDelete.set(null);
    this.dialogConfig.update(config => ({
      ...config,
      isProcessing: false
    }));
  }
  
  // ==================== DOOM CAPTCHA METHODS ====================
  
  /**
   * Show REAL DOOM captcha - FIXED VARIABLE NAMES AND INTERFACE
   */
  onFileViewDeleteDocument(documentData: DocumentViewData): void {
    console.log('🎮 === DOOM DELETE STARTED ===');
    console.log('🎮 Document:', documentData);
    console.log('🎮 Document ID:', documentData.document_id);
    console.log('🎮 Document Title:', documentData.title);
    
    // Set document to delete
    this.documentToDelete.set(documentData);
    console.log('🎮 Document to delete set:', this.documentToDelete());
    
    // ⚡ FIX: Configure DOOM with correct interface
    const doomConfigData: DoomConfig = {
      documentTitle: documentData.title ?? `Document ${documentData.document_id}`,
      documentId: String(documentData.document_id), // Convert to string
      isProcessing: false
    };
    
    console.log('🎮 Setting DOOM Config:', doomConfigData);
    this.doomConfig.set(doomConfigData);
    console.log('🎮 DOOM Config after set:', this.doomConfig());
    
    // Show DOOM captcha
    console.log('🎮 Current showDoomCaptcha before:', this.showDoomCaptcha());
    this.showDoomCaptcha.set(true);
    console.log('🎮 showDoomCaptcha after set:', this.showDoomCaptcha());
    
    // ⚡ FIX: Use window.document instead of parameter 'document'
    window.document.body.style.overflow = 'hidden';
    console.log('🎮 Body overflow set to hidden');
    
    // Force change detection
    setTimeout(() => {
      console.log('🎮 After timeout - showDoomCaptcha:', this.showDoomCaptcha());
      console.log('🎮 After timeout - doomConfig:', this.doomConfig());
      
      // ⚡ FIX: Use window.document for DOM queries
      const doomComponent = window.document.querySelector('app-doom-ready');
      console.log('🎮 DOOM component in DOM:', doomComponent);
      
      const doomOverlay = window.document.querySelector('.doom-overlay');
      console.log('🎮 DOOM overlay in DOM:', doomOverlay);
      
    }, 100);
    
    console.log('🎮 === DOOM DELETE END ===');
  }
  
  /**
   * Handle doom captcha confirmation - FIXED
   */
  onDoomConfirmed(): void {
    const documentData = this.documentToDelete();
    if (!documentData) return;
    
    console.log('🎮 REAL DOOM captcha completed - deleting document!');
    
    this.doomConfig.update(config => ({
      ...config,
      isProcessing: true
    }));
    
    this.deleteDocumentFromSystem(documentData);
  }
  
  /**
   * Handle doom captcha cancelled
   */
  onDoomCancelled(): void {
    console.log('🎮 DOOM captcha cancelled');
    this.closeDoomCaptcha();
  }
  
  /**
   * ⚡ NEW: Handle doom captcha closed
   */
  onDoomClosed(): void {
    console.log('🎮 DOOM captcha closed');
    this.closeDoomCaptcha();
  }
  
  /**
   * Close doom captcha
   */
  private closeDoomCaptcha(): void {
    this.showDoomCaptcha.set(false);
    this.documentToDelete.set(null);
    this.doomConfig.update(config => ({
      ...config,
      isProcessing: false
    }));
    
    // ⚡ FIX: Restore body scroll with window.document
    window.document.body.style.overflow = 'auto';
  }
  
  /**
   * Updated delete method - FIX PARAMETER NAME
   */
  private async deleteDocumentFromSystem(documentData: DocumentViewData): Promise<void> {
    try {
      console.log('🔄 Deleting document after DOOM success:', documentData.document_id);
      
      // API CALL - FIXED
      await this.apiService.deleteDocument(documentData.document_id).toPromise();
      
      // SUCCESS
      this.deleteDocumentFromResults(documentData.document_id);
      this.closeFileView();
      this.closeDoomCaptcha();
      
      this.showTemporaryMessage('🎮 DOOM Mission Complete! Document eliminated! 💀');
      
    } catch (error) {
      console.error('❌ Delete error after DOOM:', error);
      this.showTemporaryMessage('❌ DOOM Mission Complete but Delete Failed!');
      
      this.doomConfig.update(config => ({
        ...config,
        isProcessing: false
      }));
    }
  }
  
  // ==================== DOCUMENT ACTION METHODS ====================
  
  /**
   * Delete document from results
   */
  private deleteDocumentFromResults(documentId: number): void {
    this.documents.update(docs => docs.filter(doc => doc.document_id !== documentId));
    this.totalResults.update(count => count - 1);
    
    // Re-emit updated results
    this.searchResults.emit({
      files: this.documents(),
      totalCount: this.documents().length,
      searchTime: this.searchTime(),
      searchQuery: this.searchQuery(),
      searchType: this.searchType(),
      documents: this.documents()
    });
  }
  
  /**
   * Download document - FIX PARAMETER NAME
   */
  public downloadDocument(docData: DocumentViewData): void {
    try {
      // Create blob from content
      const blob = new Blob([docData.content], { type: 'text/plain;charset=utf-8' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${docData.title || `document_${docData.document_id}`}.txt`;
      
      // Trigger download
      window.document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      this.showTemporaryMessage('✅ Döküman indirildi!');
      
    } catch (error) {
      console.error('❌ Download error:', error);
      this.showTemporaryMessage('❌ İndirme başarısız!');
    }
  }
  
  /**
   * Share document - FIX PARAMETER NAME
   */
  public shareDocument(documentData: DocumentViewData): void {
    try {
      // Create shareable link
      const shareUrl = `${window.location.origin}/document/${documentData.document_id}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showTemporaryMessage('✅ Döküman linki panoya kopyalandı!');
      }).catch(() => {
        // Fallback: Show URL in alert
        alert(`Döküman linki:\n${shareUrl}`);
      });
      
    } catch (error) {
      console.error('❌ Share error:', error);
      this.showTemporaryMessage('❌ Paylaşım başarısız!');
    }
  }

  // ==================== VIEW MODE METHODS ====================
  
  /**
   * Set view mode
   */
  setViewMode(mode: 'grid' | 'list' | 'cards'): void {
    this.viewMode.set(mode);
    console.log('👀 View mode changed to:', mode);
  }
  
  /**
   * Toggle preview mode
   */
  togglePreview(): void {
    this.showPreview.update(show => !show);
  }
  
  /**
   * Set sort criteria
   */
  setSortBy(criteria: 'relevance' | 'date' | 'name' | 'size'): void {
    this.sortBy.set(criteria);
    this.sortDocuments();
  }
  
  /**
   * Toggle sort order
   */
  toggleSortOrder(): void {
    this.sortOrder.update(order => order === 'asc' ? 'desc' : 'asc');
    this.sortDocuments();
  }
  
  /**
   * Sort documents
   */
  private sortDocuments(): void {
    const criteria = this.sortBy();
    const order = this.sortOrder();
    
    this.documents.update(docs => {
      const sorted = [...docs].sort((a, b) => {
        let comparison = 0;
        
        switch (criteria) {
          case 'relevance':
            comparison = (b.score || 0) - (a.score || 0);
            break;
          case 'date':
            comparison = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            break;
          case 'name':
            comparison = (a.name || '').localeCompare(b.name || '');
            break;
          case 'size':
            comparison = (b.size || 0) - (a.size || 0);
            break;
        }
        
        return order === 'asc' ? comparison : -comparison;
      });
      
      return sorted;
    });
  }

  // ==================== UTILITY METHODS ====================
  
  /**
   * Show temporary message
   */
  private showTemporaryMessage(message: string, duration: number = 3000): void {
    this.saveSuccessSignal.set(message);
    
    // Clear any existing timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    
    // Set new timeout
    this.messageTimeout = setTimeout(() => {
      this.saveSuccessSignal.set('');
    }, duration);
  }
  
  /**
   * Get view mode icon
   */
  getViewModeIcon(mode: 'grid' | 'list' | 'cards'): string {
    const icons = {
      grid: 'fas fa-th',
      list: 'fas fa-list',
      cards: 'fas fa-th-large'
    };
    return icons[mode];
  }
  
  /**
   * Get sort icon
   */
  getSortIcon(): string {
    return this.sortOrder() === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  /**
   * Highlight matching text in suggestions
   */
  highlightMatch(text: string, query: string): string {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
  
  /**
   * Get character hint text
   */
  getCharacterHintText(): string {
    const currentLength = this.searchQuery().trim().length;
    const remaining = this.minQueryLength - currentLength;
    return `En az ${this.minQueryLength} karakter gerekli (${remaining} karakter daha)`;
  }
  
  /**
   * Show error message
   */
  /*private showErrorMessage(message: string): void {
    console.error('Search Error:', message);
    this.saveErrorSignal.set(message);
  }*/
  
  /**
   * Get search type display text
   */
  getSearchTypeText(): string {
    const typeMap = {
      'semantic': 'Anlamsal',
      'label': 'Etiket',
    };
    return typeMap[this.searchType()];
  }
  
  /**
   * Check if suggestions can be shown
   */
  canShowSuggestions(): boolean {
    return this.searchQuery().trim().length >= this.minQueryLength;
  }

  /**
   * Public method for template to call document search
   */
  performDocumentSearchFromTemplate(): void {
    this.performManualSearch();
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate display name for document
   */
  private generateDocumentName(doc: any, index: number): string {
    if (doc.summary && doc.summary.length > 0) {
      // Summary'den ilk 30 karakteri al
      const nameFromSummary = doc.summary.substring(0, 30).trim();
      return nameFromSummary + (doc.summary.length > 30 ? '...' : '');
    }
    
    if (doc.content && doc.content.length > 0) {
      // Content'ten ilk 20 karakteri al
      const nameFromContent = doc.content.substring(0, 20).trim();
      return nameFromContent + (doc.content.length > 20 ? '...' : '');
    }
    
    // Fallback: Document ID ile
    return `Document ${doc.document_id || index + 1}`;
  }

  /**
   * Infer file type from content
   */
  private inferFileType(content: string): string {
    if (!content) return 'txt';
    
    // Content'e göre dosya tipi tahmin et
    if (content.includes('PDF') || content.includes('%PDF')) return 'pdf';
    if (content.includes('<html>') || content.includes('<HTML>')) return 'html';
    if (content.includes('<?xml')) return 'xml';
    
    return 'txt'; // Default
  }

  /**
   * Highlight search terms in text
   */
  private highlightSearchTerms(text: string, query: string): string {
    if (!query.trim() || !text) return text;
    
    const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  /**
   * Escape special characters for regex
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Format date for display
   */
  public formatDate(date: string): string {
    return new Date(date).toLocaleDateString('tr-TR');
  }
  
  /**
   * Copy document content helper
   */
  copyDocumentContent(document: any): void {
    const content = document.content || document.summary || document.name;
    navigator.clipboard.writeText(content).then(() => {
      this.saveSuccessSignal.set('İçerik panoya kopyalandı');
      setTimeout(() => this.saveSuccessSignal.set(''), 3000);
    }).catch(() => {
      this.saveErrorSignal.set('Kopyalama başarısız');
      setTimeout(() => this.saveErrorSignal.set(''), 3000);
    });
  }

  /**
   * Document icon helper
   */
  getDocumentIcon(document: any): string {
    const extension = document.name?.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'fas fa-file-pdf text-red-500';
      case 'doc':
      case 'docx': return 'fas fa-file-word text-blue-500';
      case 'txt': return 'fas fa-file-alt text-gray-500';
      case 'xls':
      case 'xlsx': return 'fas fa-file-excel text-green-500';
      case 'ppt':
      case 'pptx': return 'fas fa-file-powerpoint text-orange-500';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'fas fa-file-image text-purple-500';
      default: return 'fas fa-file text-gray-400';
    }
  }

  /**
   * Get document type character for terminal display
   */
  getDocumentTypeChar(document: any): string {
    const extension = document.name?.split('.').pop()?.toLowerCase();
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
    return typeMap[extension || ''] || 'F';
  }

  /**
   * Content statistics helper
   */
  getContentStats(document: any): string {
    if (document.content) {
      const wordCount = document.content.split(/\s+/).length;
      const charCount = document.content.length;
      return `${wordCount} kelime, ${charCount} karakter`;
    }
    return 'İçerik bilgisi yok';
  }

  /**
   * Score class helper for styling
   */
  getScoreClass(score: number): string {
    if (score >= 0.8) return 'score-high';
    if (score >= 0.6) return 'score-medium';
    return 'score-low';
  }

  /**
   * Truncated summary helper
   */
  getTruncatedSummary(document: any): string {
    if (!document.summary) return '';
    const maxLength = 200;
    return document.summary.length > maxLength 
      ? document.summary.substring(0, maxLength) + '...'
      : document.summary;
  }

  /**
   * Truncated content helper
   */
  getTruncatedContent(document: any): string {
    if (!document.content) return '';
    const maxLength = 150;
    return document.content.length > maxLength 
      ? document.content.substring(0, maxLength) + '...'
      : document.content;
  }

  /**
   * Visible labels helper (show only first 3 labels)
   */
  getVisibleLabels(document: any): string[] {
    try {
      if (!document?.labels || !Array.isArray(document.labels)) {
        return [];
      }
      
      // API'den gelen format: {label_name: "TÜBİTAK", label_id: 29}
      return document.labels
        .slice(0, 3)
        .map((label: any) => {
          if (typeof label === 'string') {
            return label;
          } else if (label && typeof label === 'object' && label.label_name) {
            return label.label_name;
          }
          return '';
        })
        .filter((labelName: string) => labelName.trim().length > 0);
        
    } catch (error) {
      console.warn('getVisibleLabels error:', error);
      return [];
    }
  }

  /**
   * Label highlighting helper
   */
  isLabelHighlighted(label: string): boolean {
    const query = this.searchQuery()?.toLowerCase();
    return query ? label.toLowerCase().includes(query) : false;
  }

  /**
   * Label click handler
   */
  onLabelClick(labelData: string | { label_name: string }, event: Event): void {
    event.stopPropagation();
    
    // Label name'i güvenli şekilde al
    const labelName = typeof labelData === 'string' 
      ? labelData 
      : labelData.label_name;
      
    console.log('🏷️ Label clicked:', labelName);
    
    // Search with the label
    this.searchQuery.set(labelName);
    this.searchType.set('label');
    this.performManualSearch();
  }
  
  /**
   * Handle sort change event
   */
  onSortByChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.setSortBy(target.value as 'relevance' | 'date' | 'name' | 'size');
    }
  }

  /**
   * Track by function for ngFor performance
   */
  trackByDocumentId(index: number, document: any): any {
    return document.document_id || index;
  }
  
  // ==================== FILE VIEW EVENT HANDLERS ====================
  
  /**
   * Handle file view download document
   */
  onFileViewDownloadDocument(documentData: DocumentViewData): void {
    console.log('📥 Download requested from file view:', documentData.document_id);
    this.downloadDocument(documentData);
  }
  
  /**
   * Handle file view share document
   */
  onFileViewShareDocument(documentData: DocumentViewData): void {
    console.log('📤 Share requested from file view:', documentData.document_id);
    this.shareDocument(documentData);
  }
  
  /**
   * Handle file view label click
   */
  onFileViewLabelClick(labelData: string | { label_name: string }): void {
    const labelName = typeof labelData === 'string' 
      ? labelData 
      : labelData.label_name;
      
    console.log('🏷️ Label clicked from file view:', labelName);
    
    // Close file view first
    this.closeFileView();
    
    // Search with the label
    this.searchQuery.set(labelName);
    this.searchType.set('label');
    this.performManualSearch();
  }
}