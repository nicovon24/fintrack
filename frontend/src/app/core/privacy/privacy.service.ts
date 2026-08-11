import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'fintrack.privacy';

// Modo privado: tapa montos para demos/capturas sin exponer datos reales. Persiste en
// localStorage (igual que ThemeService) porque el riesgo es asimetrico: quedar prendido
// de mas es solo una molestia, apagarse solo justo antes de compartir pantalla es la fuga
// que esta feature existe para evitar.
@Injectable({ providedIn: 'root' })
export class PrivacyService {
  readonly masked = signal<boolean>(this.readInitial());

  toggle(): void {
    const next = !this.masked();
    this.masked.set(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  private readInitial(): boolean {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }
}
