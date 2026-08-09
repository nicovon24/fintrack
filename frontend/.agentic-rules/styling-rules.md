# Styling Rules

- SCSS colocated per component (`name.scss`). No CSS-in-JS.
- No CSS framework/UI kit installed yet (no Tailwind, no Material) — plain SCSS with BEM-ish class naming until the project adopts one deliberately. Don't silently add one.
- Global styles (`src/styles.scss`) reserved for resets, CSS variables/design tokens, and truly app-wide rules — component-specific styling stays in the component's own `.scss`.
- Reuse `shared/components/` (e.g. `stat-card`, `currency-badge`) instead of re-implementing similar UI inline in a feature.
