import { Pipe, PipeTransform } from '@angular/core';

import { Currency } from '../../core/models/transaction.model';

@Pipe({ name: 'currencyFormat' })
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number | null | undefined, currency: Currency): string {
    const amount = Math.round(Math.abs(value ?? 0)).toLocaleString('es-AR');
    return currency === 'USD' ? `US$ ${amount}` : `$ ${amount}`;
  }
}
