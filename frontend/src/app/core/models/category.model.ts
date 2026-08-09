import { TransactionType } from './transaction.model';

export interface CategoryRequest {
  name: string;
  type: TransactionType;
}

export interface CategoryResponse {
  id: number;
  name: string;
  type: TransactionType;
}
