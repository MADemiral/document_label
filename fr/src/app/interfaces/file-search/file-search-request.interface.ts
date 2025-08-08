//Etiket arama yaparken 3 karakterden sonra label önermesi için
export interface LabelSuggestionRequest {
  query: string;
  limit?: number;
}

//Hem etiket hem de semantic arama için
export interface SearchDocumentRequest {
  query: string;
  limit?: number;
}
