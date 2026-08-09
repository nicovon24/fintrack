# Service Rules

- `@Injectable({ providedIn: 'root' })` for anything shared app-wide (auth, interceptors). Feature services can also be `providedIn: 'root'` unless there's a real reason to scope them to a route.
- All backend calls go through `inject(HttpClient)` inside the feature's `*.service.ts` — never call `HttpClient` from a component.
- Methods return `Observable<T>` typed against the response model in `core/models/`. Convert to a signal with `toSignal()` only at the point a template consumes it — don't store both a subject and a signal for the same data.
- Base API URL comes from Angular environment config, not hardcoded in each service.
- Error handling: let HTTP errors bubble through `catchError` at the interceptor level for cross-cutting concerns (401 -> redirect to login); handle feature-specific errors (e.g. validation messages to show the user) in the service or component, not silently swallowed.
- A service never reaches into another feature's service internals — if two features need the same data, that logic belongs in `core/` or `shared/`.
