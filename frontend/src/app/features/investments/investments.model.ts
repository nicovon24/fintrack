import { Currency } from '../../core/models/transaction.model';

// Frontend-only mock types: no backend entity yet (roadmap item 4).
export interface Investment {
  id: string;
  ticker: string;
  name: string;
  qty: number;
  avgCost: number;
  price: number;
  currency: Currency;
}

export interface Saving {
  id: string;
  label: string;
  amount: number;
  currency: Currency;
}
