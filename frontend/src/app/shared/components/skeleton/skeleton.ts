import { Component, computed, input } from '@angular/core';

export type SkeletonVariant = 'text' | 'value' | 'kpi' | 'card' | 'chart' | 'row' | 'donut';

// Placeholder de carga: dibuja la silueta del contenido que viene, en vez de un "Cargando...".
// Cada variante replica el alto real de lo que reemplaza para que no salte el layout al resolver.
@Component({
  selector: 'app-skeleton',
  imports: [],
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss'
})
export class Skeleton {
  variant = input<SkeletonVariant>('text');

  /** Cuantas copias repetir (listas, filas de tabla). */
  count = input(1);

  /** Ancho opcional para las variantes de linea, ej. '60%' o '120px'. */
  width = input<string | null>(null);

  protected readonly items = computed(() => Array.from({ length: Math.max(1, this.count()) }));

  // Alturas fijas (no aleatorias): con random las barras bailan en cada render.
  protected readonly barHeights = [45, 70, 35, 85, 55, 95, 40, 65, 50, 75, 30, 60];
}
