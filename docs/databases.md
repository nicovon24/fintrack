# Databases — fintrack

## Engine

- PostgreSQL. Connection: `jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:55432}/${DB_NAME:gastosdb}` (`backend/src/main/resources/application.yaml`).
- Schema managed by Hibernate auto-DDL (`spring.jpa.hibernate.ddl-auto: update`) — **no migration files** (no Flyway/Liquibase). Schema is derived directly from JPA entities below; adding/renaming a field in the entity changes the DB on next boot.
- Single database, single schema (`public`), no multi-tenancy.

## Tables

### `categories`

Source: `Category.java` (`category/model/Category.java`)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `bigint` | NOT NULL (PK) | Identity / auto-increment (`GenerationType.IDENTITY`) |
| `name` | `varchar(255)` | nullable | Category display name |
| `type` | `enum('EXPENSE','INCOME')` | nullable | Stored as string (`EnumType.STRING`), one of `TransactionType` |

No unique constraint on `(name, type)` at the DB level — uniqueness is only enforced in application code (`CategoryService`, case-insensitive match on name+type). Category writes are admin-only at the API level (`02-auth-login.md`), not enforced by the schema itself.

### `users`

Source: `User.java` (`user/model/User.java`)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `bigint` | NOT NULL (PK) | Identity / auto-increment |
| `google_id` | `varchar(255)` | nullable | Google's `sub` claim, unique per account (uniqueness enforced in application code via `findByGoogleId`, not a DB constraint) |
| `email` | `varchar(255)` | nullable | From Google profile. `nicovon24@gmail.com` is hardcoded as the one account that gets created as `ADMIN` (`UserService`) |
| `name` | `varchar(255)` | nullable | From Google profile |
| `picture_url` | `varchar(255)` | nullable | From Google profile |
| `role` | `enum('ADMIN','USER')` | nullable | `Role`, stored as string. Decided once at row creation, never overwritten on later logins |
| `created_at` | `timestamp` | nullable | Set at creation |

### `transactions`

Source: `Transaction.java` (`transaction/model/Transaction.java`)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `bigint` | NOT NULL (PK) | Identity / auto-increment |
| `type` | `enum('EXPENSE','INCOME')` | nullable | `TransactionType` |
| `amount` | `numeric(38,2)` | nullable | Amount in the transaction's own `currency` (not necessarily ARS). Validated `> 0` at the DTO level (`@Positive`), not at the DB level |
| `date` | `date` | nullable | Transaction date |
| `description` | `varchar(255)` | nullable | Free text |
| `category_id` | `bigint` | nullable | FK → `categories.id` |
| `currency` | `enum('ARS','USD')` | nullable | `Currency` enum, stored as string |
| `exchange_rate` | `numeric(38,2)` | nullable | ARS-per-1-USD rate at the transaction's date. Required (business rule, not DB constraint) when `currency = USD`; must be `null` when `currency = ARS` — enforced in `TransactionService`/import validation, not by the schema |
| `user_id` | `bigint` | nullable | FK → `users.id`. Every query is scoped by this (`TransactionRepository.findByUser*`) — a transaction belonging to another user is invisible, not just forbidden |

## Relationships

```
categories (1) ──── (N) transactions
                        FK: transactions.category_id -> categories.id

users (1) ──── (N) transactions
                  FK: transactions.user_id -> users.id
```

- `@ManyToOne` from `Transaction` to `Category` and from `Transaction` to `User`, no cascade configured, no `orphanRemoval`.
- Deleting a `Category` that still has `Transaction`s referencing it will fail on the FK constraint (no cascade delete) — the `CategoryService.delete` endpoint doesn't currently guard against this explicitly, the DB just rejects it.
- `Category` has no `user_id` — it's global/shared across all users by design, not per-user.

## Enums (Java, mapped as Postgres string-backed enums via `EnumType.STRING`)

- `TransactionType`: `INCOME`, `EXPENSE` — shared by `Category.type` and `Transaction.type`.
- `Currency`: `ARS`, `USD` — `Transaction.currency` only.
- `Role`: `ADMIN`, `USER` — `User.role` only.

## Not yet in the schema (planned / out of scope for now)

- No import history/audit table — Excel imports leave no trace of when/how a `Transaction` was created (manual vs. import).
- No soft-delete columns — deletes are physical (`01-gastos-ingresos-v1.md`).
- No role-management table/audit trail — a role change today means editing the `users.role` column directly in the DB.
