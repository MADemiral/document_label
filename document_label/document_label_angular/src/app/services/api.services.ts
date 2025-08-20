// src/app/services/api.services.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface AnalysisResult {
  summary: string;
  labels: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  /**
   * Sends a PDF file to the backend for analysis.
   * Returns an object containing a summary and an array of labels.
   */
  analyzeDocument(file: File): Observable<AnalysisResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http
      .post<AnalysisResult>(`${this.apiUrl}/analyze-document`, formData)
      .pipe(catchError(this.handleError));
  }

  /** Centralized error handler */
  private handleError(error: HttpErrorResponse) {
    console.error('DocumentService Error:', error);
    return throwError(() => new Error(error.message || 'Server error'));
  }
}
