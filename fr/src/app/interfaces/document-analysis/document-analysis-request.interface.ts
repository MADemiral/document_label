export interface ConfirmDocumentRequest {
  title:string;
  content: string;
  summary: string;
  labels: string[];
  fileName?: string;
  file?: File; 
}
