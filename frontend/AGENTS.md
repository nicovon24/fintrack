# FinTrack Frontend - AI Agent Guidelines

## Project Overview

Angular SPA for personal finance management: transactions, categories, excel/CSV import wizard, dashboard/analytics with combined ARS+USD (dolar-blue-pesified) totals, and an investments module (live IOL portfolio, manual savings, consolidated net worth). A sidebar "privacy mode" toggle masks all displayed amounts for demos. Consumes the `backend/` REST API. Auth via Google OAuth2 (JWT).

## Rule-Selection Guide (Token Optimization)

Read ONLY the rule files relevant to your current task. Always read `general.md` first (it's short).

| Task | Read these files |
|---|---|
| Create/modify a component | `component-rules.md` |
| Create/modify a service (HTTP/state) | `service-rules.md` |
| Routing / guards | `routing-rules.md` |
| Styling / SCSS | `styling-rules.md` |
| Write tests | `testing-rules.md` |
| Full feature (all layers) | `component-rules.md`, `service-rules.md`, `routing-rules.md`, `testing-rules.md` |

## Stack

- **Angular 22** — standalone components only, no NgModules
- **Signals** for local/component state (no NgRx/Akita — not needed at this scale)
- **RxJS** for HTTP streams and async composition (interop with signals via `toSignal` where useful)
- **Vitest** + `jsdom` for tests
- **Prettier** for formatting
- Native control flow (`@if`, `@for`, `@switch`) — never `*ngIf`/`*ngFor`

## Architecture: package-by-feature

```
src/app/
├── core/          # cross-cutting singletons: auth, interceptors, shared models
│   ├── auth/
│   ├── interceptors/
│   └── models/
├── features/      # one folder per feature, self-contained
│   └── {feature}/
│       ├── {feature}.ts / .html / .scss   # smart/container component
│       ├── {feature}.service.ts           # HTTP calls + state for this feature
│       └── {sub-component}/               # dumb/presentational sub-components
└── shared/        # reusable, feature-agnostic building blocks
    ├── components/
    └── pipes/
```

Golden rule: a component's `.ts`/`.html`/`.scss` stay together in the same folder. If a feature grows sub-views (e.g. `import-wizard/steps/`), nest them under the feature, not in `shared/`.

`shared/` only holds things with zero feature knowledge (a currency badge, a confirm dialog, a formatting pipe). If it references a specific feature's domain model, it belongs in that feature's folder instead.

## Communication with backend

- All HTTP calls go through a feature's `*.service.ts`, injected with `inject(HttpClient)`.
- Components never call `HttpClient` directly — always through a service.
- Auth token attached via `core/interceptors/auth.interceptor.ts`, not manually per-request.

## Commands

```bash
npm start          # ng serve
npm run build       # ng build
npm test            # vitest
```

## Language Policy

- Code comments, commit messages, README/docs, `.agentic-rules/` prose: **English**.
- UI text — labels, buttons, messages shown to the user: **Spanish**.
- Identifiers (components, services, variables, selectors): English, as usual.

## General Rules

1. Standalone components + signals; no NgModules, no `*ngIf`/`*ngFor`.
2. Keep the architecture simple. Don't reach for a state library until the app actually needs it.
3. Follow each layer's rules in `.agentic-rules/`.
4. Before considering a task done: verify it builds (`npm run build`) and tests pass (`npm test`).
5. Every non-trivial new feature should have its spec in root `../docs/specs/` before being implemented.
