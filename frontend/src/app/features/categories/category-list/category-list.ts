import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/auth/auth.service';
import { CategoryRequest, CategoryResponse } from '../../../core/models/category.model';
import { TransactionResponse, TransactionType } from '../../../core/models/transaction.model';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { TransactionsService } from '../../transactions/transactions.service';
import { CategoriesService } from '../categories.service';
import { CategoryEditDialog } from '../category-edit-dialog/category-edit-dialog';

interface CategoryRow extends CategoryResponse {
  txCount: number;
  initial: string;
}

// Listado de categorias. Crear/editar/borrar solo visible/permitido para ADMIN.
@Component({
  selector: 'app-category-list',
  imports: [FormsModule, CategoryEditDialog, ConfirmDialog],
  templateUrl: './category-list.html',
  styleUrl: './category-list.scss'
})
export class CategoryList {
  private readonly categoriesService = inject(CategoriesService);
  private readonly transactionsService = inject(TransactionsService);
  protected readonly authService = inject(AuthService);

  private readonly categories = signal<CategoryResponse[]>([]);
  private readonly transactions = signal<TransactionResponse[]>([]);
  protected readonly loading = signal(true);

  protected readonly categoriesEnriched = computed<CategoryRow[]>(() =>
    this.categories().map((cat) => ({
      ...cat,
      initial: cat.name.charAt(0).toUpperCase(),
      txCount: this.transactions().filter((t) => t.category.id === cat.id).length
    }))
  );

  protected readonly editingId = signal<number | null>(null);
  protected readonly deleteConfirmId = signal<number | null>(null);
  protected readonly deleteErrorId = signal<number | null>(null);

  protected readonly newCatName = signal('');
  protected readonly newCatType = signal<TransactionType>('EXPENSE');
  protected readonly saving = signal(false);

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.categoriesService.findAll().subscribe((categories) => {
      this.categories.set(categories);
      this.loading.set(false);
    });
    this.transactionsService.findAll().subscribe((transactions) => this.transactions.set(transactions));
  }

  startEdit(id: number): void {
    this.editingId.set(id);
    this.deleteConfirmId.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(id: number, request: CategoryRequest): void {
    this.categoriesService.update(id, request).subscribe({
      next: (updated) => {
        this.categories.update((list) => list.map((c) => (c.id === id ? updated : c)));
        this.editingId.set(null);
      }
    });
  }

  requestDelete(id: number): void {
    this.deleteConfirmId.set(id);
    this.deleteErrorId.set(null);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  confirmDelete(id: number): void {
    this.categoriesService.delete(id).subscribe({
      next: () => {
        this.categories.update((list) => list.filter((c) => c.id !== id));
        this.deleteConfirmId.set(null);
      },
      error: () => {
        // Backend rechaza el borrado si la categoria tiene transacciones asociadas.
        this.deleteConfirmId.set(null);
        this.deleteErrorId.set(id);
      }
    });
  }

  setNewCatName(value: string): void {
    this.newCatName.set(value);
  }

  setNewCatType(value: string): void {
    this.newCatType.set(value as TransactionType);
  }

  addCategory(): void {
    const name = this.newCatName().trim();
    if (!name) return;
    this.saving.set(true);
    this.categoriesService.create({ name, type: this.newCatType() }).subscribe({
      next: (created) => {
        this.categories.update((list) => [...list, created]);
        this.newCatName.set('');
        this.newCatType.set('EXPENSE');
        this.saving.set(false);
      },
      error: () => this.saving.set(false)
    });
  }
}
