import { Currency, TransactionType } from './transaction.model';

export interface ImportRow {
  date: string;
  type: TransactionType;
  category: string;
  description: string | null;
  amount: number;
  currency: Currency;
  exchangeRate: number | null;
}

export interface ImportRowError {
  rowNumber: number;
  message: string;
}

export interface ImportPreviewResponse {
  totalRows: number;
  rows: ImportRow[];
  distinctCategories: string[];
  errors: ImportRowError[];
  valid: boolean;
}

export interface ImportConfirmRequest {
  rows: ImportRow[];
}

export interface ImportConfirmResponse {
  importedCount: number;
}
