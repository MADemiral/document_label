export interface DocumentAnalysisResult {
  id: string;
  title: string;
  fileName: string;
  labels: string[];
  summary: string;
  analysisDate: Date;
  fileMetadata?: {
    size: number;
    type: string;
    lastModified: Date;
  };
}

export interface ApiAnalysisResponse {
  labels: string[];
  summary: string;
}

export interface SaveDocumentRequest {
  fileName: string;
  labels: string[];
  summary: string;
  content: string;
  metadata?: {
    size: number;
    type: string;
    lastModified: Date;
  };
}

// File upload related interfaces
export interface FileUploadData {
  id: string;
  file: File;
  progress: number;
  isUploading: boolean;
  isProcessing: boolean;
  hasError?: boolean;
  content?: string;
}

// NEW API interfaces - Adding these to your existing file
export interface AnalyzeDocumentRequest {
  content: string;
}

export interface ConfirmDocumentRequest {
  content: string;
  summary: string;
  labels: string[];
  fileName?: string;
}

export interface ConfirmDocumentResponse {
  status: 'saved' | 'duplicate_skipped';
  document_id?: number;
  labels: string[];
  summary: string;
  message: string;
}

export interface SearchDocumentRequest {
  query: string;
  limit?: number;
}

export interface SearchResult {
  document_id: string;
  summary: string;
  labels: SearchLabel[];
  score: number;
  content_preview: string;
}

export interface SearchLabel{
  label_id:number;
  label_name:string;
}

export interface SearchDocumentResponse {
  results: SearchResult[];
  total: number;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
}

// interfaces/api.interface.ts
export interface AnalyzeDocumentRequest {
  content: string;
}

export interface ConfirmDocumentRequest {
  title:string;
  content: string;
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
  document_id?: number;
  labels: string[];
  summary: string;
  message: string;
}

export interface SearchResult {
  document_id: string;
  summary: string;
  labels: SearchLabel[];
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
}

export interface HealthCheckResponse {
  status: string;
  service: string;
}

export interface ApiInfoResponse {
  message: string;
  status: string;
}


export interface Document {
  document_id: number;
  content: string;
  summary: string;
  uploaded_at: string;
  created_at: string;
  labels: string[]; // Label names array
}

export interface DocumentSearchResult {
  document_id: number;
  content: string;
  summary: string;
  labels: string[];
  score?: number;
  search_type?: string;
  // Display için ek alanlar
  name: string;
  file_type: string;
  size: number;
  lastModified: string;
}