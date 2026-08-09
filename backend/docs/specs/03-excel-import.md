# Spec: Excel Import Wizard

## What it solves

Users have existing personal finance history in excel files. This lets them bulk-import a year (or more) of transactions in one go, through a guided 3-step wizard, instead of entering everything by hand through the CRUD.

## Scope

Includes:
- 3-step wizard (frontend) backed by 2-3 backend endpoints:
  1. **Upload**: user picks the `.xlsx` file.
  2. **Preview & validate**: backend parses it, returns detected rows + distinct categories found. If more than 10 distinct categories are found, reject here with a clear error — user must fix the file and re-upload (no in-wizard merge/remap step).
  3. **Confirm**: user reviews the preview and confirms; backend persists all rows as `Transaction`s.
- Fixed expected columns, exact headers, in this order: `Fecha`, `Tipo`, `Categoria`, `Concepto`, `Monto`. A `Mes` column, if present, is ignored (redundant with `Fecha`).
- A downloadable template (`backend/docs/templates/transactions-template.xlsx`) so the user's file matches the expected format. See that file for the exact headers, an example sheet with sample rows, and an "Instrucciones" sheet.
- Apache POI for reading `.xlsx`.
- Categories referenced in the file that don't exist yet get created automatically **as long as the total distinct category count in the file is ≤ 10** — this needs to be pinned down further during implementation (see open question below).

Does not include (yet):
- `.xls` (old binary format) or `.csv` — `.xlsx` only.
- Editing rows inside the wizard before confirming (reject-and-reupload is the correction mechanism for now, matching the "reject if >10 categories" decision).
- Duplicate detection (importing the same file twice creates duplicate transactions — no dedup logic in v1).
- Partial import / row-level skip-on-error — the whole file is validated first; if it's valid, all rows import together in one transaction (DB transaction, not to be confused with the domain `Transaction`).

## Data model

No new entities. Reuses `Transaction` and `Category` (see `01-gastos-ingresos-v1.md`). Once `02-auth-login.md` is implemented, imported transactions are owned by the authenticated user like any other.

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/transactions/import/preview` | Multipart upload of the `.xlsx`. Parses it, returns parsed row count, distinct categories found, and any validation errors (bad date format, missing column, >10 categories, non-numeric amount, etc.). Does NOT persist anything. |
| POST | `/api/transactions/import/confirm` | Re-sends the same file (or a token/session reference to the previously-parsed one — decide during implementation) to actually persist all rows as `Transaction`s. |

## Edge cases / business rules

- **Column headers**: must match exactly (`Fecha`, `Tipo`, `Categoria`, `Concepto`, `Monto`) — if the file is missing a required column or has extra unrecognized ones (besides the ignored `Mes`), reject with a message listing what's wrong.
- **>10 distinct categories**: reject the whole file at the preview step, before persisting anything. Message should list how many distinct categories were found.
- **`Tipo` values**: only `Ingreso` or `Gasto` (case-insensitive, trimmed) map to `TransactionType.INCOME`/`EXPENSE`. Anything else -> row-level validation error.
- **`Monto`**: must parse as a positive number (matches the existing `@Positive` rule on `Transaction.amount`). Reject files with negative or non-numeric amounts.
- **`Fecha`**: `dd/mm/yyyy` format (matches the template). Unparseable dates -> validation error naming the row.
- **Empty rows**: skip silently (trailing blank rows are common in real-world excels).

## Open questions (resolve before implementing)

1. Auto-create missing categories on import, or require the user to have pre-created all needed categories first? The spec above assumes auto-create up to the 10-category cap, but this interacts with whatever `Category` write-permission rule comes out of `02-auth-login.md`.
2. Does `import/confirm` need the file re-uploaded, or should `import/preview` stash the parsed result server-side (e.g. keyed by a short-lived token) so `confirm` is just "yes, go"? Simpler to start with: client re-sends the same file to `confirm`.

## Out of scope / future

- `.xls`/`.csv` support.
- In-wizard category remap/merge UI (currently: reject and re-upload).
- Duplicate detection across imports.
- Undo/rollback of a completed import.
