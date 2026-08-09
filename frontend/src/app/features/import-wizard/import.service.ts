import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/api.config';
import { ImportConfirmRequest, ImportConfirmResponse, ImportPreviewResponse } from '../../core/models/import.model';

const BASE_URL = `${API_BASE_URL}/api/transactions/import`;

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly http = inject(HttpClient);

  preview(file: File): Observable<ImportPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportPreviewResponse>(`${BASE_URL}/preview`, formData);
  }

  confirm(request: ImportConfirmRequest): Observable<ImportConfirmResponse> {
    return this.http.post<ImportConfirmResponse>(`${BASE_URL}/confirm`, request);
  }
}
