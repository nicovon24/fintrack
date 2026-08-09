# Routing Rules

- Routes defined in `app.routes.ts` using the standalone `loadComponent`/`loadChildren` lazy-loading style — never `NgModule`-based routing.
- Every feature route lazy-loads its root component: `loadComponent: () => import('./features/x/x').then(m => m.X)`.
- Guards live in `core/auth/` (`auth.guard.ts`, `admin.guard.ts`) as functional guards (`CanActivateFn`), not class-based guards.
- Protected routes get `canActivate: [authGuard]`; admin-only routes additionally get `adminGuard`.
- Route params/query params read via `inject(ActivatedRoute)` + signals (`toSignal(route.paramMap)`), not manual subscriptions left unmanaged.
