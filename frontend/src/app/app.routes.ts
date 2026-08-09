import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login)
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./core/auth/auth-callback/auth-callback').then((m) => m.AuthCallback)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        data: { title: 'Dashboard' },
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard)
      },
      {
        path: 'import',
        data: { title: 'Import Excel' },
        loadComponent: () => import('./features/import-wizard/import-wizard').then((m) => m.ImportWizard)
      },
      {
        path: 'transactions',
        data: { title: 'Transacciones' },
        loadComponent: () =>
          import('./features/transactions/transaction-list/transaction-list').then((m) => m.TransactionList)
      },
      {
        // Lectura abierta a cualquier usuario autenticado; el adminGuard se aplica
        // a nivel de acciones dentro de category-list (crear/editar/borrar), no a la ruta.
        path: 'categories',
        data: { title: 'Categorías' },
        loadComponent: () => import('./features/categories/category-list/category-list').then((m) => m.CategoryList)
      },
      {
        path: 'investments',
        data: { title: 'Ahorros + Inversiones' },
        loadComponent: () => import('./features/investments/investments').then((m) => m.Investments)
      },
      {
        path: 'analytics',
        data: { title: 'Analytics' },
        loadComponent: () => import('./features/analytics/analytics').then((m) => m.Analytics)
      }
    ]
  }
];
