import { Component, computed, effect, inject, signal } from '@angular/core';

import { DolarBlueService } from '../../core/services/dolar-blue.service';
import { TransactionResponse } from '../../core/models/transaction.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { PeriodChange, PeriodFilter } from '../../shared/components/period-filter/period-filter';
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { TransactionFilters, TransactionsService } from '../transactions/transactions.service';

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

interface MonthBucket {
  key: string;
  label: string;
  income: number;
  expense: number;
}

interface DayPoint {
  day: number;
  total: number;
  /** Coordenada X dentro del viewBox 0-100 del sparkline. */
  x: number;
  /** Coordenada Y invertida (0 arriba, 100 abajo), como espera el SVG. */
  y: number;
}

interface WeekdayBucket {
  label: string;
  total: number;
  pct: number;
}

interface CategoryFlow {
  name: string;
  income: number;
  expense: number;
  /** Ancho de cada mitad de la barra divergente, en % del maximo comun. */
  incomePct: number;
  expensePct: number;
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
  imports: [CurrencyFormatPipe, PeriodFilter, Skeleton],
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
  protected readonly loadError = signal(false);
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

  protected readonly movementCount = computed(() => this.transactions().length);

  protected readonly incomeCount = computed(
    () => this.transactions().filter((t) => t.type === 'INCOME').length
  );

  protected readonly expenseCount = computed(
    () => this.transactions().filter((t) => t.type === 'EXPENSE').length
  );

  // El gasto mas grande del periodo: suele explicar por si solo un mes caro.
  protected readonly biggestExpense = computed(() => {
    const expenses = this.transactions().filter((t) => t.type === 'EXPENSE');
    if (expenses.length === 0) return null;
    return expenses.reduce((max, tx) => (this.amountArs(tx) > this.amountArs(max) ? tx : max));
  });

  protected readonly biggestExpenseArs = computed(() => {
    const tx = this.biggestExpense();
    return tx ? this.amountArs(tx) : 0;
  });

  // La fecha viene como 'yyyy-MM-dd': se parte a mano para no pasar por Date, que
  // interpreta ese formato como UTC y corre el dia un lugar segun la zona horaria.
  protected readonly biggestExpenseLabel = computed(() => {
    const tx = this.biggestExpense();
    if (!tx) return '';
    const [, month, day] = tx.date.split('-');
    return `${tx.category.name} · ${Number(day)} ${MONTH_SHORT[Number(month) - 1]}`;
  });

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

  // Con un solo mes seleccionado el grafico mensual dibuja una unica barra, que no compara
  // nada: en ese caso se cambia por la curva de gasto acumulado dia a dia.
  protected readonly isSingleMonth = computed(() => !!this.activeFilters().month);

  protected readonly cumulativeDays = computed<DayPoint[]>(() => {
    const month = this.activeFilters().month;
    if (!month) return [];

    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();

    // Gasto de cada dia, indexado por numero de dia (1..daysInMonth).
    const perDay = new Array<number>(daysInMonth + 1).fill(0);
    for (const tx of this.transactions()) {
      if (tx.type !== 'EXPENSE') continue;
      const day = Number(tx.date.slice(8, 10));
      if (day >= 1 && day <= daysInMonth) perDay[day] += this.amountArs(tx);
    }

    const total = this.totalExpense();
    const points: DayPoint[] = [];
    let running = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      running += perDay[day];
      points.push({
        day,
        total: running,
        x: ((day - 1) / (daysInMonth - 1)) * 100,
        y: total > 0 ? 100 - (running / total) * 100 : 100
      });
    }
    return points;
  });

  /** Path del area bajo la curva: la linea mas el cierre contra la base del viewBox. */
  protected readonly cumulativeAreaPath = computed(() => {
    const points = this.cumulativeDays();
    if (points.length === 0) return '';
    return `${this.cumulativeLinePath()} L 100 100 L 0 100 Z`;
  });

  protected readonly cumulativeLinePath = computed(() => {
    const points = this.cumulativeDays();
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  });

  /** Marcas del eje X de la curva: primer dia, tres intermedios y ultimo. */
  protected readonly curveTicks = computed(() => {
    const days = this.cumulativeDays();
    if (days.length === 0) return [];
    const last = days.length;
    return [1, Math.round(last * 0.25), Math.round(last * 0.5), Math.round(last * 0.75), last];
  });

  protected readonly weekdaySpending = computed<WeekdayBucket[]>(() => {
    const totals = new Array<number>(7).fill(0);
    for (const tx of this.transactions()) {
      if (tx.type !== 'EXPENSE') continue;
      // 'yyyy-MM-dd' partido a mano: new Date(string) lo lee como UTC y corre el dia.
      const [y, m, d] = tx.date.split('-').map(Number);
      totals[new Date(y, m - 1, d).getDay()] += this.amountArs(tx);
    }
    const max = Math.max(1, ...totals);
    // Se arranca en lunes: el domingo (indice 0) va al final, como en un calendario.
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map((i) => ({
      label: WEEKDAY_SHORT[i],
      total: totals[i],
      pct: Math.round((totals[i] / max) * 100)
    }));
  });

  protected readonly busiestWeekday = computed(() => {
    const buckets = this.weekdaySpending().filter((b) => b.total > 0);
    if (buckets.length === 0) return null;
    return buckets.reduce((max, b) => (b.total > max.total ? b : max));
  });

  // Barra divergente por categoria: ingresos hacia la izquierda, gastos hacia la derecha.
  // Ambas mitades se escalan con el mismo maximo para que sean comparables entre si.
  protected readonly categoryFlows = computed<CategoryFlow[]>(() => {
    const byCategory = new Map<string, { income: number; expense: number }>();
    for (const tx of this.transactions()) {
      const entry = byCategory.get(tx.category.name) ?? { income: 0, expense: 0 };
      if (tx.type === 'INCOME') entry.income += this.amountArs(tx);
      else entry.expense += this.amountArs(tx);
      byCategory.set(tx.category.name, entry);
    }

    const max = Math.max(1, ...[...byCategory.values()].flatMap((e) => [e.income, e.expense]));
    return [...byCategory.entries()]
      .map(([name, e]) => ({
        name,
        income: e.income,
        expense: e.expense,
        incomePct: (e.income / max) * 100,
        expensePct: (e.expense / max) * 100
      }))
      .sort((a, b) => b.income + b.expense - (a.income + a.expense))
      .slice(0, 7);
  });

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
          this.transactions.set(tx);
          this.loading.set(false);
        },
        // Sin esta rama el skeleton quedaba girando para siempre ante un error de red.
        error: () => {
          if (id !== requestId) return;
          this.transactions.set([]);
          this.loadError.set(true);
          this.loading.set(false);
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

  barHeight(value: number): number {
    return this.maxBarValue() > 0 ? Math.round((value / this.maxBarValue()) * 100) : 0;
  }
}
