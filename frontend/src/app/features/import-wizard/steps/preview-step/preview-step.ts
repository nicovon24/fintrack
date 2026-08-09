import { Component, computed, input, output } from '@angular/core';

import { ImportPreviewResponse, ImportRow } from '../../../../core/models/import.model';

// Paso 2: preview de filas detectadas + errores por fila + categorias nuevas detectadas.
@Component({
  selector: 'app-preview-step',
  imports: [],
  templateUrl: './preview-step.html',
  styleUrl: './preview-step.scss'
})
export class PreviewStep {
  preview = input<ImportPreviewResponse | null>(null);
  existingCategoryNames = input<string[]>([]);
  rowsConfirmed = output<ImportRow[]>();
  backRequested = output<void>();

  readonly hasErrors = computed(() => (this.preview()?.errors.length ?? 0) > 0);

  readonly newCategories = computed(() => {
    const existing = new Set(this.existingCategoryNames());
    return (this.preview()?.distinctCategories ?? []).filter((name) => !existing.has(name));
  });

  confirm(): void {
    const preview = this.preview();
    if (!preview || this.hasErrors()) return;
    this.rowsConfirmed.emit(preview.rows);
  }
}
