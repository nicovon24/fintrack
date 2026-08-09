import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ApiError } from '../../core/models/api-error.model';
import { ImportConfirmResponse, ImportPreviewResponse, ImportRow } from '../../core/models/import.model';
import { CategoriesService } from '../categories/categories.service';
import { ConfirmStep } from './steps/confirm-step/confirm-step';
import { PreviewStep } from './steps/preview-step/preview-step';
import { UploadStep } from './steps/upload-step/upload-step';
import { ImportService } from './import.service';

const STEP_LABELS = ['Subir archivo', 'Revisar', 'Listo'];

// Orquesta el stepper de 3 pasos: upload -> preview -> confirm.
@Component({
  selector: 'app-import-wizard',
  imports: [UploadStep, PreviewStep, ConfirmStep],
  templateUrl: './import-wizard.html',
  styleUrl: './import-wizard.scss'
})
export class ImportWizard {
  private readonly importService = inject(ImportService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly router = inject(Router);

  protected readonly stepLabels = STEP_LABELS;
  protected readonly step = signal(1);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly preview = signal<ImportPreviewResponse | null>(null);
  protected readonly confirmResult = signal<ImportConfirmResponse | null>(null);
  protected readonly existingCategoryNames = signal<string[]>([]);

  constructor() {
    this.categoriesService
      .findAll()
      .subscribe((categories) => this.existingCategoryNames.set(categories.map((c) => c.name)));
  }

  onFileSelected(file: File): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.importService.preview(file).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.loading.set(false);
        this.step.set(2);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.extractErrorMessage(err));
      }
    });
  }

  backToUpload(): void {
    this.step.set(1);
    this.preview.set(null);
    this.errorMessage.set(null);
  }

  onRowsConfirmed(rows: ImportRow[]): void {
    this.errorMessage.set(null);
    this.importService.confirm({ rows }).subscribe({
      next: (result) => {
        this.confirmResult.set(result);
        this.step.set(3);
      },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.extractErrorMessage(err))
    });
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    const apiError = err.error as ApiError | undefined;
    if (apiError?.messages?.length) {
      return apiError.messages.join(' — ');
    }
    return 'No se pudo procesar el archivo. Verificá que sea un .xlsx, .csv o .txt válido.';
  }

  goToDashboard(): void {
    this.router.navigateByUrl('/');
  }
}
