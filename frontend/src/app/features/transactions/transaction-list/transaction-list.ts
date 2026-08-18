import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CategoryResponse } from '../../../core/models/category.model';
import { TransactionRequest, TransactionResponse } from '../../../core/models/transaction.model';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { CurrencyBadge } from '../../../shared/components/currency-badge/currency-badge';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { CategoriesService } from '../../categories/categories.service';
import { TransactionEditDialog } from '../transaction-edit-dialog/transaction-edit-dialog';
import { TransactionsService } from '../transactions.service';

type TypeFilter = 'todos' | 'INCOME' | 'EXPENSE';
type CurrencyFilter = 'todas' | 'ARS' | 'USD';

// Tabla admin de transacciones: filtros (mes/tipo/categoria/moneda), editar, borrar.
@Component({
  selector: 'app-transaction-list',
  imports: [FormsModule, CurrencyBadge, CurrencyFormatPipe, DatePipe, TransactionEditDialog, ConfirmDialog, Skeleton],
  templateUrl: './transaction-list.html',
  styleUrl: './transaction-list.scss'
})
export class TransactionList {
  private readonly transactionsService = inject(TransactionsService);
  private readonly categoriesService = inject(CategoriesService);

  protected readonly transactions = signal<TransactionResponse[]>([]);
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly loading = signal(true);

  // Filas fantasma mientras carga. Los anchos imitan el largo tipico de cada columna
  // (fecha, categoria, descripcion, monto, cotizacion, acciones).
  protected readonly skeletonRows = Array.from({ length: 8 });
  protected readonly skeletonCells = ['72px', '80%', '90%', '70%', '38px', '60%'];

  protected readonly typeFilter = signal<TypeFilter>('todos');
  protected readonly categoryFilter = signal<'todas' | number>('todas');
  protected readonly currencyFilter = signal<CurrencyFilter>('todas');

  protected readonly editingId = signal<number | null>(null);
  protected readonly deleteConfirmId = signal<number | null>(null);

  protected readonly filteredTransactions = computed(() =>
    this.transactions()
      .filter((tx) => {
        if (this.typeFilter() !== 'todos' && tx.type !== this.typeFilter()) return false;
        if (this.categoryFilter() !== 'todas' && tx.category.id !== this.categoryFilter()) return false;
        if (this.currencyFilter() !== 'todas' && tx.currency !== this.currencyFilter()) return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))
  );

  constructor() {
    this.reload();
    this.categoriesService.findAll().subscribe((categories) => this.categories.set(categories));
  }

  private reload(): void {
    this.loading.set(true);
    this.transactionsService.findAll().subscribe((transactions) => {
      this.transactions.set(transactions);
      this.loading.set(false);
    });
  }

  setTypeFilter(value: string): void {
    this.typeFilter.set(value as TypeFilter);
  }

  setCategoryFilter(value: string): void {
    this.categoryFilter.set(value === 'todas' ? 'todas' : Number(value));
  }

  setCurrencyFilter(value: string): void {
    this.currencyFilter.set(value as CurrencyFilter);
  }

  startEdit(id: number): void {
    this.editingId.set(id);
    this.deleteConfirmId.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(id: number, request: TransactionRequest): void {
    this.transactionsService.update(id, request).subscribe((updated) => {
      this.transactions.update((list) => list.map((t) => (t.id === id ? updated : t)));
      this.editingId.set(null);
    });
  }

  requestDelete(id: number): void {
    this.deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  confirmDelete(id: number): void {
    this.transactionsService.delete(id).subscribe(() => {
      this.transactions.update((list) => list.filter((t) => t.id !== id));
      this.deleteConfirmId.set(null);
    });
  }
}
