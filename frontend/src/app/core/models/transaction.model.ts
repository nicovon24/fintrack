import { CategoryResponse } from './category.model';

export type TransactionType = 'INCOME' | 'EXPENSE';
export type Currency = 'ARS' | 'USD';

export interface TransactionRequest {
  type: TransactionType;
  amount: number;
  date: string; // ISO yyyy-MM-dd
  description: string | null;
  categoryId: number;
  currency: Currency;
  exchangeRate: number | null;
}

export interface TransactionResponse {
  id: number;
  type: TransactionType;
  amount: number;
  date: string;
  description: string | null;
  category: CategoryResponse;
  currency: Currency;
  exchangeRate: number | null;
  amountArs: number;
}

export interface CurrencyTotal {
  currency: Currency;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface CombinedTotal {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface CategoryTotal {
  categoryName: string;
  currency: Currency;
  total: number;
}

export interface TransactionSummaryResponse {
  byCurrency: CurrencyTotal[];
  combinedArs: CombinedTotal;
  byCategory: CategoryTotal[];
}
