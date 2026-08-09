import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../auth.service';

// Ruta /auth/callback: lee ?token= de la URL (que llega del redirect del backend
// tras el login con Google) y lo guarda via AuthService, despues redirige al dashboard.
@Component({
  selector: 'app-auth-callback',
  imports: [RouterLink],
  templateUrl: './auth-callback.html',
  styleUrl: './auth-callback.scss'
})
export class AuthCallback {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly error = signal(false);

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.error.set(true);
      return;
    }
    this.authService
      .handleCallback(token)
      .then(() => this.router.navigateByUrl('/'))
      .catch(() => this.error.set(true));
  }
}
