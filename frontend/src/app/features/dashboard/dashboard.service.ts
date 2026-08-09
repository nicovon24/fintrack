import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TransactionSummaryResponse } from '../../core/models/transaction.model';
import { TransactionFilters, TransactionsService } from '../transactions/transactions.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly transactionsService = inject(TransactionsService);

  getSummary(filters: TransactionFilters): Observable<TransactionSummaryResponse> {
    return this.transactionsService.summary(filters);
  }
}
