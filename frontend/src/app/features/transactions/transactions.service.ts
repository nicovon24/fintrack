import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/api.config';
import {
  TransactionRequest,
  TransactionResponse,
  TransactionSummaryResponse,
  TransactionType
} from '../../core/models/transaction.model';

const BASE_URL = `${API_BASE_URL}/api/transactions`;

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: number;
  month?: string; // yyyy-MM
  from?: string; // yyyy-MM-dd
  to?: string; // yyyy-MM-dd
}

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly http = inject(HttpClient);

  findAll(filters: TransactionFilters = {}): Observable<TransactionResponse[]> {
    let params = new HttpParams();
    if (filters.type) params = params.set('type', filters.type);
    if (filters.categoryId) params = params.set('categoryId', filters.categoryId);
    if (filters.month) params = params.set('month', filters.month);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return this.http.get<TransactionResponse[]>(BASE_URL, { params });
  }

  create(request: TransactionRequest): Observable<TransactionResponse> {
    return this.http.post<TransactionResponse>(BASE_URL, request);
  }

  update(id: number, request: TransactionRequest): Observable<TransactionResponse> {
    return this.http.put<TransactionResponse>(`${BASE_URL}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }

  summary(filters: TransactionFilters): Observable<TransactionSummaryResponse> {
    let params = new HttpParams();
    if (filters.month) params = params.set('month', filters.month);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return this.http.get<TransactionSummaryResponse>(`${BASE_URL}/summary`, { params });
  }
}
