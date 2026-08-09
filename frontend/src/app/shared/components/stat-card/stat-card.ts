import { Component, input } from '@angular/core';

export type StatCardTone = 'default' | 'income' | 'expense' | 'warn';

// Tarjeta de resumen del dashboard (ej. ingreso/gasto/balance por moneda).
@Component({
  selector: 'app-stat-card',
  imports: [],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss'
})
export class StatCard {
  label = input.required<string>();
  value = input.required<string>();
  tone = input<StatCardTone>('default');
}
