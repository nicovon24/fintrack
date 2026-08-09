import { Component, computed, inject, signal } from '@angular/core';

import { TransactionResponse } from '../../core/models/transaction.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { TransactionsService } from '../transactions/transactions.service';

type RangeOption = '3m' | '6m' | '12m' | 'ytd';

const RANGE_LABELS: Record<RangeOption, string> = {
  '3m': 'Últimos 3 meses',
  '6m': 'Últimos 6 meses',
  '12m': 'Últimos 12 meses',
  ytd: 'Este año'
};

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

interface MonthBucket {
  key: string;
  label: string;
  income: number;
  expense: number;
}

// Analytics calculado en el cliente a partir de las transacciones reales (sin endpoint dedicado en el backend).
@Component({
  selector: 'app-analytics',
  imports: [CurrencyFormatPipe],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss'
})
export class Analytics {
  private readonly transactionsService = inject(TransactionsService);

  protected readonly range = signal<RangeOption>('6m');
  protected readonly rangeOptions: RangeOption[] = ['3m', '6m', '12m', 'ytd'];
  protected readonly rangeLabels = RANGE_LABELS;

  private readonly transactions = signal<TransactionResponse[]>([]);
  protected readonly loading = signal(true);

  private readonly rangeStart = computed(() => {
    const now = new Date();
    if (this.range() === 'ytd') return new Date(now.getFullYear(), 0, 1);
    const months = this.range() === '3m' ? 3 : this.range() === '6m' ? 6 : 12;
    return new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  });

  protected readonly rangeTransactions = computed(() => {
    const start = this.rangeStart();
    return this.transactions().filter((t) => t.currency === 'ARS' && new Date(t.date) >= start);
  });

  protected readonly totalIncome = computed(() =>
    this.rangeTransactions()
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  protected readonly totalExpense = computed(() =>
    this.rangeTransactions()
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  protected readonly savingsRate = computed(() => {
    const income = this.totalIncome();
    if (income <= 0) return 0;
    return Math.max(0, Math.round(((income - this.totalExpense()) / income) * 100));
  });

  protected readonly monthlyBars = computed<MonthBucket[]>(() => {
    const start = this.rangeStart();
    const now = new Date();
    const buckets = new Map<string, MonthBucket>();
    for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { key, label: MONTH_SHORT[d.getMonth()], income: 0, expense: 0 });
    }
    for (const tx of this.rangeTransactions()) {
      const key = tx.date.slice(0, 7);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (tx.type === 'INCOME') bucket.income += tx.amount;
      else bucket.expense += tx.amount;
    }
    return [...buckets.values()];
  });

  protected readonly maxBarValue = computed(() =>
    Math.max(1, ...this.monthlyBars().flatMap((b) => [b.income, b.expense]))
  );

  protected readonly topCategories = computed(() => {
    const byCategory = new Map<string, number>();
    for (const tx of this.rangeTransactions().filter((t) => t.type === 'EXPENSE')) {
      byCategory.set(tx.category.name, (byCategory.get(tx.category.name) ?? 0) + tx.amount);
    }
    const max = Math.max(1, ...byCategory.values());
    return [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, amount]) => ({ name, amount, pct: Math.round((amount / max) * 100) }));
  });

  constructor() {
    this.transactionsService.findAll().subscribe((tx) => {
      this.transactions.set(tx);
      this.loading.set(false);
    });
  }

  setRange(range: RangeOption): void {
    this.range.set(range);
  }

  barHeight(value: number): number {
    return this.maxBarValue() > 0 ? Math.round((value / this.maxBarValue()) * 100) : 0;
  }
}
