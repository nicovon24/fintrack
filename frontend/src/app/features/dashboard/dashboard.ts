import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DolarBlueService } from '../../core/services/dolar-blue.service';
import { CategoryResponse } from '../../core/models/category.model';
import { Currency, TransactionResponse, TransactionType } from '../../core/models/transaction.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { CategoriesService } from '../categories/categories.service';
import { TransactionFilters, TransactionsService } from '../transactions/transactions.service';
import { DashboardService } from './dashboard.service';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

type FilterMode = 'month' | 'year' | 'range';

const PALETTE = ['#7c9cf0', '#f0b46b', '#7fd1ae', '#e18ba0', '#8fd3e8', '#c9a6f0', '#e08f6b', '#9ad17f'];

interface BreakdownItem {
  name: string;
  color: string;
  amount: number;
  count: number;
  pct: number;
}

// Resumen mensual: totales por moneda + combinado ARS + breakdown por categoria.
@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, CurrencyFormatPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);
  private readonly transactionsService = inject(TransactionsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly dolarBlueService = inject(DolarBlueService);

  protected readonly filterMode = signal<FilterMode>('month');

  protected readonly year = signal(new Date().getFullYear());
  protected readonly monthIndex = signal(new Date().getMonth());
  protected readonly monthLabel = computed(
    () => `${MONTHS[this.monthIndex()]} ${this.year()}`
  );
  protected readonly monthKey = computed(
    () => `${this.year()}-${String(this.monthIndex() + 1).padStart(2, '0')}`
  );

  protected readonly rangeFrom = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  protected readonly rangeTo = signal(new Date().toISOString().slice(0, 10));
  protected readonly rangePreset = signal<string | null>(null);

  protected readonly periodLabel = computed(() => {
    switch (this.filterMode()) {
      case 'year':
        return `Año ${this.year()}`;
      case 'range':
        return `${this.rangeFrom()} a ${this.rangeTo()}`;
      default:
        return this.monthLabel();
    }
  });

  protected readonly activeFilters = computed<TransactionFilters>(() => {
    switch (this.filterMode()) {
      case 'year':
        return { from: `${this.year()}-01-01`, to: `${this.year()}-12-31` };
      case 'range':
        return { from: this.rangeFrom(), to: this.rangeTo() };
      default:
        return { month: this.monthKey() };
    }
  });

  protected readonly blueRate = signal<number | null>(null);

  protected readonly viewCurrency = signal<Currency>('ARS');
  protected readonly dashType = signal<TransactionType>('EXPENSE');

  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly monthTransactions = signal<TransactionResponse[]>([]);
  protected readonly loading = signal(true);

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
    const totalArs = [...byCategory.values()].reduce((sum, v) => sum + v.amountArs, 0);
    return [...byCategory.entries()]
      .sort((a, b) => b[1].amountArs - a[1].amountArs)
      .map(([name, v], i) => ({
        name,
        color: PALETTE[i % PALETTE.length],
        amount: this.toDisplay(v.amountArs),
        count: v.count,
        pct: totalArs > 0 ? Math.round((v.amountArs / totalArs) * 100) : 0
      }));
  });

  protected readonly breakdownTotal = computed(() =>
    this.breakdown().reduce((sum, b) => sum + b.amount, 0)
  );

  protected readonly breakdownCategoryCount = computed(() => this.breakdown().length);

  protected readonly categoryGaugeGradient = computed(() => {
    const items = this.breakdown();
    if (items.length === 0) return this.cssVar('--divider');
    let acc = 0;
    const stops: string[] = [];
    for (const item of items) {
      const start = acc;
      acc += item.pct;
      stops.push(`${item.color} ${start}% ${acc}%`);
    }
    return stops.join(', ');
  });

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

    effect(() => {
      const filters = this.activeFilters();
      this.loading.set(true);
      this.transactionsService.findAll(filters).subscribe((tx) => {
        this.monthTransactions.set(tx);
        this.loading.set(false);
      });
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
    });
  }

  prevMonth(): void {
    this.shiftMonth(-1);
  }

  nextMonth(): void {
    this.shiftMonth(1);
  }

  private shiftMonth(delta: number): void {
    let m = this.monthIndex() + delta;
    let y = this.year();
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    this.monthIndex.set(m);
    this.year.set(y);
  }

  setYear(value: string): void {
    this.year.set(Number(value));
  }

  setFilterMode(mode: FilterMode): void {
    this.filterMode.set(mode);
  }

  setRangeFrom(value: string): void {
    this.rangeFrom.set(value);
    this.rangePreset.set(null);
  }

  setRangeTo(value: string): void {
    this.rangeTo.set(value);
    this.rangePreset.set(null);
  }

  setRangePresetMonths(key: string, months: number): void {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth() - months + 1, 1);
    this.rangeFrom.set(from.toISOString().slice(0, 10));
    this.rangeTo.set(to.toISOString().slice(0, 10));
    this.rangePreset.set(key);
  }

  setRangePresetYears(key: string, years: number): void {
    const to = new Date();
    const from = new Date(to.getFullYear() - years + 1, 0, 1);
    this.rangeFrom.set(from.toISOString().slice(0, 10));
    this.rangeTo.set(to.toISOString().slice(0, 10));
    this.rangePreset.set(key);
  }

  setRangePresetThisYear(): void {
    const now = new Date();
    this.rangeFrom.set(`${now.getFullYear()}-01-01`);
    this.rangeTo.set(now.toISOString().slice(0, 10));
    this.rangePreset.set('this-year');
  }

  setRangePresetLastYear(): void {
    const lastYear = new Date().getFullYear() - 1;
    this.rangeFrom.set(`${lastYear}-01-01`);
    this.rangeTo.set(`${lastYear}-12-31`);
    this.rangePreset.set('last-year');
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

  private cssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
}
