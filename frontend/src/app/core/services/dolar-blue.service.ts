import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

const DOLAR_BLUE_URL = 'https://dolarapi.com/v1/dolares/blue';

export interface DolarBlueQuote {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

@Injectable({ providedIn: 'root' })
export class DolarBlueService {
  private readonly http = inject(HttpClient);

  getQuote(): Observable<DolarBlueQuote> {
    return this.http.get<DolarBlueQuote>(DOLAR_BLUE_URL);
  }
}
