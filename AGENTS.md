# FinTrack - AI Agent Guidelines

## Project Overview

Personal finance app: income/expense management (with excel import planned) and investment analysis (real-time quotes, ARS/USD). Personal learning project to practice Java/Spring Boot + Angular in depth.

## Monorepo Structure

- `backend/` — Java 25 + Spring Boot 4 + PostgreSQL (Maven)
- `frontend/` — Angular 22, standalone components + signals (npm)
- `docs/` (root) — all specs and docs live here, for both backend and frontend (`docs/specs/`, plus reference docs like `databases.md`)

Each subfolder has its own `AGENTS.md` and `.agentic-rules/` with the conventions specific to that part of the stack. Docs, however, are centralized in root `docs/`, not split per subfolder.

**Token optimization**: each subfolder's `AGENTS.md` has a "which rules to read for which task" table. Read only what's relevant to what you're doing, not the whole rule set every time.

## Roadmap (high level)

1. **v1 backend** (done): income/expense and category CRUD, monthly summary, Swagger.
2. Import user's existing excel files (Apache POI).
3. Angular frontend: dashboard with charts over the backend data.
4. Investment module: manual holdings entry, then real-time quotes (dolar blue/oficial, IOL), ARS/USD toggle.

## Language Policy

- **Code comments, Javadoc, commit messages, READMEs, docs, spec files**: English.
- **Backend runtime messages** (validation messages, exception messages, API error bodies, log messages meant for the user): Spanish.
- **Frontend** (UI text, labels, user-facing strings): Spanish.
- Identifiers (classes, methods, variables, endpoints) stay in English regardless.

## General Rules

1. Every non-trivial new feature starts with a short spec in root `docs/specs/` before being implemented (use `docs/specs/_TEMPLATE.md`, prefix filename with the next number, e.g. `04-...`).
2. Always follow the `.agentic-rules/` of the subfolder you're touching.
3. Don't mix conventions between backend and frontend — each has its own stack and rules.
