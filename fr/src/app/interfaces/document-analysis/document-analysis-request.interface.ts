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

export interface ConfirmDocumentRequest {
  title:string;
  content: string;
  summary: string;
  labels: string[];
  fileName?: string;
}
