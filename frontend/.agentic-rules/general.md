# General Rules

- Standalone components everywhere. Never generate an `NgModule`.
- Use `inject()` for dependency injection, not constructor injection — consistent with signal-based Angular style.
- Prefer signals (`signal`, `computed`, `effect`) for component/service state over plain fields or manual RxJS subjects, unless the value is inherently a stream (HTTP responses, router events) — those stay RxJS and get converted to a signal with `toSignal()` at the boundary if a template needs to read them.
- Native control flow only: `@if`, `@for` (with `track`), `@switch`. Never `*ngIf`, `*ngFor`, `*ngSwitch`.
- No `any`. Type HTTP responses against `core/models/*.model.ts` interfaces matching the backend's DTOs.
- Don't introduce a new npm dependency (UI kit, state library, date library) without a clear need — this app runs on plain Angular + a few small utilities today.
