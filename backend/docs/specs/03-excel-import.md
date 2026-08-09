# Spec: Excel Import Wizard

## What it solves

Users have existing personal finance history in excel files. This lets them bulk-import a year (or more) of transactions in one go, through a guided wizard, instead of entering everything by hand through the CRUD. The wizard also lets the user fix rows in-place before confirming, instead of only "reject and re-upload."

## Scope

Includes:
- Wizard (frontend) backed by 2 backend endpoints:
  1. **Upload & preview**: user picks the `.xlsx` file. Backend parses it, returns detected rows + distinct categories found + any row-level errors. If more than 10 distinct categories are found, or any row references a category that doesn't exist, reject the whole file here with a clear error.
  2. **Confirm**: user reviews the preview — and can edit any field of any row directly in the UI (amount, date, category, currency, etc.) — then confirms. The frontend sends the (possibly edited) row list as JSON; the backend re-validates every row against the same rules and, only if all of them pass, persists all rows as `Transaction`s.
- Fixed expected columns, exact headers, in this order: `Fecha`, `Tipo`, `Categoria`, `Concepto`, `Monto`, followed by optional `Moneda` and `Cotizacion` columns. A `Mes` column, if present, is ignored (redundant with `Fecha`).
- A downloadable template (`backend/docs/templates/transactions-template.xlsx`) so the user's file matches the expected format.
- Apache POI for reading `.xlsx`.
- **Categories are admin-managed (see `02-auth-login.md`) — import never creates one.** Any row referencing a category name that doesn't exist in the DB rejects the whole file/batch; the user has to either fix the file or ask an admin to create the category first, then retry.

Does not include (yet):
- `.xls` (old binary format) or `.csv` — `.xlsx` only.
- Duplicate detection (importing the same file twice creates duplicate transactions — no dedup logic in v1).
- Partial import / row-level skip-on-error — every row must be valid; if even one isn't, nothing is persisted (single DB transaction).

## Data model

No new entities. Reuses `Transaction` and `Category`. Imported transactions are owned by the authenticated user (`02-auth-login.md`), same as any manually-entered one.

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/transactions/import/preview` | Multipart upload of the `.xlsx`. Parses it, returns parsed rows (structured, one object per row — date, type, category, description, amount, currency, exchange rate), distinct categories found, and any validation errors (bad date format, missing column, >10 categories, non-numeric amount, unknown category, etc.). Does NOT persist anything. |
| POST | `/api/transactions/import/confirm` | JSON body: the row list from `preview`, possibly edited by the user. Re-validates every row (same rules as preview) and, if all pass, persists them as `Transaction`s in one DB transaction. Does **not** take the file — the wizard's edits only exist in what the frontend sends here. |

## Edge cases / business rules

- **Column headers**: the 5 required ones must match exactly (`Fecha`, `Tipo`, `Categoria`, `Concepto`, `Monto`), in that order — if the file is missing one, has them out of order, or has extra unrecognized columns (besides the ignored `Mes` and the optional `Moneda`/`Cotizacion`), reject with a message listing what's wrong.
- **>10 distinct categories**: reject the whole file/batch before persisting anything. Message lists how many distinct categories were found. Applies both at `preview` (from the file) and `confirm` (from the edited row list — a user could edit categories into more than 10 distinct ones).
- **Unknown category**: reject the whole file/batch, listing which category names don't exist. Applies at both `preview` and `confirm`.
- **`Tipo` values**: only `Ingreso` or `Gasto` (case-insensitive, trimmed) map to `TransactionType.INCOME`/`EXPENSE`. Anything else -> row-level validation error.
- **`Monto`**: must parse as a positive number. Reject negative or non-numeric amounts.
- **`Fecha`**: `dd/mm/yyyy` format. Unparseable dates -> validation error naming the row.
- **`Moneda`/`Cotizacion`**: optional columns, default `ARS` if absent/blank. `USD` rows require a positive `Cotizacion`; `ARS` rows must not have one (same rule as the regular transaction CRUD).
- **Empty rows**: skip silently (trailing blank rows are common in real-world excels).

## Out of scope / future

- `.xls`/`.csv` support.
- Duplicate detection across imports.
- Undo/rollback of a completed import.
