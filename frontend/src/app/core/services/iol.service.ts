import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { IolLoginRequest, IolPortfolioResponse, IolTokenResponse } from '../models/iol.model';

const BASE_URL = `${API_BASE_URL}/api/iol`;
const TOKEN_KEY = 'fintrack.iolToken';
const REFRESH_TOKEN_KEY = 'fintrack.iolRefreshToken';
const REFRESH_MARGIN_MS = 60 * 1000; // refresca 1 min antes de que venza, no cuando ya vencio

// Token de IOL: vive solo en sessionStorage del navegador (se borra al cerrar la pestaña),
// nunca en la base de datos ni en localStorage. El backend tampoco lo cachea entre requests.
@Injectable({ providedIn: 'root' })
export class IolService {
  private readonly http = inject(HttpClient);

  private readonly tokenSignal = signal<string | null>(sessionStorage.getItem(TOKEN_KEY));
  private readonly refreshTokenSignal = signal<string | null>(sessionStorage.getItem(REFRESH_TOKEN_KEY));
  readonly connected = computed(() => !!this.tokenSignal());

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  async login(username: string, password: string): Promise<void> {
    const body: IolLoginRequest = { username, password };
    const response = await firstValueFrom(this.http.post<IolTokenResponse>(`${BASE_URL}/login`, body));
    this.storeTokens(response);
  }

  async refresh(): Promise<void> {
    const refreshToken = this.refreshTokenSignal();
    if (!refreshToken) return;
    const response = await firstValueFrom(
      this.http.post<IolTokenResponse>(`${BASE_URL}/refresh`, { refreshToken })
    );
    this.storeTokens(response);
  }

  getPortfolio() {
    const token = this.tokenSignal();
    return this.http.get<IolPortfolioResponse>(`${BASE_URL}/portfolio`, {
      headers: { 'X-Iol-Token': token ?? '' }
    });
  }

  disconnect(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    this.tokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private storeTokens(response: IolTokenResponse): void {
    sessionStorage.setItem(TOKEN_KEY, response.accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    this.tokenSignal.set(response.accessToken);
    this.refreshTokenSignal.set(response.refreshToken);
    this.scheduleRefresh(response.expiresInSeconds);
  }

  private scheduleRefresh(expiresInSeconds: number): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const delayMs = Math.max(expiresInSeconds * 1000 - REFRESH_MARGIN_MS, 5000);
    this.refreshTimer = setTimeout(() => {
      this.refresh().catch(() => this.disconnect());
    }, delayMs);
  }
}
