# Spec: Import wizard accepts .xlsx, .csv, and .txt

## What it solves

The import wizard (spec `03-excel-import.md`) only accepted `.xlsx` (parsed via Apache POI). Users may have their data in a plain CSV or a tab/semicolon-delimited `.txt` export instead of Excel. This spec extends the same import pipeline (preview → confirm) to also accept `.csv` and `.txt`, without changing the row/column contract, validation rules, or category-cap business rules already in place.

## Scope

Includes:
- Backend: detect file type by extension (`.xlsx`/`.xls` → existing POI path, `.csv`/`.txt` → new delimited-text path).
- Delimited-text parser: auto-detects delimiter per file (tab if present, else semicolon, else comma) and decimal separator (comma when delimiter isn't comma, dot otherwise — since comma can't be both field delimiter and decimal separator).
- Same header contract as Excel (`Fecha, Tipo, Categoria, Concepto, Monto` + optional `Mes, Moneda, Cotizacion`), same column order requirement, same row-level validation (`validateBusinessRules`), same category-cap and category-existence checks.
- Frontend: `<input type="file">` accepts `.xlsx,.csv,.txt`; upload step copy updated to mention all three formats.

Does not include:
- Full RFC-4180 CSV compliance (quoted fields containing the delimiter itself are not supported — a plain `split` on the detected delimiter is enough for this app's use case).
- Auto-detecting encoding other than UTF-8.
- Any change to the confirm step or the DTOs (`ImportRow`, `ImportPreviewResponse`, etc.) — the delimited-text parser produces the exact same `ImportRow` records the Excel parser does, so everything downstream (preview UI, confirm endpoint) is unaffected.

## Data model

No new entities or DTOs. Internal refactor only: `ImportService.validateHeaders` now takes `List<String>` instead of a POI `Row`, and amount/rate parsing gets a `String`-based overload (`parseOptionalDecimal(String, boolean decimalUsesComma)`) that the Excel path's text-cell fallback now also uses — no behavior change there, same `raw.replace(",", ".")` logic as before.

## Edge cases / business rules

- Unsupported extension → `ImportValidationException("Formato de archivo no soportado. Subí un .xlsx, .csv o .txt")`, same error-surface as other validation failures (shown in the wizard's rejected-file state).
- Blank lines in a `.csv`/`.txt` file are skipped, same as blank rows in Excel; row numbers reported in errors refer to the real line number in the file (1-based), matching Excel's row-number convention.
- A comma-delimited `.csv` cannot also use comma as the decimal separator (ambiguous) — amounts must use a dot in that case. Semicolon- or tab-delimited files may use either dot or comma for decimals (comma is normalized to dot).

## Out of scope / future

- CSV quoting/escaping (RFC 4180).
- Alternate encodings (Latin-1, UTF-16, etc.) — UTF-8 only.
