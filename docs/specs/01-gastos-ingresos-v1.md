# Spec: Income and Expenses v1 (retroactive)

> This spec was written after implementing the feature, as a reference for what already exists. From here on, new specs are written BEFORE implementing (see `_TEMPLATE.md`).

## What it solves

Minimal backend to record personal income and expenses, categorized, with a monthly summary. It's the base on which the excel import will be built and, later, the investment module.

## Scope

Includes: category CRUD, transaction CRUD (income or expense), filtering transactions by type/category/month, monthly summary (totals per category + balance).

Does not include (yet): authentication (single-user, no login), excel import, pagination (low data volume assumed for a personal user), soft-delete (delete is physical).

## Data model

**Category** (`category.model`)
- `id`, `name`, `type` (`TransactionType`: INCOME or EXPENSE)

**Transaction** (`transaction.model`)
- `id`, `type` (`TransactionType`), `amount` (BigDecimal), `date`, `description`, `category` (`@ManyToOne` -> Category)

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/categories` | List categories |
| GET | `/api/categories/{id}` | Get a category |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/{id}` | Update category |
| DELETE | `/api/categories/{id}` | Delete category |
| GET | `/api/transactions?type=&categoryId=&month=yyyy-MM` | List transactions (optional filters) |
| GET | `/api/transactions/{id}` | Get a transaction |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/{id}` | Update transaction |
| DELETE | `/api/transactions/{id}` | Delete transaction |
| GET | `/api/transactions/summary?month=yyyy-MM` | Income/expense/balance totals + breakdown by category |

## Edge cases / business rules

- `amount` must be `> 0` (`@Positive`) — the sign (income/expense) is determined by the `type` field, not the amount's sign.
- Creating a transaction with a non-existent `categoryId` -> `404` (`ResourceNotFoundException`).
- The summary (`/summary`) is always for a full month (no arbitrary date range) — keep it simple for v1.

## Out of scope / future

- Import of existing transactions from excel (Apache POI) -> next spec.
- Per-category budgets with alerts.
- Investment module (holdings, real-time quotes, ARS/USD).
