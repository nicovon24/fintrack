import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CategoryResponse } from '../../../core/models/category.model';
import { Currency, TransactionRequest, TransactionResponse } from '../../../core/models/transaction.model';

// Fila de edicion inline (no modal): monto, fecha, categoria, descripcion, moneda + cotizacion si es USD.
@Component({
  selector: 'tr[app-transaction-edit-dialog]',
  imports: [FormsModule],
  templateUrl: './transaction-edit-dialog.html',
  styleUrl: './transaction-edit-dialog.scss'
})
export class TransactionEditDialog {
  transaction = input.required<TransactionResponse>();
  categories = input.required<CategoryResponse[]>();
  saved = output<TransactionRequest>();
  cancelled = output<void>();

  readonly draftDate = signal('');
  readonly draftCategoryId = signal<number | null>(null);
  readonly draftDescription = signal('');
  readonly draftAmount = signal('');
  readonly draftCurrency = signal<Currency>('ARS');
  readonly draftRate = signal('');

  constructor() {
    effect(() => {
      const tx = this.transaction();
      this.draftDate.set(tx.date);
      this.draftCategoryId.set(tx.category.id);
      this.draftDescription.set(tx.description ?? '');
      this.draftAmount.set(String(tx.amount));
      this.draftCurrency.set(tx.currency);
      this.draftRate.set(tx.exchangeRate ? String(tx.exchangeRate) : '');
    });
  }

  setDraftCategoryId(value: string): void {
    this.draftCategoryId.set(Number(value));
  }

  setDraftCurrency(value: string): void {
    this.draftCurrency.set(value as Currency);
  }

  save(): void {
    const categoryId = this.draftCategoryId();
    if (!categoryId || !this.draftAmount() || !this.draftDate()) return;

    this.saved.emit({
      type: this.transaction().type,
      amount: Number(this.draftAmount()) || 0,
      date: this.draftDate(),
      description: this.draftDescription() || null,
      categoryId,
      currency: this.draftCurrency(),
      exchangeRate: this.draftCurrency() === 'USD' ? Number(this.draftRate()) || 0 : null
    });
  }
}
