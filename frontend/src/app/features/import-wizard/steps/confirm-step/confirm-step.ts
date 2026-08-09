import { Component, input, output } from '@angular/core';

import { ImportConfirmResponse } from '../../../../core/models/import.model';

// Paso 3: resumen de cuantas transacciones se importaron.
@Component({
  selector: 'app-confirm-step',
  imports: [],
  templateUrl: './confirm-step.html',
  styleUrl: './confirm-step.scss'
})
export class ConfirmStep {
  result = input<ImportConfirmResponse | null>(null);
  goToDashboard = output<void>();
}
