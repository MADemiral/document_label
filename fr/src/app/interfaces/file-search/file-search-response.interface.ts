//3 karakter girdikten sonra dönen öneri etiketler
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


// Döküman ile aramadan dönen cevalar için
//Bu kadar interface gerek var mıydı bilmem 
export interface SearchDocumentResponseByLabel {
  results: SearchResultByLabel[];

}


export interface SearchResultByLabel {
  document_id: string;
  title: string;
  summary: string;
  labels: DocumentLabel[];

  content: string;

}

export interface DocumentLabel {
  label_name: string;
  label_id: number;
}



export interface SearchResult {
  content: string;
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

export interface SearchDocumentQuery {
  query: string;
  limit?: number;
 
}

