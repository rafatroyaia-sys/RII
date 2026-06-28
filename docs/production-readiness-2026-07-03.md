# Production Readiness - 2026-07-03

Checklist for the Netlify deployment window on July 3, 2026.

## Before Deploy

- Confirm `main` is pushed to GitHub.
- Run `npm.cmd run lint`.
- Run `npm.cmd run build`.
- Confirm build creates separate chunks for heavy tabs such as Laboratorio and Asimetrías.
- Confirm no unexpected files are pending in `git status --short`.

## Local QA

- Inicio loads and shows Cockpit del inversor.
- Navigation guide changes correctly for each tab.
- Perfil test opens and can calculate a profile.
- Mi cartera can add, edit and remove holdings.
- Calculadora opens with and without prefilled asset data.
- Laboratorio lazy-loads, changes strategies and saves an educational thesis.
- Radar opens, filters work, asset comparison works and asset detail modal opens/closes.
- Asimetrías lazy-loads and detail modal opens/closes.
- Macroeconomía shows traffic light, dashboard, scenarios and investment drivers.
- Formación shows methodology, privacy, legal notice, glossary and scenarios.
- Mobile viewport does not show incoherent overlap in main tabs.

## Production QA After Netlify Is Available

- Open `https://radar-inversion.netlify.app`.
- Confirm the deployed commit matches the latest GitHub commit.
- Confirm `/netlify/functions/fred` responds or falls back cleanly.
- Confirm market data and macro data show status labels: real, cache, partial, simulated or error.
- Confirm no blank screen, console crash or stuck loading state.
- Confirm local browser storage works in production for profile, portfolio and theses.

## Release Notes To Verify

- Cockpit del inversor.
- Contextual guide per tab.
- Decision checklist.
- Asset comparison panel.
- Educational thesis builder.
- Trust/privacy panel.
- Legal educational notice.
- Lazy-loaded Laboratorio and Asimetrías tabs.

## Known Non-Blocking Items

- Main bundle still exceeds Vite's default 500 kB warning, but heavy tabs are now split into separate chunks.
- A formal legal review is recommended before presenting the tool as a public product beyond educational use.
- Financial data providers can rate-limit or fail; the app must continue showing transparent fallback states.
