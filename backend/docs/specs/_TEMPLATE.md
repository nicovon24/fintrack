# Spec: <feature name>

> Copy this file as `NN-feature-name.md` (numbered in order, e.g. `02-excel-import.md`) before implementing any non-trivial feature. A short spec avoids re-deciding on the fly things that are better thought out before writing code.

## What it solves

1-3 sentences: what problem this feature solves, why it's needed.

## Scope

What this version includes. What it explicitly does NOT include (to avoid scope creep while implementing).

## Data model

New entities or new fields on existing entities. If it touches another feature's entity, clarify how (see `service-rules.md` on cross-feature communication).

## Endpoints

| Method | Path | Description |
|---|---|---|
| ... | ... | ... |

## Edge cases / business rules

What happens in rare cases (invalid data, resource not found, limits). If there's a non-obvious business rule, document it here — it's the source of truth before it gets buried in code.

## Out of scope / future

What's postponed to a later iteration.
