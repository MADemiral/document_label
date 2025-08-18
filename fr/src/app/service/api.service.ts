import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';

import { LabelSuggestionRequest, SearchDocumentRequest } from '../interfaces/file-search/file-search-request.interface';
import { LabelSuggestionsResponse, SearchDocumentQuery, SearchDocumentResponse, SearchDocumentResponseByLabel } from '../interfaces/file-search/file-search-response.interface';
import { ConfirmDocumentRequest } from '../interfaces/document-analysis/document-analysis-request.interface';
import { AnalyzeDocumentResponse, ConfirmDocumentResponse } from '../interfaces/document-analysis/document-analysis-response.interface';





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
   * Analyze document file using multipart/form-data
   */
  sendDocumentAnalyze(file: File): Promise<AnalyzeDocumentResponse> {
    console.log('API: Sending file for analysis:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);

    // Don't set Content-Type header - let browser handle multipart/form-data
    return this.http.post<AnalyzeDocumentResponse>(
      `${this.baseUrl}/analyze-document`,
      formData // Send FormData instead of JSON
    ).pipe(
      retry(1),
      timeout(60000), // 60 second timeout for file processing
      catchError(error => {
        console.error('API: Document analysis failed:', error);
        throw error;
      })
    ).toPromise() as Promise<AnalyzeDocumentResponse>;
  }

  /**
   * Analyze document content (wrapper method)
   */
  async analyzeDocument(file: File): Promise<AnalyzeDocumentResponse> {
    try {
      console.log('API: Analyzing document file...');
      const response = await this.sendDocumentAnalyze(file);
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
   * Save confirmed document with file
   */
  async saveDocumentToDatabase(request: ConfirmDocumentRequest, file?: File): Promise<ConfirmDocumentResponse> {
    try {
      console.log('API: Saving document to database...');
      
      const formData = new FormData();
      formData.append('title', request.title);
      formData.append('content', request.content);
      formData.append('summary', request.summary);
      formData.append('labels', JSON.stringify(request.labels));
      
      if (request.fileName) {
        formData.append('fileName', request.fileName);
      }
      
      // Add file if provided
      if (file) {
        formData.append('file', file);
      }

      const response = await this.http.post<ConfirmDocumentResponse>(
        `${this.baseUrl}/confirm-document`,
        formData  // FormData with file
      ).pipe(
        timeout(60000), // 60 second timeout
        catchError(error => {
          console.error('API: Save document failed:', error);
          throw error;
        })
      ).toPromise();

      console.log('API: Document saved successfully:', response);
      if (!response) {
        throw new Error('API: Document save response is undefined');
      }
      return response;
      
    } catch (error) {
      console.error('API: Save document failed:', error);
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
        documents: [],
        total: 0
      };
    }
  }

 

  /**
   * Search documents by semantic content
   */
  searchDocumentsSemantic(
    request: SearchDocumentQuery  ): Observable<SearchDocumentResponse> {
    if (!request.query || typeof request.query !== 'string' || request.query.trim().length < 3) {
      console.log('API: Query too short for semantic search, returning empty');
      return of({ 
        results: [], 
        total: 0 
      });
    }
    console.log(`🔍 API: Semantic search - query: "${request.query}", limit: ${request.limit}`)
    const searchRequest: SearchDocumentRequest = {
      query: request.query,
      limit: request.limit
    };
    return this.http.post<SearchDocumentResponse>(
      `${this.baseUrl}/semantic-search`,
      searchRequest,
      this.httpOptions
    ).pipe(
      retry(2),
      timeout(10000),
      catchError(error => {
        console.error('Semantic search error:', error);
        return of({ 
          results: [], 
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
  ): Observable<SearchDocumentResponseByLabel> {
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      console.log('API: Query too short for label search, returning empty');
      return of({ 
        results: [], 
      });
    }
    console.log(`🔍 API: Label search - query: "${query}", limit: ${limit}`);
    
    const request: SearchDocumentRequest = {
      query,
      limit
    };
    
    return this.http.post<SearchDocumentResponseByLabel>(
      `${this.baseUrl}/search-documents-by-label`,
      request,
      this.httpOptions
    ).pipe(
      retry(2),
      timeout(10000),
      catchError(error => {
        console.error('Label search error:', error);
        return of({ 
          results: [] 
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
          suggestions: [], 
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
