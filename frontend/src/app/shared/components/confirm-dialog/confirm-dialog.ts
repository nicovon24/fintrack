import { Component, input, output } from '@angular/core';

// Confirmacion generica para acciones destructivas (borrar transaccion/categoria).
@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss'
})
export class ConfirmDialog {
  message = input.required<string>();
  confirmed = output<void>();
  cancelled = output<void>();
}
