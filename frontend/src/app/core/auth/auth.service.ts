import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { UserProfileResponse } from '../models/user.model';

interface TokenResponse {
  token: string;
}

const TOKEN_KEY = 'fintrack.token';
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // sesion deslizante: token dura 30min, se renueva cada 10min mientras haya sesion activa

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly currentUserSignal = signal<UserProfileResponse | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'ADMIN');

  constructor() {
    const trySlidingRefresh = () => {
      if (this.isAuthenticated()) {
        this.refresh().catch(() => {
          /* interceptor handles 401 redirect if the token already expired */
        });
      }
    };

    setInterval(trySlidingRefresh, REFRESH_INTERVAL_MS);

    // setInterval gets throttled in a backgrounded tab, so a token can expire silently
    // while the user is away. Also refresh right when they come back to the tab.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        trySlidingRefresh();
      }
    });
  }

  login(): void {
    window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
  }

  logout(): void {
    this.clearSession();
    window.location.href = '/login';
  }

  handleCallback(token: string): Promise<UserProfileResponse> {
    localStorage.setItem(TOKEN_KEY, token);
    return this.loadCurrentUser();
  }

  async loadCurrentUser(): Promise<UserProfileResponse> {
    const user = await firstValueFrom(
      this.http.get<UserProfileResponse>(`${API_BASE_URL}/api/auth/me`)
    );
    this.currentUserSignal.set(user);
    return user;
  }

  async refresh(): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<TokenResponse>(`${API_BASE_URL}/api/auth/refresh`, {})
    );
    localStorage.setItem(TOKEN_KEY, response.token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUserSignal.set(null);
  }
}
