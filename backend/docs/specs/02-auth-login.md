# Spec: Google Login + Roles + Multi-user Auth

## What it solves

Today the app is single-user with no login. This adds Google OAuth2 login and turns the app multi-user: each user only sees and manages their own transactions. It also introduces a role system (`ADMIN`/`USER`) — the shared category list is admin-managed, not open to every user.

## Scope

Includes:
- "Sign in with Google" flow (OAuth2 authorization code, Google as the only provider).
- Backend issues its own JWT after a successful Google login; Angular sends it as `Authorization: Bearer <token>` on every API call.
- A `User` entity (`id`, `googleId`, `email`, `name`, `pictureUrl`, `role`, `createdAt`), created on first login.
- `Role { ADMIN, USER }`. The Google account with email `nicovon24@gmail.com` is always created as `ADMIN`; every other account is `USER`. This is a hardcoded check in `UserService`, not configurable — no env var, no manual DB flip, no "first user wins" ambiguity.
- `Transaction` gets an owner (`user`) — every transaction query/write is scoped to the authenticated user.
- `Category` stays **global/shared** across all users, but writes (create/update/delete) are **admin-only** — see Data model below.

Does not include (yet):
- Other login providers (email/password, GitHub, etc.).
- An admin UI/panel — role enforcement is API-level only (`403` for non-admins on category writes).
- Promoting/demoting a user's role via API — has to be done directly in the DB for now.
- Refresh token rotation / logout-everywhere (a simple JWT expiry is enough for v1).
- Per-user categories (explicitly out of scope — see decision below).

## Data model

**User** (`user.model`)
- `id`, `googleId` (unique), `email`, `name`, `pictureUrl`, `role` (`Role`), `createdAt`

**Transaction** (modified)
- add `user` (`@ManyToOne` -> `User`)
- every repository query is scoped by `user` (`findByUserAndDateBetween`, `findByUser`, `findByIdAndUser`); `TransactionService` gets the current user from the security context via `CurrentUserProvider` (never trusts a `userId` passed by the client)

**Category** (unchanged data model)
- Stays global/shared — every user picks from the same category list. Writes require `ADMIN` (enforced in `SecurityConfig`, not in `CategoryController` itself — the controller doesn't know about roles). This was a deliberate choice over per-user categories, to keep the "max 10 categories" import constraint simple and shared rather than duplicated per user, and to keep the list curated instead of open to accidental duplicates/typos from every user.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/oauth2/authorization/google` | Spring Security's standard entry point, redirects to Google |
| GET | `/login/oauth2/code/google` | Google's callback (handled by Spring Security OAuth2 client) |
| GET | `/api/auth/me` | Return the authenticated user's profile (id, email, name, pictureUrl, role) from the JWT |

There is no separate `POST /api/auth/token` exchange endpoint — `OAuth2LoginSuccessHandler` mints the JWT directly after a successful Google login and redirects the browser to `${app.frontend-redirect-uri}?token=<jwt>`. Simpler for a SPA: one browser round-trip through Google, then the frontend has a usable token.

All `/api/transactions/**` and `/api/categories/**` endpoints require a valid JWT (`401` if missing/invalid/expired). `POST`/`PUT`/`DELETE` on `/api/categories/**` additionally require `ROLE_ADMIN` (`403` otherwise).

## Edge cases / business rules

- First-time Google login auto-creates the `User` row (no separate signup step); role is decided once, at creation time, by the hardcoded admin-email check. A user's role in the DB is never overwritten on subsequent logins, so a manual promotion later isn't clobbered.
- A `Transaction` can never be read, updated, or deleted by a user other than its owner -> `404` (not `403`, to avoid leaking existence of other users' data) — the user-scoped repository query returns nothing for a transaction that isn't the caller's, so `getTransactionOrThrow` throws `ResourceNotFoundException` the same way it does for a nonexistent id.
- JWT expiry: 1h by default (`app.jwt.expiration-ms`), short-lived enough for v1 given there's no refresh flow — user just logs in again via Google when it expires.
- `Category` writes are admin-only, resolved (not left open) — see Data model above.
- Google credentials (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`) are env vars with no default — login won't complete against real Google until they're set.

## Out of scope / future

- Per-user categories (if the shared-list approach proves limiting later).
- Refresh tokens, "remember me", logout-everywhere.
- Additional OAuth providers.
- An admin UI/panel, role management via API.
