import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';

// Request interfaces
export interface AnalyzeDocumentRequest {
  content: string;
}

export interface ConfirmDocumentRequest {
  content: string;
  title: string;
  summary: string;
  labels: string[];
  fileName?: string;
}

export interface SearchDocumentRequest {
  query: string;
  limit?: number;
}

export interface LabelSuggestionRequest {
  query: string;
  limit?: number;
}

export interface CombinedSearchRequest {
  query: string;
  search_type?: 'semantic' | 'label' | 'both';
  limit?: number;
}

// Response interfaces
export interface AnalyzeDocumentResponse {
  labels: string[];
  summary: string;
}

export interface ConfirmDocumentResponse {
  status: 'saved' | 'duplicate_skipped';
  title?: string;
  document_id?: number;
  labels: string[];
  summary: string;
  message: string;
}

export interface SearchResult {
  document_id: string;
  title?: string;
  summary: string;
  labels: string[];
  score: number;
  content_preview: string;
  search_type?: string;
}

export interface SearchDocumentResponse {
  results: SearchResult[];
  total: number;
}

export interface LabelSuggestion {
  id: string;
  name: string;
  category: string;
  count: number;
}

export interface LabelSuggestionsResponse {
  suggestions: LabelSuggestion[];
  total: number;
  message?: string;
}

export interface CombinedSearchResponse {
  results: SearchResult[];
  total: number;
  search_type: string;
  query?: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
}

export interface ApiInfoResponse {
  message: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080';

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  // ==================== DOCUMENT ANALYSIS ====================

  /**
   * Analyze document content and get AI-generated labels and summary
   */
  sendDocumentAnalyze(request: AnalyzeDocumentRequest): Promise<AnalyzeDocumentResponse> {
    console.log('API: Sending document analyze request:', request);
    return this.http.post<AnalyzeDocumentResponse>(
      `${this.baseUrl}/analyze-document`,
      request,
      this.httpOptions
    ).toPromise() as Promise<AnalyzeDocumentResponse>;
  }

  /**
   * Analyze document content (wrapper method)
   */
  async analyzeDocument(content: string): Promise<AnalyzeDocumentResponse> {
    try {
      console.log('API: Analyzing document content...');
      const response = await this.sendDocumentAnalyze({ content });
      console.log('API: Analysis response:', response);
      return response;
    } catch (error) {
      console.error('API: Document analysis failed:', error);
      throw error;
    }
  }

  // ==================== DOCUMENT SAVE ====================

  /**
   * Save confirmed document with labels to database
   */
  confirmDocument(request: ConfirmDocumentRequest): Promise<ConfirmDocumentResponse> {
    console.log('API: Sending confirm document request:', request);
    return this.http.post<ConfirmDocumentResponse>(
      `${this.baseUrl}/confirm-document`,
      request,
      this.httpOptions
    ).toPromise() as Promise<ConfirmDocumentResponse>;
  }

  /**
   * Save document to database (wrapper method)
   */
  async saveDocumentToDatabase(request: ConfirmDocumentRequest): Promise<ConfirmDocumentResponse> {
    try {
      console.log('API: Saving document to database...');
      const response = await this.confirmDocument(request);
      console.log('API: Save response:', response);
      return response;
    } catch (error) {
      console.error('API: Document save failed:', error);
      throw error;
    }
  }

  // ==================== SEARCH METHODS ====================

  /**
   * Get all documents
   */
  async getAllDocuments(): Promise<any> {
    console.log('📂 API: Fetching all documents');
    
    try {
      const response = await this.http.get<any>(
        `${this.baseUrl}/get-all-documents`,
        this.httpOptions
      ).toPromise();
      
      return {
        documents: response.documents || [],
        total: response.total || 0
      };
    } catch (error) {
      console.error('Error fetching all documents:', error);
      
      // Fallback mock data
      return {
        documents: this.getMockDocuments(),
        total: this.getMockDocuments().length
      };
    }
  }

 

  /**
   * Search documents by semantic content
   */
  searchDocumentsSemantic(
    query: string, 
    limit: number = 10
  ): Observable<SearchDocumentResponse> {
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      console.log('API: Query too short for semantic search, returning empty');
      return of({ 
        results: [], 
        total: 0 
      });
    }
    console.log(`🔍 API: Semantic search - query: "${query}", limit: ${limit}`)
    const request: SearchDocumentRequest = {
      query,
      limit
    };
    return this.http.post<SearchDocumentResponse>(
      `${this.baseUrl}/search`,
      request,
      this.httpOptions
    ).pipe(
      retry(2),
      timeout(10000),
      catchError(error => {
        console.error('Semantic search error:', error);
        return of({ 
          results: this.getMockSearchResponse(query, 'semantic', limit).results, 
          total: 0 
        });
      })
    );
  }

  /**
   * Search documents by label
   */
  searchDocumentsByLabel(
    query: string, 
    limit: number = 10
  ): Observable<SearchDocumentResponse> {
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      console.log('API: Query too short for label search, returning empty');
      return of({ 
        results: [], 
        total: 0 
      });
    }
    console.log(`🔍 API: Label search - query: "${query}", limit: ${limit}`);
    
    const request: SearchDocumentRequest = {
      query,
      limit
    };
    
    return this.http.post<SearchDocumentResponse>(
      `${this.baseUrl}/search-documents-by-label`,
      request,
      this.httpOptions
    ).pipe(
      retry(2),
      timeout(10000),
      catchError(error => {
        console.error('Label search error:', error);
        return of({ 
          results: this.getMockSearchResponse(query, 'label', limit).results, 
          total: 0 
        });
      })
    );
  }

  /**
   * Search label suggestions
   */
  searchLabelSuggestions(query: string, limit: number = 10): Observable<LabelSuggestionsResponse> {
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      console.log('API: Query too short for suggestions, returning empty');
      return of({ 
        suggestions: [], 
        total: 0, 
        message: 'Minimum 3 characters required' 
      });
    }
    
    console.log(`🏷️ API: Label suggestions - query: "${query}", limit: ${limit}`);
    
    const request: LabelSuggestionRequest = {
      query,
      limit
    };
    
    return this.http.post<LabelSuggestionsResponse>(
      `${this.baseUrl}/label-suggestions`,
      request,
      this.httpOptions
    ).pipe(
      retry(1),
      timeout(5000),
      catchError(error => {
        console.error('Label suggestions error:', error);
        return of({ 
          suggestions: this.getMockSuggestions(query, limit), 
          total: 0, 
          message: 'Using mock data' 
        });
      })
    );
  }

  // ==================== HEALTH & INFO ====================

  /**
   * Health check endpoint
   */
  healthCheck(): Observable<HealthCheckResponse> {
    return this.http.get<HealthCheckResponse>(
      `${this.baseUrl}/health`,
      this.httpOptions
    );
  }

  /**
   * Get root endpoint info
   */
  getApiInfo(): Observable<ApiInfoResponse> {
    return this.http.get<ApiInfoResponse>(
      `${this.baseUrl}/`,
      this.httpOptions
    );
  }

  /**
   * Check if API is healthy
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await this.healthCheck().toPromise();
      const isHealthy = response?.status === 'healthy';
      console.log('API: Health check result:', isHealthy);
      return isHealthy;
    } catch (error) {
      console.error('API: Health check failed:', error);
      return false;
    }
  }

  /**
   * Test API connection and get basic info
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getApiInfo().toPromise();
      const isConnected = response?.status === 'running';
      console.log('API: Connection test result:', isConnected);
      return isConnected;
    } catch (error) {
      console.error('API: Connection test failed:', error);
      return false;
    }
  }

  // ==================== MOCK DATA METHODS ====================

  /**
   * Get mock search response for combined search
   */
  private getMockSearchResponse(query: string, searchType: string, limit: number): CombinedSearchResponse {
    const mockResults = this.getMockSearchResults(query, searchType).slice(0, limit);
    
    return {
      results: mockResults.map(doc => ({
        document_id: doc.id,
        summary: doc.summary,
        labels: doc.labels,
        score: 0.8,
        content_preview: doc.content,
        search_type: searchType
      })),
      total: mockResults.length,
      search_type: searchType,
      query
    };
  }

  /**
   * Get mock documents for fallback
   */
  private getMockDocuments(): any[] {
    return [
      {
        id: 'doc_1',
        name: 'Sözleşme Dökümanı.pdf',
        content: 'Bu bir sözleşme dökümanıdır...',
        labels: ['sözleşme', 'yasal', 'döküman'],
        summary: 'Şirket sözleşme dökümanı',
        created_at: '2024-01-15T10:30:00Z',
        file_type: 'pdf',
        size: 245760
      },
      {
        id: 'doc_2',
        name: 'Finansal Rapor.xlsx',
        content: 'Q4 2023 finansal analiz raporu...',
        labels: ['finans', 'rapor', 'analiz'],
        summary: 'Çeyreklik finansal durum raporu',
        created_at: '2024-01-10T14:15:00Z',
        file_type: 'xlsx',
        size: 189440
      },
      {
        id: 'doc_3',
        name: 'Toplantı Notları.docx',
        content: 'Aylık proje toplantısı notları...',
        labels: ['toplantı', 'notlar', 'proje'],
        summary: 'Proje ilerlemesi ve aksiyonlar',
        created_at: '2024-01-08T09:00:00Z',
        file_type: 'docx',
        size: 87552
      },
      {
        id: 'doc_4',
        name: 'Teknik Spesifikasyon.pdf',
        content: 'Sistem teknik gereksinimleri...',
        labels: ['teknik', 'spesifikasyon', 'sistem'],
        summary: 'Proje teknik detayları',
        created_at: '2024-01-05T16:45:00Z',
        file_type: 'pdf',
        size: 312320
      },
      {
        id: 'doc_5',
        name: 'Müşteri Sunumu.pptx',
        content: 'Ürün tanıtım sunumu...',
        labels: ['sunum', 'müşteri', 'ürün'],
        summary: 'Ürün özellikleri ve avantajları',
        created_at: '2024-01-03T11:20:00Z',
        file_type: 'pptx',
        size: 156672
      }
    ];
  }

  /**
   * Get mock search results
   */
  private getMockSearchResults(query: string, searchType: string): any[] {
    const allDocs = this.getMockDocuments();
    
    return allDocs.filter(doc => 
      doc.name.toLowerCase().includes(query.toLowerCase()) ||
      doc.content.toLowerCase().includes(query.toLowerCase()) ||
      doc.labels.some((label: string) => label.toLowerCase().includes(query.toLowerCase())) ||
      doc.summary.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Get mock suggestions
   */
  private getMockSuggestions(query: string, limit: number): LabelSuggestion[] {
    const allLabels = [
      { name: 'sözleşme', count: 15 },
      { name: 'finans', count: 12 },
      { name: 'rapor', count: 28 },
      { name: 'toplantı', count: 18 },
      { name: 'proje', count: 35 },
      { name: 'teknik', count: 8 },
      { name: 'sistem', count: 14 },
      { name: 'müşteri', count: 22 },
      { name: 'ürün', count: 19 },
      { name: 'analiz', count: 11 }
    ];
    
    return allLabels
      .filter(label => label.name.includes(query.toLowerCase()))
      .slice(0, limit)
      .map(label => ({
        id: `label_${label.name}`,
        name: label.name,
        category: 'label',
        count: label.count
      }));
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Validate query
   */
  isValidQuery(query: string, minLength: number = 3): boolean {
    return Boolean(query && typeof query === 'string' && query.trim().length >= minLength);
  }

  /**
   * Handle API errors
   */
  handleApiError(error: any, operation: string): string {
    console.error(`${operation} failed:`, error);
    
    if (error.status === 0) {
      return 'Sunucu bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.';
    } else if (error.status >= 400 && error.status < 500) {
      return 'İstek hatası. Lütfen arama kriterlerinizi kontrol edin.';
    } else if (error.status >= 500) {
      return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
    } else {
      return `${operation} başarısız oldu. Lütfen tekrar deneyin.`;
    }
  }
}
