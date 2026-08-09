# Testing Rules

- Vitest + `jsdom`, following the existing `*.spec.ts` convention (e.g. `app.spec.ts`).
- Test file colocated next to the file it tests.
- Components: test observable behavior (rendered output, emitted events) via `TestBed`, not internal implementation details.
- Services: mock `HttpClient` with `HttpTestingController` (or Vitest mocks for `inject()`-based deps) — never hit the real backend in a unit test.
- Test names in English, describing behavior (e.g. `should redirect to login when token is missing`) — unlike backend's Spanish test-name convention, this stays English per this file's own convention until decided otherwise.
