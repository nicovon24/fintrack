import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DolarBlueService } from '../../core/services/dolar-blue.service';
import { CategoryResponse } from '../../core/models/category.model';
import { Currency, TransactionResponse, TransactionType } from '../../core/models/transaction.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { DonutChart, DonutSlice } from '../../shared/components/donut-chart/donut-chart';
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { PeriodChange, PeriodFilter } from '../../shared/components/period-filter/period-filter';
import { CategoriesService } from '../categories/categories.service';
import { TransactionFilters, TransactionsService } from '../transactions/transactions.service';
import { DashboardService } from './dashboard.service';

function currentMonthFilters(): TransactionFilters {
  const now = new Date();
  return { month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` };
}

interface BreakdownItem {
  name: string;
  amount: number;
  count: number;
}

// Resumen mensual: totales por moneda + combinado ARS + breakdown por categoria.
@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, CurrencyFormatPipe, PeriodFilter, DonutChart, Skeleton],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);
  private readonly transactionsService = inject(TransactionsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly dolarBlueService = inject(DolarBlueService);

  protected readonly periodLabel = signal('');
  protected readonly activeFilters = signal<TransactionFilters>(currentMonthFilters());

  protected readonly blueRate = signal<number | null>(null);

  protected readonly viewCurrency = signal<Currency>('ARS');
  protected readonly dashType = signal<TransactionType>('EXPENSE');

  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly monthTransactions = signal<TransactionResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly arsIncome = signal(0);
  protected readonly arsExpense = signal(0);
  protected readonly arsBalance = signal(0);
  protected readonly usdIncome = signal(0);
  protected readonly usdExpense = signal(0);
  protected readonly usdBalance = signal(0);

  protected readonly avgUsdRate = computed(() => {
    const usdTx = this.monthTransactions().filter((t) => t.currency === 'USD' && t.exchangeRate);
    if (usdTx.length === 0) return null;
    return usdTx.reduce((sum, t) => sum + (t.exchangeRate ?? 0), 0) / usdTx.length;
  });

  // Cotizacion usada para pesificar USD: dolar blue actual, o el promedio cargado si la API no respondio.
  protected readonly effectiveRate = computed(() => this.blueRate() ?? this.avgUsdRate());

  // Todo combinado: pesos + (USD * cotizacion) en un unico numero, sin separar por moneda.
  protected readonly totalIncomeArs = computed(
    () => this.arsIncome() + this.usdIncome() * (this.effectiveRate() ?? 0)
  );
  protected readonly totalExpenseArs = computed(
    () => this.arsExpense() + this.usdExpense() * (this.effectiveRate() ?? 0)
  );
  protected readonly totalBalanceArs = computed(() => this.totalIncomeArs() - this.totalExpenseArs());

  protected readonly totalIncomeDisplay = computed(() => this.toDisplay(this.totalIncomeArs()));
  protected readonly totalExpenseDisplay = computed(() => this.toDisplay(this.totalExpenseArs()));
  protected readonly totalBalanceDisplay = computed(() => this.toDisplay(this.totalBalanceArs()));

  protected readonly recentTx = computed(() =>
    [...this.monthTransactions()]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5)
  );

  // Ultimos movimientos convertidos a la moneda seleccionada (pesificando USD al blue).
  protected readonly recentTxDisplay = computed(() => {
    const rate = this.effectiveRate();
    return this.recentTx().map((tx) => {
      const amountArs = tx.currency === 'USD' ? tx.amount * (rate ?? tx.exchangeRate ?? 0) : tx.amount;
      return { ...tx, displayAmount: this.toDisplay(amountArs) };
    });
  });

  // Gastos por categoria: pesifica cada movimiento USD al blue y suma todo junto, sin separar por moneda.
  protected readonly breakdown = computed<BreakdownItem[]>(() => {
    const rate = this.effectiveRate();
    const relevant = this.monthTransactions().filter((t) => t.type === this.dashType());
    const byCategory = new Map<string, { amountArs: number; count: number }>();
    for (const tx of relevant) {
      const amountArs = tx.currency === 'USD' ? tx.amount * (rate ?? tx.exchangeRate ?? 0) : tx.amount;
      const key = tx.category.name;
      const entry = byCategory.get(key) ?? { amountArs: 0, count: 0 };
      entry.amountArs += amountArs;
      entry.count += 1;
      byCategory.set(key, entry);
    }
    return [...byCategory.entries()]
      .sort((a, b) => b[1].amountArs - a[1].amountArs)
      .map(([name, v]) => ({
        name,
        amount: this.toDisplay(v.amountArs),
        count: v.count
      }));
  });

  protected readonly breakdownTotal = computed(() =>
    this.breakdown().reduce((sum, b) => sum + b.amount, 0)
  );

  // El donut compartido resuelve colores, plegado en "Otros", tooltip y toggles.
  protected readonly breakdownSlices = computed<DonutSlice[]>(() =>
    this.breakdown().map((b) => ({
      label: b.name,
      value: b.amount,
      meta: `${b.count} mov.`
    }))
  );

  // Quick add
  protected readonly showQuickAdd = signal(false);
  protected readonly quickType = signal<TransactionType>('EXPENSE');
  protected readonly quickAmount = signal('');
  protected readonly quickCurrency = signal<Currency>('ARS');
  protected readonly quickRate = signal('');
  protected readonly quickCategoryId = signal<number | null>(null);
  protected readonly quickDescription = signal('');
  protected readonly quickDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly quickSaving = signal(false);
  protected readonly quickSaved = signal(false);

  protected readonly canSaveQuick = computed(
    () => !!this.quickAmount() && !!this.quickCategoryId() && !this.quickSaving()
  );

  protected readonly quickCategoriesForType = computed(() =>
    this.categories().filter((c) => c.type === this.quickType())
  );

  constructor() {
    this.categoriesService.findAll().subscribe((categories) => this.categories.set(categories));
    this.dolarBlueService.getQuote().subscribe({
      next: (quote) => this.blueRate.set(quote.venta),
      error: () => this.blueRate.set(null)
    });

    // requestId descarta respuestas viejas: si el usuario cambia de periodo rapido, una
    // request lenta de un filtro anterior no debe pisar los datos del filtro actual.
    let requestId = 0;
    effect(() => {
      const filters = this.activeFilters();
      const id = ++requestId;
      this.loading.set(true);
      this.loadError.set(false);
      this.transactionsService.findAll(filters).subscribe({
        next: (tx) => {
          if (id !== requestId) return;
          this.monthTransactions.set(tx);
          this.loading.set(false);
        },
        // Sin esta rama el skeleton quedaba girando para siempre ante un error de red.
        error: () => {
          if (id !== requestId) return;
          this.monthTransactions.set([]);
          this.loadError.set(true);
          this.loading.set(false);
        }
      });
      this.dashboardService.getSummary(filters).subscribe({
        next: (summary) => {
          if (id !== requestId) return;
          const ars = summary.byCurrency.find((c) => c.currency === 'ARS');
          const usd = summary.byCurrency.find((c) => c.currency === 'USD');
          this.arsIncome.set(ars?.totalIncome ?? 0);
          this.arsExpense.set(ars?.totalExpense ?? 0);
          this.arsBalance.set(ars?.balance ?? 0);
          this.usdIncome.set(usd?.totalIncome ?? 0);
          this.usdExpense.set(usd?.totalExpense ?? 0);
          this.usdBalance.set(usd?.balance ?? 0);
        },
        error: () => {
          if (id !== requestId) return;
          this.loadError.set(true);
        }
      });
    });
  }

  onPeriodChange(event: PeriodChange): void {
    this.activeFilters.set(event.filters);
    this.periodLabel.set(event.label);
  }

  /** Reintenta la carga reasignando el mismo filtro, lo que vuelve a disparar el effect. */
  retry(): void {
    this.activeFilters.set({ ...this.activeFilters() });
  }

  setViewCurrency(c: Currency): void {
    this.viewCurrency.set(c);
  }

  setDashType(t: TransactionType): void {
    this.dashType.set(t);
  }

  openQuickAdd(): void {
    this.showQuickAdd.set(true);
  }

  closeQuickAdd(): void {
    this.showQuickAdd.set(false);
  }

  setQuickType(t: TransactionType): void {
    this.quickType.set(t);
    this.quickCategoryId.set(null);
  }

  setQuickCurrency(value: string): void {
    this.quickCurrency.set(value as Currency);
  }

  setQuickCategoryId(value: string): void {
    this.quickCategoryId.set(Number(value));
  }

  saveQuickTx(): void {
    const categoryId = this.quickCategoryId();
    if (!this.quickAmount() || !categoryId) return;

    this.quickSaving.set(true);
    this.transactionsService
      .create({
        type: this.quickType(),
        amount: Number(this.quickAmount()) || 0,
        date: this.quickDate(),
        description: this.quickDescription() || null,
        categoryId,
        currency: this.quickCurrency(),
        exchangeRate: this.quickCurrency() === 'USD' ? Number(this.quickRate()) || 0 : null
      })
      .subscribe({
        next: () => {
          this.quickSaving.set(false);
          this.quickSaved.set(true);
          this.quickAmount.set('');
          this.quickDescription.set('');
          this.quickRate.set('');
          this.refreshMonth();
          setTimeout(() => this.quickSaved.set(false), 2200);
        },
        error: () => this.quickSaving.set(false)
      });
  }

  private refreshMonth(): void {
    const filters = this.activeFilters();
    this.transactionsService.findAll(filters).subscribe((tx) => this.monthTransactions.set(tx));
    this.dashboardService.getSummary(filters).subscribe((summary) => {
      const ars = summary.byCurrency.find((c) => c.currency === 'ARS');
      const usd = summary.byCurrency.find((c) => c.currency === 'USD');
      this.arsIncome.set(ars?.totalIncome ?? 0);
      this.arsExpense.set(ars?.totalExpense ?? 0);
      this.arsBalance.set(ars?.balance ?? 0);
      this.usdIncome.set(usd?.totalIncome ?? 0);
      this.usdExpense.set(usd?.totalExpense ?? 0);
      this.usdBalance.set(usd?.balance ?? 0);
    });
  }

  private toDisplay(amountArs: number): number {
    if (this.viewCurrency() === 'USD') {
      const rate = this.effectiveRate();
      return rate ? amountArs / rate : amountArs;
    }
    return amountArs;
  }

}
