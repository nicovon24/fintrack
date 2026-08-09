# Component Rules

- One component per folder: `name.ts`, `name.html`, `name.scss`, colocated. No inline templates/styles except trivial one-liners.
- `changeDetection: ChangeDetectionStrategy.OnPush` on every component.
- Inputs/outputs use the signal-based APIs (`input()`, `output()`, `model()`), not the `@Input()`/`@Output()` decorators.
- Keep components either "smart" (feature root: owns a service, fetches data, holds state) or "dumb" (sub-component: receives `input()`s, emits `output()`s, no direct service injection). Don't blur the two in one file.
- Template logic stays declarative — no complex branching inline in `.html`; compute derived values with `computed()` in the `.ts` and reference the signal in the template.
- Selector prefix: `app-` (e.g. `app-transaction-list`), matching the existing `app-dashboard`.
- Dialogs/modals: colocate as a sub-folder of the feature that opens them (e.g. `features/categories/category-edit-dialog/`), not under `shared/`, unless truly feature-agnostic.
