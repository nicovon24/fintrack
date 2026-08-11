import { Component, computed, effect, inject, signal } from '@angular/core';

import { DolarBlueService } from '../../core/services/dolar-blue.service';
import { TransactionResponse } from '../../core/models/transaction.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { PeriodChange, PeriodFilter } from '../../shared/components/period-filter/period-filter';
import { TransactionFilters, TransactionsService } from '../transactions/transactions.service';

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

interface MonthBucket {
  key: string;
  label: string;
  income: number;
  expense: number;
}

function currentMonthFilters(): TransactionFilters {
  const now = new Date();
  return { month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` };
}

// Rango de fechas cubierto por el filtro activo, usado para armar los buckets mensuales del grafico.
function filterDateSpan(filters: TransactionFilters): { start: Date; end: Date } {
  if (filters.from && filters.to) {
    return { start: new Date(filters.from), end: new Date(filters.to) };
  }
  if (filters.month) {
    const [year, month] = filters.month.split('-').map(Number);
    return { start: new Date(year, month - 1, 1), end: new Date(year, month - 1, 1) };
  }
  const now = new Date();
  return { start: now, end: now };
}

// Analytics: mismo selector de periodo que el dashboard (mes/ano/rango/rango custom), pesos + USD pesificado al blue.
@Component({
  selector: 'app-analytics',
  imports: [CurrencyFormatPipe, PeriodFilter],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss'
})
export class Analytics {
  private readonly transactionsService = inject(TransactionsService);
  private readonly dolarBlueService = inject(DolarBlueService);

  protected readonly periodLabel = signal('');
  protected readonly activeFilters = signal<TransactionFilters>(currentMonthFilters());

  private readonly transactions = signal<TransactionResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly blueRate = signal<number | null>(null);

  // Cotizacion para pesificar USD (viajes, etc.): dolar blue actual, o promedio cargado si la API no respondio.
  private readonly avgUsdRate = computed(() => {
    const usdTx = this.transactions().filter((t) => t.currency === 'USD' && t.exchangeRate);
    if (usdTx.length === 0) return null;
    return usdTx.reduce((sum, t) => sum + (t.exchangeRate ?? 0), 0) / usdTx.length;
  });

  private readonly effectiveRate = computed(() => this.blueRate() ?? this.avgUsdRate());

  private amountArs(tx: TransactionResponse): number {
    if (tx.currency !== 'USD') return tx.amount;
    const rate = this.effectiveRate() ?? tx.exchangeRate ?? 0;
    return tx.amount * rate;
  }

  protected readonly totalIncome = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + this.amountArs(t), 0)
  );

  protected readonly totalExpense = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + this.amountArs(t), 0)
  );

  protected readonly netTotal = computed(() => this.totalIncome() - this.totalExpense());

  protected readonly hasData = computed(() => this.transactions().length > 0);

  protected readonly savingsRate = computed(() => {
    const income = this.totalIncome();
    if (income <= 0) return 0;
    return Math.max(0, Math.round(((income - this.totalExpense()) / income) * 100));
  });

  protected readonly monthlyBars = computed<MonthBucket[]>(() => {
    const { start, end } = filterDateSpan(this.activeFilters());
    const buckets = new Map<string, MonthBucket>();
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d.setMonth(d.getMonth() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { key, label: MONTH_SHORT[d.getMonth()], income: 0, expense: 0 });
    }
    for (const tx of this.transactions()) {
      const key = tx.date.slice(0, 7);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (tx.type === 'INCOME') bucket.income += this.amountArs(tx);
      else bucket.expense += this.amountArs(tx);
    }
    return [...buckets.values()];
  });

  protected readonly maxBarValue = computed(() =>
    Math.max(1, ...this.monthlyBars().flatMap((b) => [b.income, b.expense]))
  );

  protected readonly topCategories = computed(() => {
    const byCategory = new Map<string, number>();
    for (const tx of this.transactions().filter((t) => t.type === 'EXPENSE')) {
      byCategory.set(tx.category.name, (byCategory.get(tx.category.name) ?? 0) + this.amountArs(tx));
    }
    const max = Math.max(1, ...byCategory.values());
    return [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, amount]) => ({ name, amount, pct: Math.round((amount / max) * 100) }));
  });

  constructor() {
    this.dolarBlueService.getQuote().subscribe({
      next: (quote) => this.blueRate.set(quote.venta),
      error: () => this.blueRate.set(null)
    });

    effect(() => {
      const filters = this.activeFilters();
      this.loading.set(true);
      this.transactionsService.findAll(filters).subscribe((tx) => {
        this.transactions.set(tx);
        this.loading.set(false);
      });
    });
  }

  onPeriodChange(event: PeriodChange): void {
    this.activeFilters.set(event.filters);
    this.periodLabel.set(event.label);
  }

  barHeight(value: number): number {
    return this.maxBarValue() > 0 ? Math.round((value / this.maxBarValue()) * 100) : 0;
  }
}
