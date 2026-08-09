import { Component, output, signal } from '@angular/core';

// Paso 1: dropzone para el .xlsx + link a la plantilla descargable.
@Component({
  selector: 'app-upload-step',
  imports: [],
  templateUrl: './upload-step.html',
  styleUrl: './upload-step.scss'
})
export class UploadStep {
  fileSelected = output<File>();

  readonly pickedFile = signal<File | null>(null);

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pickedFile.set(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) this.pickedFile.set(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  continue(): void {
    const file = this.pickedFile();
    if (file) this.fileSelected.emit(file);
  }
}
