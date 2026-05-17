# Design: Sparnessa — Flask Web App

**Date:** 2026-05-16  
**Status:** Approved  
**Source spec:** `design_handoff_sparnessa/README.md`  
**Prototype reference:** `design_handoff_sparnessa/design/Sparnessa.html`

---

## What We're Building

A single-user, local personal finance forecaster. Answers: *"Wie viel Geld habe ich wirklich bis zum nächsten Gehalt?"*

The user enters their current balance, Dispo limit, next salary date+amount, and recurring expenses/incomes. The app projects the account balance day-by-day until payday, highlights any overdraft breach, and shows a timeline of everything that happens between now and salary.

**Not** a SaaS app. No auth, no deployment, no external services. Runs locally with `python app.py`.

---

## Target Stack

| Layer | Choice |
|---|---|
| Backend | Flask 3.x |
| Database | SQLite via `sqlite3` (stdlib) |
| Frontend | Plain HTML/CSS/JS — no build step |
| Date arithmetic | `python-dateutil` (relativedelta) |
| Templating | Jinja2 (shell only — data flows as JSON) |
| Python | 3.11+ |
| Modules | Browser ES modules (`<script type="module">`) |

---

## Project Location

Files land directly in `/home/alex/Dokumente/Projekte/Sparnessa/` (the project root).

---

## File Structure

```
app.py                         # ~30 lines — Flask entry, registers blueprints
run.sh                         # activates .venv, starts server
requirements.txt               # flask>=3.0, python-dateutil>=2.8
.gitignore                     # data/, __pycache__, .venv/
data/
  sparnessa.db                 # created on first run, gitignored

backend/
  __init__.py
  db.py                        # connection + schema init (PRAGMA user_version)
  models/
    __init__.py
    settings.py                # get_settings() / save_settings()
    expenses.py                # get_all / create / update / delete
    incomes.py                 # same shape
  services/
    __init__.py
    forecast.py                # occurrences() + calculate() — the heart
    importexport.py            # export_json() / import_json()
  api/
    __init__.py                # create_blueprint() — registers all route files
    settings_routes.py         # GET/POST /api/settings
    expenses_routes.py         # GET/POST/PUT/DELETE /api/expenses[/<id>]
    incomes_routes.py          # GET/POST/PUT/DELETE /api/incomes[/<id>]
    forecast_routes.py         # GET /api/forecast
    data_routes.py             # GET /api/export, POST /api/import, POST /api/reset

templates/
  index.html                   # single-page shell — Jinja only for url_for

static/
  css/
    tokens.css                 # CSS custom properties only
    layout.css                 # shell, topbar, summary, timeline, lists
    components.css             # buttons, pills, forms, modals
    chart.css                  # chart-specific styles
  js/
    api.js                     # thin fetch wrapper for /api/*
    state.js                   # client cache + subscribe/notify
    format.js                  # fmtEur, fmtDate, CATEGORIES, INTERVAL_LABELS
    icons.js                   # injects SVG <defs> at load; iconFor()
    render/
      summary.js               # renderSummary(state)
      chart.js                 # renderChart(state)
      timeline.js              # renderTimeline(state)
      lists.js                 # renderMiniLists(state)
    modals/
      settings.js              # openSettings / closeSettings / saveSettings
      entry.js                 # shared expense/income form sheet
      reset.js                 # reset confirmation sheet
    main.js                    # init() — DOMContentLoaded, wires everything
```

---

## Data Model

Three tables. Schema is created via `init_db()` in `backend/db.py` on startup.

```sql
CREATE TABLE IF NOT EXISTS settings (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),
  current_date       TEXT NOT NULL,
  balance            REAL NOT NULL DEFAULT 0,
  disposition_limit  REAL NOT NULL DEFAULT -1300,
  next_salary_date   TEXT,
  next_salary_amount REAL NOT NULL DEFAULT 1800,
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  amount      REAL NOT NULL CHECK (amount > 0),
  next_date   TEXT NOT NULL,
  end_date    TEXT,
  interval    TEXT NOT NULL CHECK (interval IN ('once','monthly','quarterly','biannual','yearly')),
  category    TEXT NOT NULL DEFAULT 'Sonstiges',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS incomes (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  amount      REAL NOT NULL CHECK (amount >= 0),
  next_date   TEXT NOT NULL,
  end_date    TEXT,
  interval    TEXT NOT NULL CHECK (interval IN ('once','monthly','quarterly','biannual','yearly')),
  category    TEXT NOT NULL DEFAULT 'Sonstiges',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

`PRAGMA user_version` for future migrations. `data/sparnessa.db` is gitignored.

---

## API Surface

All JSON in / JSON out. Errors: `{"error": "..."}` with HTTP 400.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | index.html shell |
| GET/POST | `/api/settings` | read / update settings |
| GET/POST | `/api/expenses` | list / create |
| PUT/DELETE | `/api/expenses/<id>` | update / delete |
| GET/POST | `/api/incomes` | list / create |
| PUT/DELETE | `/api/incomes/<id>` | update / delete |
| GET | `/api/forecast` | full forecast result |
| GET | `/api/export` | download JSON file |
| POST | `/api/import` | replace state from JSON |
| POST | `/api/reset` | wipe all data, reseed defaults |

---

## Forecast Algorithm (backend/services/forecast.py)

Reimplemented from `sparnessa.js` in Python using `python-dateutil.relativedelta` for correct month arithmetic. Key functions:

- `occurrences(entry, from_date, to_date)` — returns list of ISO date strings for when an entry fires within the window.
- `calculate(settings, expenses, incomes)` — returns `{upcoming, total_out, total_in, balance_before_salary, balance_after_salary, dispo_ok, frei_inkl_dispo, lowest, trajectory}`.

`trajectory` is a list of `{date, balance, kind, label}` points used by the chart renderer.

---

## Frontend Architecture

- `state.js` holds `{settings, expenses, incomes, forecast}` and a subscriber list.
- `refresh()` fetches all four endpoints in parallel, updates state, notifies subscribers.
- All renderers are pure functions `(state) → DOM mutations`. They subscribe via `state.subscribe(renderAll)`.
- `api.js` is a thin wrapper around `fetch` — no business logic.
- `main.js` calls `init()` on `DOMContentLoaded`: sets up modal wiring, subscribes renderers, calls `refresh()`.

---

## Design System

- **Colors:** Black base (`#000`), elevated surfaces (`#1c1c1e`, `#2c2c2e`), accent purple (`#BF5AF2`), green for income (`#30D158`), red for overdraft (`#FF453A`).
- **Typography:** Inter (Google Fonts or bundled WOFF2). Tabular numbers everywhere. Hero: 72px/700.
- **Icons:** Inline SVG symbols injected by `icons.js`. Stroke = `currentColor`, 20 symbols: `music, shield, bolt, heart, home, wifi, bag, arrow, car, coffee, tag, plus, gear, close, pencil, trash, calendar, alert, upload, download`.
- **Motion:** Modal overlay fade 200ms, card `translateY(12px) scale(0.98)` → neutral, `cubic-bezier(0.22,0.61,0.36,1)` 220ms.
- **Responsive:** Collapses to 1-column below 1100px. Mobile is graceful degradation.

---

## Validation

**Frontend** (UX feedback): Required fields, amount > 0, endDate ≥ nextDate. On error: red modal glow + status message.

**Backend** (correctness): Same rules enforced in route handlers. Returns `{error: "..."}` HTTP 400 on failure. No stack traces exposed.

---

## First-Run Behavior

On `GET /api/settings`, if no row exists in the settings table, return defaults (balance=0, disposition_limit=-1300, nextSalaryAmount=1800, currentDate=today). The frontend detects `!settings.next_salary_date && expenses.length === 0` and auto-opens the settings sheet after 350ms.

---

## Import/Export

- Export: `GET /api/export` → Flask `send_file` with `Content-Disposition: attachment; filename=sparnessa_YYYY-MM-DD.json`. JSON contains `{settings, expenses, incomes, exported_at}`.
- Import: `POST /api/import` validates structure (`settings` obj, `expenses[]`, `incomes[]` each with `id, name, amount, next_date, interval`), then atomically replaces all three tables in a single transaction.

---

## Setup & Launch

```bash
python -m venv .venv
source .venv/bin/activate
pip install flask python-dateutil
python app.py
# → http://127.0.0.1:5000
```

`run.sh` handles venv activation + server start.

---

## Acceptance Criteria

1. `python app.py` starts on `http://127.0.0.1:5000`.
2. All data persists to `data/sparnessa.db`.
3. Visual design matches prototype closely (dark Apple aesthetic, Inter, purple accent).
4. Full API surface implemented.
5. Forecast algorithm in `backend/services/forecast.py`, exposed via `GET /api/forecast`.
6. CRUD on expenses + incomes, settings, import/export, reset.
7. Modular file structure — no monolith files.
8. ES modules in browser, no Webpack/Vite.
9. Validation on both sides.
10. JSON errors on 400, no stack traces.
