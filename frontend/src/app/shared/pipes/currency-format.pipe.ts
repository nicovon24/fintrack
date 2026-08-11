import { inject, Pipe, PipeTransform } from '@angular/core';

import { Currency } from '../../core/models/transaction.model';
import { PrivacyService } from '../../core/privacy/privacy.service';

// pure:false: togglear PrivacyService.masked no cambia los argumentos del binding, asi que
// un pipe puro seguiria devolviendo el string cacheado de antes del toggle.
@Pipe({ name: 'currencyFormat', pure: false })
export class CurrencyFormatPipe implements PipeTransform {
  private readonly privacy = inject(PrivacyService);

  // compact: para lugares con poco espacio (centro del donut) -> "$ 9,8 M" en vez de "$ 9.820.892".
  transform(value: number | null | undefined, currency: Currency, compact = false): string {
    const raw = value ?? 0;
    const symbol = currency === 'USD' ? 'US$' : '$';
    if (this.privacy.masked()) {
      return `${symbol} ••••`;
    }
    if (compact) {
      return this.compact(raw, currency);
    }
    // Importes chicos (cotizaciones tipo US$1,088) pierden todo el sentido redondeados a entero.
    const decimals = Math.abs(raw) < 1000 && !Number.isInteger(raw) ? 2 : 0;
    const amount = raw.toLocaleString('es-AR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    // El signo va pegado al simbolo (-$ 1.234), no entre medio ($ -1.234).
    return raw < 0 ? `-${symbol} ${amount.replace('-', '')}` : `${symbol} ${amount}`;
  }

  private compact(raw: number, currency: Currency): string {
    const symbol = currency === 'USD' ? 'US$' : '$';
    const abs = Math.abs(raw);
    const sign = raw < 0 ? '-' : '';

    let scaled = abs;
    let suffix = '';
    if (abs >= 1_000_000) {
      scaled = abs / 1_000_000;
      suffix = ' M';
    } else if (abs >= 10_000) {
      scaled = abs / 1_000;
      suffix = ' K';
    }

    const decimals = suffix && scaled < 100 ? 1 : 0;
    const amount = scaled.toLocaleString('es-AR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return `${sign}${symbol} ${amount}${suffix}`;
  }
}
