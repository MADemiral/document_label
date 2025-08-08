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




export interface ConfirmDocumentResponse {
  status: 'saved' | 'duplicate_skipped';
  document_id?: number;
  labels: string[];
  summary: string;
  message: string;
}







