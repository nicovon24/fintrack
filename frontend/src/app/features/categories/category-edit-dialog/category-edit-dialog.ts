import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CategoryRequest, CategoryResponse } from '../../../core/models/category.model';
import { TransactionType } from '../../../core/models/transaction.model';

// Fila de edicion inline (no modal) para una categoria existente.
@Component({
  selector: 'app-category-edit-dialog',
  imports: [FormsModule],
  templateUrl: './category-edit-dialog.html',
  styleUrl: './category-edit-dialog.scss'
})
export class CategoryEditDialog {
  category = input.required<CategoryResponse>();
  saved = output<CategoryRequest>();
  cancelled = output<void>();

  readonly draftName = signal('');
  readonly draftType = signal<TransactionType>('EXPENSE');

  constructor() {
    effect(() => {
      const cat = this.category();
      this.draftName.set(cat.name);
      this.draftType.set(cat.type);
    });
  }

  setDraftName(value: string): void {
    this.draftName.set(value);
  }

  setDraftType(value: string): void {
    this.draftType.set(value as TransactionType);
  }

  save(): void {
    if (!this.draftName().trim()) return;
    this.saved.emit({ name: this.draftName().trim(), type: this.draftType() });
  }
}
