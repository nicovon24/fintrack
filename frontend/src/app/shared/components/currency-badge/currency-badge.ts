import { Component, input } from '@angular/core';

import { Currency } from '../../../core/models/transaction.model';

// Badge visual para distinguir ARS ($) de USD (US$) - nunca mostrar un monto sin esto.
@Component({
  selector: 'app-currency-badge',
  imports: [],
  templateUrl: './currency-badge.html',
  styleUrl: './currency-badge.scss'
})
export class CurrencyBadge {
  currency = input.required<Currency>();
}
