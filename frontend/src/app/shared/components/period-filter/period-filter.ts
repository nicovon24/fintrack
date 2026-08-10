import { Component, computed, effect, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TransactionFilters } from '../../../features/transactions/transactions.service';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export type PeriodFilterMode = 'month' | 'year' | 'range' | 'rangeCustom';

export interface PeriodChange {
  filters: TransactionFilters;
  label: string;
}

// Selector de periodo reutilizable: Mes / Año / Rango (presets) / Rango custom (fechas manuales).
@Component({
  selector: 'app-period-filter',
  imports: [FormsModule],
  templateUrl: './period-filter.html',
  styleUrl: './period-filter.scss'
})
export class PeriodFilter {
  readonly changed = output<PeriodChange>();

  protected readonly mode = signal<PeriodFilterMode>('month');

  protected readonly year = signal(new Date().getFullYear());
  protected readonly monthIndex = signal(new Date().getMonth());
  protected readonly monthLabel = computed(() => `${MONTHS[this.monthIndex()]} ${this.year()}`);
  protected readonly monthKey = computed(
    () => `${this.year()}-${String(this.monthIndex() + 1).padStart(2, '0')}`
  );

  protected readonly rangeFrom = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  protected readonly rangeTo = signal(new Date().toISOString().slice(0, 10));
  protected readonly rangePreset = signal<string | null>('6m');

  protected readonly periodLabel = computed(() => {
    switch (this.mode()) {
      case 'year':
        return `Año ${this.year()}`;
      case 'range':
      case 'rangeCustom':
        return `${this.rangeFrom()} a ${this.rangeTo()}`;
      default:
        return this.monthLabel();
    }
  });

  protected readonly activeFilters = computed<TransactionFilters>(() => {
    switch (this.mode()) {
      case 'year':
        return { from: `${this.year()}-01-01`, to: `${this.year()}-12-31` };
      case 'range':
      case 'rangeCustom':
        return { from: this.rangeFrom(), to: this.rangeTo() };
      default:
        return { month: this.monthKey() };
    }
  });

  constructor() {
    this.setRangePresetMonths('6m', 6);
    effect(() => {
      this.changed.emit({ filters: this.activeFilters(), label: this.periodLabel() });
    });
  }

  setMode(mode: PeriodFilterMode): void {
    this.mode.set(mode);
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
}
