import { DecimalPipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';

import { Currency } from '../../../core/models/transaction.model';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';

// Orden fijo, nunca ciclado: el orden es lo que garantiza la separacion para daltonismo
// (validado contra la superficie de las cards). Mas alla del ultimo slot se pliega en "Otros"
// en vez de repetir o generar tonos.
const SERIES_COLORS = [
  'var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)',
  'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)'
];
const OTHER_COLOR = 'var(--series-other)';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2; // separacion entre porciones, en unidades del viewBox

export interface DonutSlice {
  label: string;
  value: number;
  meta?: string; // texto secundario opcional en la leyenda (ej. "3 mov.")
}

interface ResolvedSlice extends DonutSlice {
  color: string;
}

interface DonutArc extends ResolvedSlice {
  pct: number;
  dashArray: string;
  dashOffset: number;
}

// Donut de composicion con tooltip por porcion y leyenda que hace de switch on/off.
@Component({
  selector: 'app-donut-chart',
  imports: [CurrencyFormatPipe, DecimalPipe],
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.scss'
})
export class DonutChart {
  readonly slices = input.required<DonutSlice[]>();
  readonly currency = input.required<Currency>();
  readonly centerLabel = input('Total');
  readonly maxSlices = input(7);

  protected readonly hidden = signal<ReadonlySet<string>>(new Set());
  protected readonly hovered = signal<string | null>(null);

  // Color asignado por identidad (posicion en el ranking completo), NO por rank de lo visible:
  // ocultar una porcion no debe repintar las que quedan.
  protected readonly allSlices = computed<ResolvedSlice[]>(() => {
    const items = [...this.slices()].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
    const max = this.maxSlices();
    const named: ResolvedSlice[] = items.slice(0, max).map((item, idx) => ({
      ...item,
      color: SERIES_COLORS[idx % SERIES_COLORS.length]
    }));
    const rest = items.slice(max);
    if (rest.length > 0) {
      named.push({
        label: `Otros (${rest.length})`,
        value: rest.reduce((s, i) => s + i.value, 0),
        color: OTHER_COLOR
      });
    }
    return named;
  });

  protected readonly visibleSlices = computed(() =>
    this.allSlices().filter((s) => !this.hidden().has(s.label))
  );

  protected readonly visibleTotal = computed(() =>
    this.visibleSlices().reduce((sum, s) => sum + s.value, 0)
  );

  protected readonly arcs = computed<DonutArc[]>(() => {
    const total = this.visibleTotal();
    if (total <= 0) return [];
    const slices = this.visibleSlices();
    let acc = 0;
    return slices.map((slice) => {
      const fraction = slice.value / total;
      const length = fraction * CIRCUMFERENCE;
      const gap = slices.length > 1 ? GAP : 0;
      const drawn = Math.max(length - gap, 0.5);
      const arc: DonutArc = {
        ...slice,
        pct: fraction * 100,
        dashArray: `${drawn} ${CIRCUMFERENCE - drawn}`,
        dashOffset: -acc
      };
      acc += length;
      return arc;
    });
  });

  protected readonly hoveredArc = computed(() => {
    const label = this.hovered();
    return label ? (this.arcs().find((a) => a.label === label) ?? null) : null;
  });

  protected readonly legend = computed(() => {
    const total = this.visibleTotal();
    const hidden = this.hidden();
    return this.allSlices().map((slice) => ({
      ...slice,
      hidden: hidden.has(slice.label),
      pct: !hidden.has(slice.label) && total > 0 ? (slice.value / total) * 100 : 0
    }));
  });

  protected readonly hasHidden = computed(() => this.hidden().size > 0);

  toggleSlice(label: string): void {
    this.hidden.update((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else if (next.size < this.allSlices().length - 1) {
        // Nunca dejar el donut totalmente vacio.
        next.add(label);
      }
      return next;
    });
  }

  showAll(): void {
    this.hidden.set(new Set());
  }

  setHovered(label: string | null): void {
    this.hovered.set(label);
  }
}
