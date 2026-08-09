# Spec: Google Login + Multi-user Auth

## What it solves

Today the app is single-user with no login. This adds Google OAuth2 login and turns the app multi-user: each user only sees and manages their own transactions.

## Scope

Includes:
- "Sign in with Google" flow (OAuth2 authorization code, Google as the only provider).
- Backend issues its own JWT after a successful Google login; Angular sends it as `Authorization: Bearer <token>` on every API call.
- A `User` entity (`id`, `googleId`, `email`, `name`, `pictureUrl`), created on first login.
- `Transaction` gets an owner (`userId`) — every transaction query/write is scoped to the authenticated user.
- `Category` stays **global/shared** across all users (not per-user) — see Data model below.

Does not include (yet):
- Other login providers (email/password, GitHub, etc.).
- Roles/admin panel.
- Refresh token rotation / logout-everywhere (a simple JWT expiry is enough for v1).
- Per-user categories (explicitly out of scope — see decision below).

## Data model

**User** (new, `auth.model` or `user.model`)
- `id`, `googleId` (unique), `email`, `name`, `pictureUrl`, `createdAt`

**Transaction** (modified)
- add `user` (`@ManyToOne` -> `User`, not nullable)
- every repository query gains a `userId` filter; `TransactionService` gets the current user from the security context (never trusts a `userId` passed by the client)

**Category** (unchanged)
- Stays global/shared — every user picks from the same category list. This was a deliberate choice over per-user categories, to keep the "max 10 categories" constraint simple and shared rather than duplicated per user.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/oauth2/authorization/google` | Spring Security's standard entry point, redirects to Google |
| GET | `/login/oauth2/code/google` | Google's callback (handled by Spring Security OAuth2 client) |
| POST | `/api/auth/token` | After OAuth2 login succeeds, exchange the Spring session for this app's JWT (or issue it directly in the OAuth2 success handler — decide during implementation) |
| GET | `/api/auth/me` | Return the authenticated user's profile from the JWT |

All `/api/transactions/**` and `/api/categories/**` endpoints require a valid JWT from here on (`401` if missing/invalid/expired).

## Edge cases / business rules

- First-time Google login auto-creates the `User` row (no separate signup step).
- A `Transaction` can never be read, updated, or deleted by a user other than its owner -> `404` (not `403`, to avoid leaking existence of other users' data), same pattern as `ResourceNotFoundException`.
- JWT expiry: short-lived (e.g. 1h) is enough for v1 given there's no refresh flow yet — user just logs in again via Google when it expires.
- `Category` writes (create/update/delete) — decide during implementation whether any authenticated user can manage the shared category list, or whether that needs its own restriction. Flag this as an open question to resolve before implementing `CategoryController` changes.

## Out of scope / future

- Per-user categories (if the shared-list approach proves limiting later).
- Refresh tokens, "remember me", logout-everywhere.
- Additional OAuth providers.
- Roles/admin.
