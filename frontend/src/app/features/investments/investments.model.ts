import { Currency } from '../../core/models/transaction.model';

// Banco = saldo en cuenta; efectivo = plata fuera del sistema (billetera, caja fuerte).
// Se separan porque en Patrimonio son dos bloques distintos.
export type SavingKind = 'BANK' | 'CASH';

// Frontend-only: no backend entity yet for manual savings. Se persiste en localStorage.
export interface Saving {
  id: string;
  label: string;
  amount: number;
  currency: Currency;
  kind: SavingKind;
}
