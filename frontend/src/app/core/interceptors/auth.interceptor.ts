import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { isApiUrl } from '../api.config';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const authorizedReq = token && isApiUrl(req.url)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isApiUrl(req.url)) {
        // Un 401 en /api/iol/** puede ser "se vencio la sesion de IOL" (el proxy lo marca con
        // error: "IOL Error") o, como cualquier otro endpoint, "se vencio la sesion de fintrack".
        // Solo el primer caso debe evitar el logout global - el segundo se trata igual que siempre.
        const isGenuineIolError = (error.error as { error?: string } | null)?.error === 'IOL Error';
        if (!isGenuineIolError) {
          authService.clearSession();
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
