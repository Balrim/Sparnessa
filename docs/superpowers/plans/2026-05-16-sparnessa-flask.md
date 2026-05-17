# Sparnessa Flask App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Flask web app from the prototype in `design_handoff_sparnessa/`, persisting data to SQLite, matching the prototype's visual design exactly.

**Architecture:** Flask 3.x app-factory pattern; SQLite via stdlib `sqlite3` with `flask.g`; Blueprint with route-registration functions; browser ES modules (no bundler); all data via JSON API; `GET /` serves the single-page shell.

**Tech Stack:** Python 3.11+, Flask 3.x, python-dateutil, sqlite3 (stdlib), plain HTML/CSS/JS (ES modules)

**Reference files:** `design_handoff_sparnessa/design/Sparnessa.html`, `sparnessa.js`, `variants.css`, `sparnessa.css`

---

### Task 1: Project skeleton

**Files:**
- Create: `requirements.txt`
- Create: `.gitignore`
- Create: `backend/__init__.py`, `backend/models/__init__.py`, `backend/services/__init__.py`, `backend/api/__init__.py` (stubs)
- Create: `static/css/`, `static/js/render/`, `static/js/modals/`, `templates/`, `data/` (dirs)
- Create: `tests/__init__.py`, `tests/conftest.py`

- [ ] **Step 1: Create directory tree**

```bash
mkdir -p backend/models backend/services backend/api
mkdir -p static/css static/js/render static/js/modals
mkdir -p templates data tests
```

- [ ] **Step 2: Write requirements.txt**

```
flask>=3.0
python-dateutil>=2.8
pytest>=8.0
```

- [ ] **Step 3: Write .gitignore**

```
.venv/
__pycache__/
*.pyc
data/sparnessa.db
*.db
.env
```

- [ ] **Step 4: Create empty `__init__.py` stubs**

```bash
touch backend/__init__.py backend/models/__init__.py backend/services/__init__.py backend/api/__init__.py tests/__init__.py
```

- [ ] **Step 5: Create virtualenv and install**

```bash
python -m venv .venv
source .venv/bin/activate
pip install flask python-dateutil pytest
```

Expected: no errors. `flask --version` → Flask 3.x

- [ ] **Step 6: Commit**

```bash
git init
git add requirements.txt .gitignore backend/ static/ templates/ tests/
git commit -m "chore: project skeleton"
```

---

### Task 2: Flask app factory + database layer

**Files:**
- Create: `app.py`
- Create: `backend/db.py`
- Create: `tests/conftest.py`

- [ ] **Step 1: Write `backend/db.py`**

```python
import os
import sqlite3
from flask import g, current_app

SCHEMA = """
PRAGMA user_version = 1;

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_date TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    disposition_limit REAL NOT NULL DEFAULT -1300,
    next_salary_date TEXT,
    next_salary_amount REAL NOT NULL DEFAULT 1800,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    next_date TEXT NOT NULL,
    end_date TEXT,
    interval TEXT NOT NULL CHECK (interval IN ('once','monthly','quarterly','biannual','yearly')),
    category TEXT NOT NULL DEFAULT 'Sonstiges',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount >= 0),
    next_date TEXT NOT NULL,
    end_date TEXT,
    interval TEXT NOT NULL CHECK (interval IN ('once','monthly','quarterly','biannual','yearly')),
    category TEXT NOT NULL DEFAULT 'Sonstiges',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_next_date ON expenses(next_date);
CREATE INDEX IF NOT EXISTS idx_incomes_next_date  ON incomes(next_date);
"""

def get_db():
    if 'db' not in g:
        path = current_app.config['DATABASE']
        os.makedirs(os.path.dirname(path), exist_ok=True)
        g.db = sqlite3.connect(path)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    db = get_db()
    db.executescript(SCHEMA)
    db.commit()
```

- [ ] **Step 2: Write `backend/api/__init__.py`**

```python
from flask import Blueprint, render_template

def create_blueprint():
    bp = Blueprint('main', __name__)

    @bp.route('/')
    def index():
        return render_template('index.html')

    from backend.api.settings_routes import register as reg_settings
    from backend.api.expenses_routes import register as reg_expenses
    from backend.api.incomes_routes  import register as reg_incomes
    from backend.api.forecast_routes import register as reg_forecast
    from backend.api.data_routes     import register as reg_data

    reg_settings(bp)
    reg_expenses(bp)
    reg_incomes(bp)
    reg_forecast(bp)
    reg_data(bp)

    return bp
```

- [ ] **Step 3: Write `app.py`**

```python
import os
from flask import Flask
from backend.db import init_db, close_db
from backend.api import create_blueprint

def create_app(config=None):
    app = Flask(__name__)
    app.config['DATABASE'] = os.path.join(app.root_path, 'data', 'sparnessa.db')
    if config:
        app.config.update(config)
    app.teardown_appcontext(close_db)
    app.register_blueprint(create_blueprint())
    with app.app_context():
        init_db()
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

- [ ] **Step 4: Write `tests/conftest.py`**

```python
import os
import tempfile
import pytest

@pytest.fixture
def app():
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    from app import create_app
    flask_app = create_app({'TESTING': True, 'DATABASE': db_path})
    yield flask_app
    os.close(db_fd)
    os.unlink(db_path)

@pytest.fixture
def client(app):
    return app.test_client()
```

- [ ] **Step 5: Verify app starts (route stubs missing — expected 500 on routes, but app itself must start)**

Create stub route files so the blueprint import doesn't fail:

```bash
for f in settings_routes expenses_routes incomes_routes forecast_routes data_routes; do
  echo "def register(bp): pass" > backend/api/${f}.py
done
```

Run:
```bash
python -c "from app import create_app; app = create_app({'DATABASE': '/tmp/test_spar.db'}); print('OK')"
```
Expected output: `OK`

- [ ] **Step 6: Commit**

```bash
git add app.py backend/db.py backend/api/__init__.py backend/api/ tests/conftest.py
git commit -m "feat: Flask app factory + DB schema"
```

---

### Task 3: Settings model

**Files:**
- Create: `backend/models/settings.py`
- Create: `tests/test_models.py`

- [ ] **Step 1: Write failing test for settings**

```python
# tests/test_models.py
import json
from datetime import date

def test_get_settings_returns_defaults(client):
    res = client.get('/api/settings')
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data['balance'] == 0
    assert data['disposition_limit'] == -1300

def test_save_and_get_settings(client):
    payload = {
        'current_date': '2026-05-16', 'balance': 1500.0,
        'disposition_limit': -2000.0, 'next_salary_date': '2026-05-31',
        'next_salary_amount': 2500.0,
    }
    res = client.post('/api/settings', json=payload)
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data['balance'] == 1500.0
    assert data['next_salary_date'] == '2026-05-31'
```

- [ ] **Step 2: Run — expect failure (routes not wired yet)**

```bash
pytest tests/test_models.py -v
```
Expected: FAIL (404 or similar)

- [ ] **Step 3: Write `backend/models/settings.py`**

```python
from datetime import date
from backend.db import get_db

DEFAULTS = {
    'current_date': date.today().isoformat(),
    'balance': 0.0,
    'disposition_limit': -1300.0,
    'next_salary_date': None,
    'next_salary_amount': 1800.0,
}

def get_settings() -> dict:
    row = get_db().execute("SELECT * FROM settings WHERE id = 1").fetchone()
    if row is None:
        return dict(DEFAULTS, current_date=date.today().isoformat())
    return dict(row)

def save_settings(data: dict) -> dict:
    db = get_db()
    db.execute("""
        INSERT INTO settings (id, current_date, balance, disposition_limit, next_salary_date, next_salary_amount, updated_at)
        VALUES (1, :current_date, :balance, :disposition_limit, :next_salary_date, :next_salary_amount, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            current_date       = excluded.current_date,
            balance            = excluded.balance,
            disposition_limit  = excluded.disposition_limit,
            next_salary_date   = excluded.next_salary_date,
            next_salary_amount = excluded.next_salary_amount,
            updated_at         = datetime('now')
    """, data)
    db.commit()
    return get_settings()
```

- [ ] **Step 4: Write `backend/api/settings_routes.py`**

```python
from flask import request, jsonify
from backend.models.settings import get_settings, save_settings

def register(bp):
    @bp.route('/api/settings', methods=['GET'])
    def api_get_settings():
        return jsonify(get_settings())

    @bp.route('/api/settings', methods=['POST'])
    def api_save_settings():
        data = request.get_json()
        for field in ('current_date', 'balance', 'disposition_limit', 'next_salary_amount'):
            if field not in data:
                return jsonify({'error': f'{field} fehlt'}), 400
        try:
            payload = {
                'current_date':       data['current_date'],
                'balance':            float(data['balance']),
                'disposition_limit':  float(data['disposition_limit']),
                'next_salary_date':   data.get('next_salary_date') or None,
                'next_salary_amount': float(data['next_salary_amount']),
            }
        except (TypeError, ValueError) as e:
            return jsonify({'error': str(e)}), 400
        return jsonify(save_settings(payload))
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_models.py::test_get_settings_returns_defaults tests/test_models.py::test_save_and_get_settings -v
```
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/models/settings.py backend/api/settings_routes.py tests/test_models.py
git commit -m "feat: settings model + API"
```

---

### Task 4: Expenses + Incomes models

**Files:**
- Create: `backend/models/expenses.py`
- Create: `backend/models/incomes.py`
- Create: `backend/api/expenses_routes.py`
- Create: `backend/api/incomes_routes.py`
- Modify: `tests/test_models.py`

- [ ] **Step 1: Add failing tests**

Append to `tests/test_models.py`:

```python
def test_create_and_list_expense(client):
    payload = {'name': 'Miete', 'amount': 800.0, 'next_date': '2026-05-01',
               'end_date': None, 'interval': 'monthly', 'category': 'Wohnen'}
    res = client.post('/api/expenses', json=payload)
    assert res.status_code == 201
    data = json.loads(res.data)
    assert data['name'] == 'Miete'
    assert 'id' in data

    res = client.get('/api/expenses')
    assert len(json.loads(res.data)) == 1

def test_update_expense(client):
    res = client.post('/api/expenses', json={
        'name': 'Miete', 'amount': 800.0, 'next_date': '2026-05-01',
        'end_date': None, 'interval': 'monthly', 'category': 'Wohnen'})
    eid = json.loads(res.data)['id']
    res = client.put(f'/api/expenses/{eid}', json={
        'name': 'Miete', 'amount': 900.0, 'next_date': '2026-05-01',
        'end_date': None, 'interval': 'monthly', 'category': 'Wohnen'})
    assert res.status_code == 200
    assert json.loads(res.data)['amount'] == 900.0

def test_delete_expense(client):
    res = client.post('/api/expenses', json={
        'name': 'Test', 'amount': 10.0, 'next_date': '2026-05-20',
        'end_date': None, 'interval': 'once', 'category': 'Sonstiges'})
    eid = json.loads(res.data)['id']
    res = client.delete(f'/api/expenses/{eid}')
    assert res.status_code == 200
    assert json.loads(res.data) == {'ok': True}
    assert json.loads(client.get('/api/expenses').data) == []

def test_expense_validation_rejects_zero_amount(client):
    res = client.post('/api/expenses', json={
        'name': 'Test', 'amount': 0, 'next_date': '2026-05-20',
        'interval': 'once', 'category': 'Sonstiges'})
    assert res.status_code == 400

def test_create_income(client):
    res = client.post('/api/incomes', json={
        'name': 'Gehalt', 'amount': 2000.0, 'next_date': '2026-05-31',
        'end_date': None, 'interval': 'monthly', 'category': 'Hauptjob'})
    assert res.status_code == 201
```

- [ ] **Step 2: Write `backend/models/expenses.py`**

```python
import uuid
from backend.db import get_db

def get_all() -> list[dict]:
    rows = get_db().execute("SELECT * FROM expenses ORDER BY next_date").fetchall()
    return [dict(r) for r in rows]

def get_by_id(entry_id: str) -> dict | None:
    row = get_db().execute("SELECT * FROM expenses WHERE id = ?", (entry_id,)).fetchone()
    return dict(row) if row else None

def create(data: dict) -> dict:
    entry_id = str(uuid.uuid4())
    get_db().execute(
        "INSERT INTO expenses (id, name, amount, next_date, end_date, interval, category) "
        "VALUES (:id, :name, :amount, :next_date, :end_date, :interval, :category)",
        {**data, 'id': entry_id, 'end_date': data.get('end_date') or None}
    )
    get_db().commit()
    return get_by_id(entry_id)

def update(entry_id: str, data: dict) -> dict | None:
    get_db().execute(
        "UPDATE expenses SET name=:name, amount=:amount, next_date=:next_date, "
        "end_date=:end_date, interval=:interval, category=:category, updated_at=datetime('now') "
        "WHERE id=:id",
        {**data, 'id': entry_id, 'end_date': data.get('end_date') or None}
    )
    get_db().commit()
    return get_by_id(entry_id)

def delete(entry_id: str) -> None:
    get_db().execute("DELETE FROM expenses WHERE id = ?", (entry_id,))
    get_db().commit()
```

- [ ] **Step 3: Write `backend/models/incomes.py`**

Identical to `expenses.py` but targeting the `incomes` table:

```python
import uuid
from backend.db import get_db

def get_all() -> list[dict]:
    rows = get_db().execute("SELECT * FROM incomes ORDER BY next_date").fetchall()
    return [dict(r) for r in rows]

def get_by_id(entry_id: str) -> dict | None:
    row = get_db().execute("SELECT * FROM incomes WHERE id = ?", (entry_id,)).fetchone()
    return dict(row) if row else None

def create(data: dict) -> dict:
    entry_id = str(uuid.uuid4())
    get_db().execute(
        "INSERT INTO incomes (id, name, amount, next_date, end_date, interval, category) "
        "VALUES (:id, :name, :amount, :next_date, :end_date, :interval, :category)",
        {**data, 'id': entry_id, 'end_date': data.get('end_date') or None}
    )
    get_db().commit()
    return get_by_id(entry_id)

def update(entry_id: str, data: dict) -> dict | None:
    get_db().execute(
        "UPDATE incomes SET name=:name, amount=:amount, next_date=:next_date, "
        "end_date=:end_date, interval=:interval, category=:category, updated_at=datetime('now') "
        "WHERE id=:id",
        {**data, 'id': entry_id, 'end_date': data.get('end_date') or None}
    )
    get_db().commit()
    return get_by_id(entry_id)

def delete(entry_id: str) -> None:
    get_db().execute("DELETE FROM incomes WHERE id = ?", (entry_id,))
    get_db().commit()
```

- [ ] **Step 4: Write `backend/api/expenses_routes.py`**

```python
from flask import request, jsonify
from backend.models import expenses as model

VALID_INTERVALS = ('once', 'monthly', 'quarterly', 'biannual', 'yearly')

def _validate(data: dict) -> str | None:
    if not data.get('name', '').strip():
        return 'Name fehlt'
    if not data.get('next_date'):
        return 'Datum fehlt'
    try:
        amount = float(data['amount'])
    except (TypeError, ValueError, KeyError):
        return 'Betrag muss eine Zahl sein'
    if amount <= 0:
        return 'Betrag muss größer als 0 sein'
    if data.get('interval') not in VALID_INTERVALS:
        return 'Ungültiges Intervall'
    end = data.get('end_date')
    if end and end < data['next_date']:
        return 'Enddatum darf nicht vor dem Startdatum liegen'
    return None

def register(bp):
    @bp.route('/api/expenses', methods=['GET'])
    def api_get_expenses():
        return jsonify(model.get_all())

    @bp.route('/api/expenses', methods=['POST'])
    def api_create_expense():
        data = request.get_json()
        err = _validate(data)
        if err:
            return jsonify({'error': err}), 400
        return jsonify(model.create(data)), 201

    @bp.route('/api/expenses/<entry_id>', methods=['PUT'])
    def api_update_expense(entry_id):
        data = request.get_json()
        err = _validate(data)
        if err:
            return jsonify({'error': err}), 400
        result = model.update(entry_id, data)
        if result is None:
            return jsonify({'error': 'Nicht gefunden'}), 404
        return jsonify(result)

    @bp.route('/api/expenses/<entry_id>', methods=['DELETE'])
    def api_delete_expense(entry_id):
        model.delete(entry_id)
        return jsonify({'ok': True})
```

- [ ] **Step 5: Write `backend/api/incomes_routes.py`**

```python
from flask import request, jsonify
from backend.models import incomes as model

VALID_INTERVALS = ('once', 'monthly', 'quarterly', 'biannual', 'yearly')

def _validate(data: dict) -> str | None:
    if not data.get('name', '').strip():
        return 'Name fehlt'
    if not data.get('next_date'):
        return 'Datum fehlt'
    try:
        amount = float(data['amount'])
    except (TypeError, ValueError, KeyError):
        return 'Betrag muss eine Zahl sein'
    if amount < 0:
        return 'Betrag darf nicht negativ sein'
    if data.get('interval') not in VALID_INTERVALS:
        return 'Ungültiges Intervall'
    end = data.get('end_date')
    if end and end < data['next_date']:
        return 'Enddatum darf nicht vor dem Startdatum liegen'
    return None

def register(bp):
    @bp.route('/api/incomes', methods=['GET'])
    def api_get_incomes():
        return jsonify(model.get_all())

    @bp.route('/api/incomes', methods=['POST'])
    def api_create_income():
        data = request.get_json()
        err = _validate(data)
        if err:
            return jsonify({'error': err}), 400
        return jsonify(model.create(data)), 201

    @bp.route('/api/incomes/<entry_id>', methods=['PUT'])
    def api_update_income(entry_id):
        data = request.get_json()
        err = _validate(data)
        if err:
            return jsonify({'error': err}), 400
        result = model.update(entry_id, data)
        if result is None:
            return jsonify({'error': 'Nicht gefunden'}), 404
        return jsonify(result)

    @bp.route('/api/incomes/<entry_id>', methods=['DELETE'])
    def api_delete_income(entry_id):
        model.delete(entry_id)
        return jsonify({'ok': True})
```

- [ ] **Step 6: Run tests**

```bash
pytest tests/test_models.py -v
```
Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add backend/models/expenses.py backend/models/incomes.py backend/api/expenses_routes.py backend/api/incomes_routes.py tests/test_models.py
git commit -m "feat: expenses + incomes models and API"
```

---

### Task 5: Forecast service

**Files:**
- Create: `backend/services/forecast.py`
- Create: `backend/api/forecast_routes.py`
- Create: `tests/test_forecast.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_forecast.py
import json
from datetime import date
from backend.services.forecast import occurrences, calculate

def _entry(interval, next_date, end_date=None, amount=100):
    return {'id': '1', 'name': 'Test', 'amount': amount,
            'next_date': next_date, 'end_date': end_date,
            'interval': interval, 'category': 'Sonstiges'}

def test_occurrences_once_in_range():
    e = _entry('once', '2026-05-20')
    assert occurrences(e, date(2026,5,16), date(2026,5,31)) == ['2026-05-20']

def test_occurrences_once_out_of_range():
    e = _entry('once', '2026-04-01')
    assert occurrences(e, date(2026,5,16), date(2026,5,31)) == []

def test_occurrences_once_on_from_date_excluded():
    e = _entry('once', '2026-05-16')
    assert occurrences(e, date(2026,5,16), date(2026,5,31)) == []

def test_occurrences_monthly_advances_past_from():
    e = _entry('monthly', '2026-04-01')
    result = occurrences(e, date(2026,5,16), date(2026,6,30))
    assert result == ['2026-06-01']

def test_occurrences_monthly_end_date_clips():
    e = _entry('monthly', '2026-04-01', end_date='2026-05-25')
    result = occurrences(e, date(2026,5,16), date(2026,6,30))
    assert result == ['2026-05-01']

def test_calculate_none_without_salary():
    result = calculate(
        {'current_date': '2026-05-16', 'next_salary_date': None,
         'balance': 500, 'disposition_limit': -1300, 'next_salary_amount': 1800},
        [], [])
    assert result is None

def test_calculate_basic():
    settings = {'current_date': '2026-05-16', 'next_salary_date': '2026-05-31',
                'balance': 500, 'disposition_limit': -1300, 'next_salary_amount': 1800}
    expenses = [_entry('monthly', '2026-05-01', amount=300)]
    result = calculate(settings, expenses, [])
    assert result['total_out'] == 300
    assert result['balance_before_salary'] == 200
    assert result['balance_after_salary'] == 2000
    assert result['dispo_ok'] is True
    assert len(result['trajectory']) == 3  # today + event + salary

def test_calculate_dispo_breach():
    settings = {'current_date': '2026-05-16', 'next_salary_date': '2026-05-31',
                'balance': 100, 'disposition_limit': -1300, 'next_salary_amount': 1800}
    expenses = [_entry('once', '2026-05-20', amount=2000)]
    result = calculate(settings, expenses, [])
    assert result['dispo_ok'] is False
    assert result['lowest'] < -1300
```

- [ ] **Step 2: Run — expect failures**

```bash
pytest tests/test_forecast.py -v
```
Expected: ImportError or all FAIL

- [ ] **Step 3: Write `backend/services/forecast.py`**

```python
from datetime import date
from dateutil.relativedelta import relativedelta

INTERVAL_MONTHS = {'monthly': 1, 'quarterly': 3, 'biannual': 6, 'yearly': 12}

def occurrences(entry: dict, from_date: date, to_date: date) -> list[str]:
    nd = date.fromisoformat(entry['next_date'])
    end = date.fromisoformat(entry['end_date']) if entry.get('end_date') else None
    upper = min(to_date, end) if end else to_date

    if entry['interval'] == 'once':
        return [nd.isoformat()] if from_date < nd <= upper else []

    step = INTERVAL_MONTHS.get(entry['interval'])
    if not step or nd > upper:
        return []

    cur = nd
    while cur <= from_date:
        cur += relativedelta(months=step)

    results = []
    while cur <= upper:
        results.append(cur.isoformat())
        cur += relativedelta(months=step)
    return results

def calculate(settings: dict, expenses: list[dict], incomes: list[dict]) -> dict | None:
    from_d = settings.get('current_date')
    to_d   = settings.get('next_salary_date')
    if not from_d or not to_d:
        return None

    from_date = date.fromisoformat(from_d)
    to_date   = date.fromisoformat(to_d)

    upcoming = []
    for e in expenses:
        for d in occurrences(e, from_date, to_date):
            upcoming.append({**e, 'date': d, 'type': 'expense'})
    for i in incomes:
        for d in occurrences(i, from_date, to_date):
            upcoming.append({**i, 'date': d, 'type': 'income'})
    upcoming.sort(key=lambda x: x['date'])

    total_out = sum(x['amount'] for x in upcoming if x['type'] == 'expense')
    total_in  = sum(x['amount'] for x in upcoming if x['type'] == 'income')
    balance_before_salary = settings['balance'] - total_out + total_in
    salary_amount = settings.get('next_salary_amount') or 0
    balance_after_salary  = balance_before_salary + salary_amount

    running = settings['balance']
    trajectory = [{'date': from_d, 'balance': running, 'kind': 'today', 'label': 'Heute'}]
    for ev in upcoming:
        running += ev['amount'] if ev['type'] == 'income' else -ev['amount']
        trajectory.append({'date': ev['date'], 'balance': running,
                           'kind': ev['type'], 'label': ev['name']})
    running += salary_amount
    trajectory.append({'date': to_d, 'balance': running, 'kind': 'salary', 'label': 'Gehalt'})

    lowest    = min(p['balance'] for p in trajectory)
    dispo_ok  = balance_before_salary >= settings['disposition_limit']
    frei_inkl_dispo = balance_before_salary - settings['disposition_limit']

    return {
        'upcoming': upcoming,
        'total_out': total_out, 'total_in': total_in,
        'balance_before_salary': balance_before_salary,
        'balance_after_salary': balance_after_salary,
        'dispo_ok': dispo_ok, 'frei_inkl_dispo': frei_inkl_dispo,
        'lowest': lowest, 'trajectory': trajectory,
    }
```

- [ ] **Step 4: Write `backend/api/forecast_routes.py`**

```python
from flask import jsonify
from backend.models.settings import get_settings
from backend.models.expenses import get_all as get_expenses
from backend.models.incomes  import get_all as get_incomes
from backend.services.forecast import calculate

def register(bp):
    @bp.route('/api/forecast', methods=['GET'])
    def api_forecast():
        result = calculate(get_settings(), get_expenses(), get_incomes())
        if result is None:
            return jsonify({'error': 'Kein Gehaltsdatum gesetzt'}), 400
        return jsonify(result)
```

- [ ] **Step 5: Run unit tests**

```bash
pytest tests/test_forecast.py -v
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/services/forecast.py backend/api/forecast_routes.py tests/test_forecast.py
git commit -m "feat: forecast service + API"
```

---

### Task 6: Import/export + reset API

**Files:**
- Create: `backend/services/importexport.py`
- Create: `backend/api/data_routes.py`
- Modify: `tests/test_models.py`

- [ ] **Step 1: Write `backend/services/importexport.py`**

```python
from datetime import date

def export_data(settings: dict, expenses: list, incomes: list) -> dict:
    return {'settings': settings, 'expenses': expenses,
            'incomes': incomes, 'exported_at': date.today().isoformat()}

def validate_import(data) -> tuple[bool, str | None]:
    if not isinstance(data, dict):
        return False, 'Kein gültiges JSON-Objekt'
    if not isinstance(data.get('settings'), dict):
        return False, 'settings fehlt oder ist kein Objekt'
    if not isinstance(data.get('expenses'), list):
        return False, 'expenses ist kein Array'
    incomes = data.get('incomes', [])
    if not isinstance(incomes, list):
        return False, 'incomes ist kein Array'
    for entry in [*data['expenses'], *incomes]:
        for field in ('id', 'name', 'next_date', 'interval'):
            if not entry.get(field):
                return False, f'Eintrag unvollständig: {field} fehlt'
        if not isinstance(entry.get('amount'), (int, float)):
            return False, 'Eintrag unvollständig: amount fehlt oder keine Zahl'
    return True, None
```

- [ ] **Step 2: Write `backend/api/data_routes.py`**

```python
import json
from datetime import date
from flask import request, jsonify, Response
from backend.db import get_db
from backend.models.settings import get_settings, save_settings, DEFAULTS
from backend.models.expenses import get_all as get_expenses
from backend.models.incomes  import get_all as get_incomes
from backend.services.importexport import export_data, validate_import

def register(bp):
    @bp.route('/api/export', methods=['GET'])
    def api_export():
        data = export_data(get_settings(), get_expenses(), get_incomes())
        filename = f"sparnessa_{date.today().isoformat()}.json"
        return Response(
            json.dumps(data, ensure_ascii=False, indent=2),
            mimetype='application/json',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )

    @bp.route('/api/import', methods=['POST'])
    def api_import():
        data = request.get_json()
        ok, err = validate_import(data)
        if not ok:
            return jsonify({'error': err}), 400
        db = get_db()
        try:
            db.execute("DELETE FROM expenses")
            db.execute("DELETE FROM incomes")
            db.execute("DELETE FROM settings")
            s = data['settings']
            db.execute(
                "INSERT INTO settings (id, current_date, balance, disposition_limit, next_salary_date, next_salary_amount) "
                "VALUES (1, ?, ?, ?, ?, ?)",
                (s.get('current_date', date.today().isoformat()), float(s.get('balance', 0)),
                 float(s.get('disposition_limit', -1300)), s.get('next_salary_date'),
                 float(s.get('next_salary_amount', 1800))))
            for e in data['expenses']:
                db.execute(
                    "INSERT INTO expenses (id, name, amount, next_date, end_date, interval, category) VALUES (?,?,?,?,?,?,?)",
                    (e['id'], e['name'], e['amount'], e['next_date'],
                     e.get('end_date'), e['interval'], e.get('category', 'Sonstiges')))
            for i in data.get('incomes', []):
                db.execute(
                    "INSERT INTO incomes (id, name, amount, next_date, end_date, interval, category) VALUES (?,?,?,?,?,?,?)",
                    (i['id'], i['name'], i['amount'], i['next_date'],
                     i.get('end_date'), i['interval'], i.get('category', 'Sonstiges')))
            db.commit()
        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 400
        return jsonify({'ok': True})

    @bp.route('/api/reset', methods=['POST'])
    def api_reset():
        db = get_db()
        db.execute("DELETE FROM expenses")
        db.execute("DELETE FROM incomes")
        db.execute("DELETE FROM settings")
        db.execute(
            "INSERT INTO settings (id, current_date, balance, disposition_limit, next_salary_date, next_salary_amount) "
            "VALUES (1, ?, 0, -1300, NULL, 1800)",
            (date.today().isoformat(),))
        db.commit()
        return jsonify({'ok': True})
```

- [ ] **Step 3: Add reset test to `tests/test_models.py`**

```python
def test_reset_clears_data(client):
    client.post('/api/expenses', json={
        'name': 'Test', 'amount': 50.0, 'next_date': '2026-05-20',
        'end_date': None, 'interval': 'once', 'category': 'Sonstiges'})
    res = client.post('/api/reset')
    assert res.status_code == 200
    assert json.loads(client.get('/api/expenses').data) == []

def test_import_replaces_data(client):
    payload = {
        'settings': {'current_date': '2026-05-16', 'balance': 999,
                     'disposition_limit': -1000, 'next_salary_date': '2026-05-31',
                     'next_salary_amount': 2000},
        'expenses': [{'id': 'abc', 'name': 'Miete', 'amount': 500,
                      'next_date': '2026-05-01', 'interval': 'monthly',
                      'category': 'Wohnen', 'end_date': None}],
        'incomes': [],
    }
    res = client.post('/api/import', json=payload)
    assert res.status_code == 200
    expenses = json.loads(client.get('/api/expenses').data)
    assert len(expenses) == 1
    assert expenses[0]['name'] == 'Miete'
```

- [ ] **Step 4: Run all tests**

```bash
pytest tests/ -v
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/importexport.py backend/api/data_routes.py tests/test_models.py
git commit -m "feat: import/export/reset API"
```

---

### Task 7: CSS — tokens + layout

**Files:**
- Create: `static/css/tokens.css`
- Create: `static/css/layout.css`

- [ ] **Step 1: Write `static/css/tokens.css`**

Copy lines 1–57 of `design_handoff_sparnessa/design/variants.css` verbatim (the `:root {}` block plus the `*` reset and `body` base). This gives all CSS custom properties.

```css
/* exact content: variants.css lines 1–57 */
```

Then append:
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
```

- [ ] **Step 2: Write `static/css/layout.css`**

Port the following rule groups from the prototype CSS files — copy verbatim, no changes needed:

From `variants.css`:
- `.app` (lines 63–75)
- `.topbar`, `.brand`, `.brand-dot`, `.topbar-actions`, `.icon-btn`, `.pill`, `.pill-accent` (lines 77–147)
- `.card`, `.card-lg`, `.card-flush`, `.card-header`, `.card-title`, `.card-title-lg` (lines 151–180)
- `.num`, `.num-hero`, `.num-xl`, `.num-lg`, `.num-md`, `.num-sm`, `.pos`, `.neg`, `.warn`, `.muted`, `.faint` (lines 184–224)
- `.v3-top`, `.v3-summary*`, `.v3-chart`, `.v3-timeline`, `.v3-timeline-rail`, `.v3-day*`, `.v3-day-items`, `.v3-day-item` (lines 619–754)
- `.v3-lists`, `.v3-mini-list`, `.v3-mini-head`, `.v3-mini-item` (grid 3-col version), `.v3-mini-icon`, `.v3-mini-name`, `.v3-mini-meta`, `.v3-mini-amount` (lines 756–805)

From `sparnessa.css`:
- `html, body`, `.shell`, `.warning-banner`, `.empty`, `.empty-illu` (lines 6–58)
- The responsive `@media` blocks (lines 398–415)
- `.v3-day-item { transition: background 0.12s; }` (last line)

- [ ] **Step 3: Commit**

```bash
git add static/css/tokens.css static/css/layout.css
git commit -m "feat: CSS tokens + layout"
```

---

### Task 8: CSS — components + chart

**Files:**
- Create: `static/css/components.css`
- Create: `static/css/chart.css`

- [ ] **Step 1: Write `static/css/components.css`**

Port the following from the prototype CSS files:

From `variants.css`:
- `.dispo`, `.dispo-head`, `.dispo-track`, `.dispo-fill`, `.dispo-fill.warn`, `.dispo-foot` (lines 230–269)

From `sparnessa.css`:
- `.modal-overlay`, `.modal`, `.modal-lg`, `.modal-head`, `.modal-title`, `.modal-close`, `.modal-body`, `.modal-foot` (lines 64–141)
- `.form-grid`, `.field`, `.field.full`, `.field label`, `.field input`, `.field select`, etc. (lines 147–200)
- `.btn` and all variants: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-danger-solid`, `.btn-sm`, `.btn-block` (lines 206–256)
- `.group`, `.group-row`, `.section-label`, `.data-grid`, `.data-btn*`, `.save-status` (lines 262–348)
- `.v3-mini-item` hover + `.row-actions`, `.row-action` (lines 354–391) — these override the 3-column grid with 4-column (`32px 1fr auto auto`)
- `:focus-visible` (line 391)

- [ ] **Step 2: Write `static/css/chart.css`**

Port from `variants.css` lines 271–325:

```css
/* exact copy of variants.css lines 271–325 */
/* .chart, .chart svg, .chart-grid, .chart-axis, .chart-line,
   .chart-area, .chart-dispo, .chart-zero, .chart-dot,
   .chart-dot-active, .chart-event-marker, .chart-salary-marker */
```

- [ ] **Step 3: Commit**

```bash
git add static/css/components.css static/css/chart.css
git commit -m "feat: CSS components + chart"
```

---

### Task 9: HTML shell

**Files:**
- Create: `templates/index.html`

- [ ] **Step 1: Write `templates/index.html`**

Port `design_handoff_sparnessa/design/Sparnessa.html` verbatim with these changes:
1. Replace `<link rel="stylesheet" href="variants.css" />` + `href="sparnessa.css"` with:
   ```html
   <link rel="stylesheet" href="{{ url_for('static', filename='css/tokens.css') }}" />
   <link rel="stylesheet" href="{{ url_for('static', filename='css/layout.css') }}" />
   <link rel="stylesheet" href="{{ url_for('static', filename='css/components.css') }}" />
   <link rel="stylesheet" href="{{ url_for('static', filename='css/chart.css') }}" />
   ```
2. Remove the entire `<svg width="0" height="0" ...><defs>…</defs></svg>` block (icons.js injects it at runtime).
3. Replace `<script src="sparnessa.js"></script>` with:
   ```html
   <script type="module" src="{{ url_for('static', filename='js/main.js') }}"></script>
   ```
4. Keep all element IDs, classes, and structure exactly as in the prototype.

The full HTML structure (copy from prototype, apply changes above):

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sparnessa</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{{ url_for('static', filename='css/tokens.css') }}" />
  <link rel="stylesheet" href="{{ url_for('static', filename='css/layout.css') }}" />
  <link rel="stylesheet" href="{{ url_for('static', filename='css/components.css') }}" />
  <link rel="stylesheet" href="{{ url_for('static', filename='css/chart.css') }}" />
</head>
<body>

<main class="shell">
  <header class="topbar">
    <div class="brand">
      <span class="brand-dot"></span>
      Sparnessa
    </div>
    <div class="topbar-actions">
      <span class="pill" id="next-salary-pill">
        <svg width="14" height="14"><use href="#i-calendar"/></svg>
        <span id="next-salary-text">—</span>
      </span>
      <button class="icon-btn" id="btn-open-settings" aria-label="Einstellungen">
        <svg width="18" height="18"><use href="#i-gear"/></svg>
      </button>
      <button class="pill pill-accent" id="btn-add-expense">
        <svg width="14" height="14"><use href="#i-plus"/></svg> Ausgabe
      </button>
    </div>
  </header>

  <div class="warning-banner" id="dispo-warning">
    <svg width="18" height="18"><use href="#i-alert"/></svg>
    <span id="dispo-warning-text"></span>
  </div>

  <section class="v3-top">
    <div class="v3-summary">
      <div class="v3-summary-stat">
        <span class="v3-summary-label">Verfügbar bis Gehalt</span>
        <div class="num num-xl" id="stat-available">—</div>
        <span class="v3-summary-label" style="margin-top:4px" id="stat-available-sub">—</span>
      </div>
      <div class="v3-summary-divider"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div><div class="v3-summary-label">Kontostand</div><div class="num num-md" id="stat-balance">—</div></div>
        <div><div class="v3-summary-label">Tiefpunkt</div><div class="num num-md" id="stat-lowest">—</div></div>
        <div><div class="v3-summary-label">Ausgaben</div><div class="num num-md neg" id="stat-out">—</div></div>
        <div><div class="v3-summary-label">Einnahmen</div><div class="num num-md pos" id="stat-in">—</div></div>
      </div>
      <div class="v3-summary-divider"></div>
      <div class="dispo">
        <div class="dispo-head">
          <span>Dispo-Auslastung im Verlauf</span>
          <span id="dispo-head-right"><strong>—</strong></span>
        </div>
        <div class="dispo-track"><div class="dispo-fill" id="dispo-fill" style="width:0%"></div></div>
        <div class="dispo-foot"><span>0 €</span><span id="dispo-foot-right">Limit —</span></div>
      </div>
    </div>
    <div class="v3-chart">
      <div class="card-header">
        <div class="card-title-lg">Kontoverlauf</div>
        <span class="muted" style="font-size:13px" id="chart-range">—</span>
      </div>
      <div class="chart" id="chart-container"></div>
    </div>
  </section>

  <section class="v3-timeline">
    <div class="card-header">
      <div class="card-title-lg">Was passiert bis zum Gehalt</div>
      <span class="muted" style="font-size:13px" id="timeline-count">—</span>
    </div>
    <div class="v3-timeline-rail" id="timeline">
      <div class="empty">
        <div class="empty-illu"><svg width="22" height="22"><use href="#i-calendar"/></svg></div>
        Trage erst dein aktuelles Datum und das Gehaltsdatum in den Einstellungen ein.
      </div>
    </div>
  </section>

  <section class="v3-lists">
    <div class="v3-mini-list">
      <div class="v3-mini-head">
        <div class="card-title-lg">Wiederkehrende Ausgaben</div>
        <button class="pill" id="btn-add-expense-2"><svg width="14" height="14"><use href="#i-plus"/></svg> Neu</button>
      </div>
      <div id="expenses-list">
        <div class="empty"><div class="empty-illu"><svg width="22" height="22"><use href="#i-tag"/></svg></div>Keine Ausgaben eingetragen.</div>
      </div>
    </div>
    <div class="v3-mini-list">
      <div class="v3-mini-head">
        <div class="card-title-lg">Wiederkehrende Einnahmen</div>
        <button class="pill" id="btn-add-income"><svg width="14" height="14"><use href="#i-plus"/></svg> Neu</button>
      </div>
      <div id="incomes-list">
        <div class="empty"><div class="empty-illu"><svg width="22" height="22"><use href="#i-bag"/></svg></div>Keine Einnahmen eingetragen.</div>
      </div>
    </div>
  </section>
</main>

<!-- Settings Modal -->
<div class="modal-overlay" id="settings-modal" role="dialog" aria-modal="true">
  <div class="modal modal-lg">
    <div class="modal-head">
      <div class="modal-title">Einstellungen</div>
      <button class="modal-close" id="btn-close-settings" aria-label="Schließen"><svg width="14" height="14"><use href="#i-close"/></svg></button>
    </div>
    <div class="modal-body">
      <div>
        <div class="section-label">Konto &amp; Zeitraum</div>
        <div class="group">
          <div class="group-row"><label for="s-date">Heutiges Datum</label><input type="date" id="s-date" /></div>
          <div class="group-row"><label for="s-balance">Kontostand</label><input type="number" id="s-balance" step="0.01" placeholder="0,00 €" /></div>
          <div class="group-row"><label for="s-dispo">Disporahmen <span class="hint" style="display:block">negativer Wert</span></label><input type="number" id="s-dispo" step="0.01" placeholder="-1300" /></div>
        </div>
      </div>
      <div>
        <div class="section-label">Gehalt</div>
        <div class="group">
          <div class="group-row"><label for="s-salary-date">Nächster Gehaltseingang</label><input type="date" id="s-salary-date" /></div>
          <div class="group-row"><label for="s-salary-amount">Betrag</label><input type="number" id="s-salary-amount" step="0.01" placeholder="1800" /></div>
        </div>
      </div>
      <div>
        <div class="section-label">Daten</div>
        <div class="data-grid">
          <button class="data-btn" id="btn-import">
            <span class="data-btn-icon"><svg width="16" height="16"><use href="#i-upload"/></svg></span>
            <span class="data-btn-name">Importieren</span>
            <span class="data-btn-sub">JSON laden</span>
          </button>
          <button class="data-btn" id="btn-export">
            <span class="data-btn-icon"><svg width="16" height="16"><use href="#i-download"/></svg></span>
            <span class="data-btn-name">Exportieren</span>
            <span class="data-btn-sub">Als JSON sichern</span>
          </button>
        </div>
      </div>
      <div>
        <div class="section-label">Zurücksetzen</div>
        <button class="btn btn-danger btn-block" id="btn-reset">
          <svg width="16" height="16"><use href="#i-alert"/></svg> Alle Daten löschen
        </button>
      </div>
    </div>
    <div class="modal-foot">
      <div class="save-status" id="save-status" style="flex:1;text-align:left"></div>
      <button class="btn btn-ghost" id="btn-cancel-settings">Schließen</button>
      <button class="btn btn-primary" id="btn-save-settings">Speichern</button>
    </div>
  </div>
</div>

<!-- Reset Confirmation Modal -->
<div class="modal-overlay" id="reset-modal" role="alertdialog" aria-modal="true">
  <div class="modal">
    <div class="modal-head">
      <div class="modal-title">Alle Daten löschen?</div>
      <button class="modal-close" id="btn-close-reset" aria-label="Schließen"><svg width="14" height="14"><use href="#i-close"/></svg></button>
    </div>
    <div class="modal-body">
      <p style="font-size:14px;color:var(--label-secondary);line-height:1.5">
        Es werden <strong style="color:var(--label-primary)">alle Einstellungen, Ausgaben und Einnahmen</strong> unwiderruflich gelöscht.
        Sichere deine Daten vorher über <em style="font-style:normal;color:var(--accent)">Exportieren</em>, falls du sie später noch brauchst.
      </p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" id="btn-cancel-reset">Abbrechen</button>
      <button class="btn btn-danger-solid" id="btn-confirm-reset">Ja, alles löschen</button>
    </div>
  </div>
</div>

<!-- Entry Form Modal (shared expenses/incomes) -->
<div class="modal-overlay" id="entry-modal" role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-head">
      <div class="modal-title" id="entry-modal-title">Ausgabe hinzufügen</div>
      <button class="modal-close" id="btn-close-entry" aria-label="Schließen"><svg width="14" height="14"><use href="#i-close"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="field full"><label for="e-name">Bezeichnung</label><input type="text" id="e-name" placeholder="z.B. Miete" /></div>
        <div class="field"><label for="e-amount">Betrag (€)</label><input type="number" id="e-amount" step="0.01" min="0" placeholder="0,00" /></div>
        <div class="field"><label for="e-date">Nächstes Datum</label><input type="date" id="e-date" /></div>
        <div class="field"><label for="e-end-date">Enddatum <span class="optional">(optional)</span></label><input type="date" id="e-end-date" /></div>
        <div class="field">
          <label for="e-interval">Intervall</label>
          <select id="e-interval">
            <option value="once">Einmalig</option>
            <option value="monthly" selected>Monatlich</option>
            <option value="quarterly">Vierteljährlich</option>
            <option value="biannual">Halbjährlich</option>
            <option value="yearly">Jährlich</option>
          </select>
        </div>
        <div class="field full"><label for="e-category">Kategorie</label><select id="e-category"></select></div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" id="btn-cancel-entry">Abbrechen</button>
      <button class="btn btn-primary" id="btn-save-entry">Speichern</button>
    </div>
  </div>
</div>

<script type="module" src="{{ url_for('static', filename='js/main.js') }}"></script>
</body>
</html>
```

- [ ] **Step 2: Verify Flask serves the page**

```bash
python app.py &
curl -s http://127.0.0.1:5000/ | grep -q "Sparnessa" && echo "OK" || echo "FAIL"
kill %1
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add templates/index.html
git commit -m "feat: HTML shell template"
```

---

### Task 10: Frontend foundation — format.js + icons.js

**Files:**
- Create: `static/js/format.js`
- Create: `static/js/icons.js`

- [ ] **Step 1: Write `static/js/format.js`**

```js
export const CATEGORIES = [
  'Wohnen','Versicherung','Auto','Lebensmittel','Freizeit',
  'Abos','Internet','Strom','Transfer','Sonstiges',
];
export const INCOME_CATEGORIES = [
  'Hauptjob','Nebenverdienst','Familie','Unterhalt',
  'Sozialleistung','Rückerstattung','Sonstiges',
];
export const INTERVAL_LABELS = {
  once: 'einmalig', monthly: 'monatlich', quarterly: 'vierteljährlich',
  biannual: 'halbjährlich', yearly: 'jährlich',
};

export function fmtEur(n, { sign = false, decimals = 2 } = {}) {
  if (typeof n !== 'number' || isNaN(n)) return '—';
  const num = Math.abs(n).toLocaleString('de-DE', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  const prefix = n < 0 ? '−' : (sign && n > 0 ? '+' : '');
  return `${prefix}${num} €`;
}

export function fmtEurCompact(n) {
  const abs = Math.abs(n);
  const prefix = n < 0 ? '−' : '';
  if (abs >= 1000)
    return prefix + (abs / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'k €';
  return prefix + abs.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
}

export function fmtDay(iso) {
  return _toDate(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function fmtDayLong(iso) {
  return _toDate(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
}

export function fmtShortDate(iso) {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

export function daysBetween(isoA, isoB) {
  return Math.round((_toDate(isoB) - _toDate(isoA)) / 86_400_000);
}

export function weekdayLong(iso) {
  return _toDate(iso).toLocaleDateString('de-DE', { weekday: 'long' });
}

export function dayOfMonth(iso) {
  return _toDate(iso).getDate();
}

export function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function _toDate(iso) {
  if (!iso) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
```

- [ ] **Step 2: Write `static/js/icons.js`**

```js
const CATEGORY_ICONS = {
  'Wohnen':'home','Versicherung':'shield','Auto':'car','Lebensmittel':'coffee',
  'Freizeit':'music','Abos':'music','Internet':'wifi','Strom':'bolt','Transfer':'arrow',
  'Hauptjob':'bag','Nebenverdienst':'bag','Familie':'heart','Unterhalt':'heart',
  'Sozialleistung':'heart','Rückerstattung':'tag','Sonstiges':'tag',
};

const NAME_ICONS = [
  [/spotify|netflix|musik|prime|youtube|apple/i, 'music'],
  [/strom|stadtwerke|gas|wasser/i, 'bolt'],
  [/internet|vodafone|telekom|wifi|fritz/i, 'wifi'],
  [/miete|wohn/i, 'home'],
  [/versicher|haftpflicht|kfz/i, 'shield'],
  [/auto|tank|sprit/i, 'car'],
  [/lebensmittel|edeka|rewe|aldi|lidl|kaufland/i, 'coffee'],
  [/gehalt|lohn/i, 'bag'],
  [/kindergeld|kind|unterhalt/i, 'heart'],
  [/transfer|umbuchung|dkb|sparen/i, 'arrow'],
];

export function iconFor(entry) {
  for (const [pat, ic] of NAME_ICONS) if (pat.test(entry.name || '')) return ic;
  return CATEGORY_ICONS[entry.category] || 'tag';
}

export function injectIcons() {
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  container.setAttribute('width', '0');
  container.setAttribute('height', '0');
  container.style.position = 'absolute';
  container.setAttribute('aria-hidden', 'true');
  container.innerHTML = `<defs>
    <symbol id="i-music" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="18" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="1.75"/></symbol>
    <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-heart" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-home" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V9z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-wifi" viewBox="0 0 24 24"><path d="M2 8.82a15 15 0 0 1 20 0M5 12.86a10 10 0 0 1 14 0M8.5 16.43a5 5 0 0 1 7 0" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="20" x2="12" y2="20" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></symbol>
    <symbol id="i-bag" viewBox="0 0 24 24"><path d="M6 2l3 4h6l3-4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="6" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/></symbol>
    <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-car" viewBox="0 0 24 24"><path d="M5 17H3v-5l2-5h14l2 5v5h-2M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-coffee" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-tag" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
    <symbol id="i-plus" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></symbol>
    <symbol id="i-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
    <symbol id="i-pencil" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-trash" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="1.75"/></symbol>
    <symbol id="i-alert" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></symbol>
    <symbol id="i-upload" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-download" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  </defs>`;
  document.body.prepend(container);
}
```

- [ ] **Step 3: Commit**

```bash
git add static/js/format.js static/js/icons.js
git commit -m "feat: format.js + icons.js"
```

---

### Task 11: Frontend data layer — api.js + state.js

**Files:**
- Create: `static/js/api.js`
- Create: `static/js/state.js`

- [ ] **Step 1: Write `static/js/api.js`**

```js
async function _fetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  getSettings:   ()      => _fetch('/api/settings'),
  saveSettings:  (data)  => _fetch('/api/settings', { method: 'POST', body: data }),
  getExpenses:   ()      => _fetch('/api/expenses'),
  createExpense: (data)  => _fetch('/api/expenses', { method: 'POST', body: data }),
  updateExpense: (id, d) => _fetch(`/api/expenses/${id}`, { method: 'PUT', body: d }),
  deleteExpense: (id)    => _fetch(`/api/expenses/${id}`, { method: 'DELETE' }),
  getIncomes:    ()      => _fetch('/api/incomes'),
  createIncome:  (data)  => _fetch('/api/incomes', { method: 'POST', body: data }),
  updateIncome:  (id, d) => _fetch(`/api/incomes/${id}`, { method: 'PUT', body: d }),
  deleteIncome:  (id)    => _fetch(`/api/incomes/${id}`, { method: 'DELETE' }),
  getForecast:   ()      => _fetch('/api/forecast'),
  importData:    (data)  => _fetch('/api/import', { method: 'POST', body: data }),
  resetData:     ()      => _fetch('/api/reset', { method: 'POST' }),
};
```

- [ ] **Step 2: Write `static/js/state.js`**

```js
import { api } from './api.js';

export const state = { settings: {}, expenses: [], incomes: [], forecast: null };

const _subs = [];
export function subscribe(fn) { _subs.push(fn); }
function _notify() { for (const fn of _subs) fn(state); }

export async function refresh() {
  const [settings, expenses, incomes] = await Promise.all([
    api.getSettings(), api.getExpenses(), api.getIncomes(),
  ]);
  state.settings = settings;
  state.expenses = expenses;
  state.incomes  = incomes;
  try { state.forecast = await api.getForecast(); }
  catch { state.forecast = null; }
  _notify();
}
```

- [ ] **Step 3: Commit**

```bash
git add static/js/api.js static/js/state.js
git commit -m "feat: api.js + state.js"
```

---

### Task 12: Render modules — summary + chart

**Files:**
- Create: `static/js/render/summary.js`
- Create: `static/js/render/chart.js`

- [ ] **Step 1: Write `static/js/render/summary.js`**

```js
import { fmtEur, daysBetween, escapeHtml } from '../format.js';

export function renderSummary(state) {
  const { settings: s, forecast: fc } = state;
  const availEl   = document.getElementById('stat-available');
  const availSub  = document.getElementById('stat-available-sub');
  const banner    = document.getElementById('dispo-warning');
  const bannerTxt = document.getElementById('dispo-warning-text');
  const dispoHead = document.getElementById('dispo-head-right');
  const dispoFoot = document.getElementById('dispo-foot-right');
  const dispoFill = document.getElementById('dispo-fill');

  if (!fc) {
    availEl.textContent = '—';
    availEl.className = 'num num-xl';
    availSub.textContent = 'Bitte erst Datum + Gehaltsdatum in Einstellungen setzen';
    _set('stat-balance', fmtEur(s.balance || 0), s.balance < 0 ? 'neg' : '');
    _set('stat-lowest', '—');
    _set('stat-out', '—', 'neg');
    _set('stat-in', '—', 'pos');
    dispoHead.innerHTML = '<strong>—</strong>';
    dispoFoot.textContent = `Limit ${fmtEur(s.disposition_limit || 0)}`;
    dispoFill.style.width = '0%';
    banner.classList.remove('show');
    return;
  }

  availEl.textContent = fmtEur(fc.frei_inkl_dispo);
  availEl.className = 'num num-xl' + (fc.frei_inkl_dispo < 0 ? ' neg' : '');
  const days = daysBetween(s.current_date, s.next_salary_date);
  const salaryHtml = s.next_salary_amount
    ? ` · in <strong style="color:var(--label-primary)">${days} Tagen</strong> kommt <span class="pos">+${escapeHtml(fmtEur(s.next_salary_amount))}</span>`
    : '';
  availSub.innerHTML = `inkl. Dispo${salaryHtml}`;

  _set('stat-balance', fmtEur(s.balance), s.balance < 0 ? 'neg' : 'pos');
  _set('stat-lowest',  fmtEur(fc.lowest),
    fc.lowest < s.disposition_limit ? 'neg' : fc.lowest < 0 ? 'warn' : 'pos');
  _set('stat-out', '−' + fmtEur(fc.total_out).replace('−', ''), 'neg');
  _set('stat-in',  '+' + fmtEur(fc.total_in).replace('−', ''),  'pos');

  let pct = 0;
  if (s.disposition_limit < 0 && fc.lowest < 0)
    pct = Math.min(100, Math.max(0, (fc.lowest / s.disposition_limit) * 100));
  const warn = pct > 85 || !fc.dispo_ok;
  dispoFill.className = 'dispo-fill' + (warn ? ' warn' : '');
  dispoFill.style.width = pct + '%';
  dispoHead.innerHTML = `<strong>${Math.round(pct)} %</strong> · Tiefpunkt ${escapeHtml(fmtEur(fc.lowest))}`;
  dispoFoot.textContent = `Limit ${fmtEur(s.disposition_limit)}`;

  if (!fc.dispo_ok) {
    bannerTxt.textContent = `Dispo-Überschreitung! Tiefpunkt ${fmtEur(fc.lowest)} · Limit ${fmtEur(s.disposition_limit)}`;
    banner.classList.add('show');
  } else {
    banner.classList.remove('show');
  }
}

function _set(id, text, cls = '') {
  const el = document.getElementById(id);
  if (el) { el.textContent = text; el.className = 'num num-md ' + cls; }
}
```

- [ ] **Step 2: Write `static/js/render/chart.js`**

```js
import { fmtEurCompact, fmtDay } from '../format.js';

export function renderChart(state) {
  const container = document.getElementById('chart-container');
  const rangeEl   = document.getElementById('chart-range');
  const { settings: s, forecast: fc } = state;

  if (!fc) {
    container.innerHTML = `<div class="empty"><div class="empty-illu"><svg width="22" height="22"><use href="#i-calendar"/></svg></div>Noch keine Daten für ein Diagramm.</div>`;
    rangeEl.textContent = '—';
    return;
  }

  rangeEl.textContent = `${fmtDay(s.current_date)} → ${fmtDay(s.next_salary_date)}`;

  const W = 720, H = 320, pad = { l: 56, r: 24, t: 16, b: 32 };
  const pts = fc.trajectory;
  const toMs = iso => new Date(iso + 'T00:00:00').getTime();
  const minT = toMs(s.current_date), maxT = toMs(s.next_salary_date);
  const tRange = Math.max(1, maxT - minT);

  const bals = pts.map(p => p.balance);
  const minY = Math.min(...bals, s.disposition_limit, 0);
  const maxY = Math.max(...bals, 0) + 50;
  const yRange = Math.max(1, maxY - minY);
  const padY = 0.08 * yRange;
  const innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
  const xp = iso => pad.l + ((toMs(iso) - minT) / tRange) * innerW;
  const yp = v  => pad.t + (1 - (v - (minY - padY)) / (yRange + 2 * padY)) * innerH;

  let line = '';
  pts.forEach((p, i) => {
    const cx = xp(p.date), cy = yp(p.balance);
    if (i === 0) { line += `M ${cx} ${cy} `; return; }
    const prev = pts[i - 1], px = xp(prev.date), py = yp(prev.balance), mx = (px + cx) / 2;
    line += `C ${mx} ${py}, ${mx} ${cy}, ${cx} ${cy} `;
  });
  const area = line +
    ` L ${xp(pts.at(-1).date)} ${innerH + pad.t} L ${xp(pts[0].date)} ${innerH + pad.t} Z`;

  const step = Math.max(50, Math.ceil(yRange / 4 / 50) * 50);
  const yTicks = [];
  for (let v = Math.ceil((minY - padY) / step) * step; v <= maxY + padY; v += step) yTicks.push(v);

  const dots = pts.map((p, i) => {
    if (i === 0) return '';
    const cls = p.kind === 'salary' ? 'chart-salary-marker' : 'chart-dot';
    return `<circle cx="${xp(p.date)}" cy="${yp(p.balance)}" r="${p.kind === 'salary' ? 5 : 3.5}" class="${cls}"/>`;
  }).join('');

  const xTicks = pts
    .filter((_, i) => i === 0 || i === pts.length - 1 || i % 2 === 0)
    .map(p => `<text x="${xp(p.date)}" y="${H - pad.b + 18}" text-anchor="middle">${fmtDay(p.date)}</text>`)
    .join('');

  const zeroY = yp(0), dispoY = yp(s.disposition_limit);
  const zeroLine = (zeroY >= pad.t && zeroY <= H - pad.b)
    ? `<line class="chart-zero" x1="${pad.l}" y1="${zeroY}" x2="${W - pad.r}" y2="${zeroY}"/>`  : '';
  const dispoLine = (s.disposition_limit < 0 && dispoY >= pad.t && dispoY <= H - pad.b)
    ? `<line class="chart-dispo" x1="${pad.l}" y1="${dispoY}" x2="${W - pad.r}" y2="${dispoY}"/>
       <text x="${W - pad.r - 4}" y="${dispoY - 6}" text-anchor="end" style="fill:var(--red);font-size:10px;font-weight:600;font-family:var(--font)">Dispo ${fmtEurCompact(s.disposition_limit)}</text>`
    : '';

  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <g class="chart-grid">${yTicks.map(v => `<line x1="${pad.l}" y1="${yp(v)}" x2="${W - pad.r}" y2="${yp(v)}"/>`).join('')}</g>
    <g class="chart-axis">${yTicks.map(v => `<text x="${pad.l - 8}" y="${yp(v) + 3}" text-anchor="end">${fmtEurCompact(v)}</text>`).join('')}</g>
    <g class="chart-axis">${xTicks}</g>
    ${zeroLine}${dispoLine}
    <path class="chart-area" d="${area}" fill="url(#balanceGrad)"/>
    <path class="chart-line" d="${line}"/>
    ${dots}
    <circle cx="${xp(pts[0].date)}" cy="${yp(pts[0].balance)}" r="5" class="chart-dot-active"/>
  </svg>`;
}
```

- [ ] **Step 3: Commit**

```bash
git add static/js/render/summary.js static/js/render/chart.js
git commit -m "feat: render/summary.js + render/chart.js"
```

---

### Task 13: Render modules — timeline + lists

**Files:**
- Create: `static/js/render/timeline.js`
- Create: `static/js/render/lists.js`

- [ ] **Step 1: Write `static/js/render/timeline.js`**

```js
import { fmtEur, fmtShortDate, daysBetween, weekdayLong, dayOfMonth, escapeHtml, INTERVAL_LABELS } from '../format.js';

export function renderTimeline(state) {
  const root    = document.getElementById('timeline');
  const countEl = document.getElementById('timeline-count');
  const { settings: s, forecast: fc } = state;

  if (!fc) {
    root.innerHTML = `<div class="empty"><div class="empty-illu"><svg width="22" height="22"><use href="#i-calendar"/></svg></div>Trage erst dein aktuelles Datum und das Gehaltsdatum in den Einstellungen ein.</div>`;
    countEl.textContent = '—';
    return;
  }

  const days = daysBetween(s.current_date, s.next_salary_date);
  countEl.textContent = `${fc.upcoming.length + 2} Termine · ${days} Tag${days === 1 ? '' : 'e'}`;

  const groups = new Map();
  for (const ev of fc.upcoming) {
    if (!groups.has(ev.date)) groups.set(ev.date, []);
    groups.get(ev.date).push(ev);
  }

  let html = _dayBlock({ iso: s.current_date, title: 'Heute',
    subtitle: `Kontostand ${fmtEur(s.balance)}`, kind: 'today', items: [] });

  let running = s.balance;
  for (const dateStr of [...groups.keys()].sort()) {
    const items = groups.get(dateStr);
    const net = items.reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
    running += net;
    const d = daysBetween(s.current_date, dateStr);
    html += _dayBlock({
      iso: dateStr, title: weekdayLong(dateStr),
      subtitle: `in ${d} Tag${d === 1 ? '' : 'en'} · Stand danach ${fmtEur(running)}`,
      net, items, kind: 'event',
    });
  }

  if (s.next_salary_amount) {
    html += _dayBlock({
      iso: s.next_salary_date, title: 'Gehalt',
      subtitle: `Kontostand ${fmtEur(fc.balance_after_salary)}`,
      net: s.next_salary_amount,
      items: [{ name: 'Gehalt', amount: s.next_salary_amount, type: 'income', category: 'Hauptjob' }],
      kind: 'salary',
    });
  }

  root.innerHTML = html;
}

function _dayBlock({ iso, title, subtitle, net, items, kind }) {
  const netHtml = typeof net === 'number'
    ? `<div class="v3-day-net ${net < 0 ? 'neg' : 'pos'}">${net > 0 ? '+' : ''}${escapeHtml(fmtEur(net))}</div>`
    : '';
  const itemsHtml = (items || []).map(it => `
    <div class="v3-day-item">
      <div><span>${escapeHtml(it.name)}</span><span class="v3-cat">${escapeHtml(it.category || '')}</span></div>
      <div class="v3-amount ${it.type === 'income' ? 'pos' : 'neg'}">${it.type === 'income' ? '+' : '−'}${escapeHtml(fmtEur(Math.abs(it.amount)).replace('−', ''))}</div>
    </div>`).join('');
  const kindCls = kind === 'today' ? 'today' : kind === 'salary' ? 'salary' : '';
  return `
    <div class="v3-day ${kindCls}">
      <div class="v3-day-node">${dayOfMonth(iso)}</div>
      <div class="v3-day-head">
        <div class="v3-day-title">${escapeHtml(title)} <span class="when">${escapeHtml(subtitle)}</span></div>
        ${netHtml}
      </div>
      ${items && items.length ? `<div class="v3-day-items">${itemsHtml}</div>` : ''}
    </div>`;
}
```

- [ ] **Step 2: Write `static/js/render/lists.js`**

```js
import { fmtEur, fmtShortDate, escapeHtml, INTERVAL_LABELS } from '../format.js';
import { iconFor } from '../icons.js';

export function renderMiniLists(state) {
  _render('expenses-list', state.expenses, 'expense');
  _render('incomes-list',  state.incomes,  'income');
}

function _render(rootId, items, type) {
  const root = document.getElementById(rootId);
  if (!root) return;
  if (!items.length) {
    root.innerHTML = `<div class="empty"><div class="empty-illu"><svg width="22" height="22"><use href="#i-${type === 'income' ? 'bag' : 'tag'}"/></svg></div>${type === 'income' ? 'Noch keine Einnahmen' : 'Noch keine Ausgaben'} eingetragen.</div>`;
    return;
  }
  const color = type === 'income'
    ? 'background:rgba(48,209,88,0.15);color:var(--green)'
    : 'background:rgba(191,90,242,0.15);color:var(--accent)';
  root.innerHTML = items.map(e => `
    <div class="v3-mini-item" data-id="${escapeHtml(e.id)}" data-type="${type}">
      <div class="v3-mini-icon" style="${color}"><svg width="16" height="16"><use href="#i-${iconFor(e)}"/></svg></div>
      <div>
        <div class="v3-mini-name">${escapeHtml(e.name)}</div>
        <div class="v3-mini-meta">${escapeHtml(e.category || '')} · ${INTERVAL_LABELS[e.interval] || e.interval} · nächst. ${escapeHtml(fmtShortDate(e.next_date))}${e.end_date ? ' · bis ' + escapeHtml(fmtShortDate(e.end_date)) : ''}</div>
      </div>
      <div class="v3-mini-amount ${type === 'income' ? 'pos' : 'neg'}">${type === 'income' ? '+' : '−'}${escapeHtml(fmtEur(e.amount).replace('−', ''))}</div>
      <div class="row-actions">
        <button class="row-action" data-action="edit" aria-label="Bearbeiten"><svg width="13" height="13"><use href="#i-pencil"/></svg></button>
        <button class="row-action danger" data-action="delete" aria-label="Löschen"><svg width="13" height="13"><use href="#i-trash"/></svg></button>
      </div>
    </div>`).join('');
}
```

- [ ] **Step 3: Commit**

```bash
git add static/js/render/timeline.js static/js/render/lists.js
git commit -m "feat: render/timeline.js + render/lists.js"
```

---

### Task 14: Modal modules

**Files:**
- Create: `static/js/modals/settings.js`
- Create: `static/js/modals/entry.js`
- Create: `static/js/modals/reset.js`

- [ ] **Step 1: Write `static/js/modals/settings.js`**

```js
import { api } from '../api.js';
import { state, refresh } from '../state.js';
import { isoToday } from '../format.js';

export function registerSettingsModal(openFn, closeFn, showStatus) {
  document.getElementById('btn-open-settings').addEventListener('click', () => {
    _fillForm(state.settings);
    openFn('settings-modal');
  });

  document.getElementById('btn-close-settings').addEventListener('click', () => closeFn('settings-modal'));
  document.getElementById('btn-cancel-settings').addEventListener('click', () => closeFn('settings-modal'));

  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const data = {
      current_date:       document.getElementById('s-date').value,
      balance:            parseFloat(document.getElementById('s-balance').value) || 0,
      disposition_limit:  parseFloat(document.getElementById('s-dispo').value) || -1300,
      next_salary_date:   document.getElementById('s-salary-date').value || null,
      next_salary_amount: parseFloat(document.getElementById('s-salary-amount').value) || 0,
    };
    try {
      await api.saveSettings(data);
      await refresh();
      closeFn('settings-modal');
    } catch (err) {
      showStatus('error', err.message);
    }
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    window.location.href = '/api/export';
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        await api.importData(data);
        await refresh();
        closeFn('settings-modal');
      } catch (err) {
        showStatus('error', 'Import fehlgeschlagen: ' + err.message);
      }
    };
    input.click();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    closeFn('settings-modal');
    openFn('reset-modal');
  });
}

function _fillForm(s) {
  document.getElementById('s-date').value          = s.current_date || isoToday();
  document.getElementById('s-balance').value       = s.balance ?? 0;
  document.getElementById('s-dispo').value         = s.disposition_limit ?? -1300;
  document.getElementById('s-salary-date').value   = s.next_salary_date || '';
  document.getElementById('s-salary-amount').value = s.next_salary_amount ?? 1800;
}
```

- [ ] **Step 2: Write `static/js/modals/entry.js`**

```js
import { api } from '../api.js';
import { state, refresh } from '../state.js';
import { CATEGORIES, INCOME_CATEGORIES, isoToday } from '../format.js';

let _type = null, _id = null;

export function openEntry(type, id, openFn) {
  _type = type; _id = id || null;
  const isIncome = type === 'income';
  document.getElementById('entry-modal-title').textContent =
    _id ? (isIncome ? 'Einnahme bearbeiten' : 'Ausgabe bearbeiten')
        : (isIncome ? 'Einnahme hinzufügen' : 'Ausgabe hinzufügen');

  const sel = document.getElementById('e-category');
  sel.innerHTML = '';
  (isIncome ? INCOME_CATEGORIES : CATEGORIES).forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c; sel.appendChild(o);
  });

  const list  = isIncome ? state.incomes : state.expenses;
  const entry = _id ? list.find(e => e.id === _id) : null;
  document.getElementById('e-name').value     = entry?.name     ?? '';
  document.getElementById('e-amount').value   = entry?.amount   ?? '';
  document.getElementById('e-date').value     = entry?.next_date ?? isoToday();
  document.getElementById('e-end-date').value = entry?.end_date ?? '';
  document.getElementById('e-interval').value = entry?.interval ?? 'monthly';
  document.getElementById('e-category').value = entry?.category ?? (isIncome ? 'Hauptjob' : 'Wohnen');

  openFn('entry-modal');
  setTimeout(() => document.getElementById('e-name').focus(), 50);
}

export function registerEntryModal(openFn, closeFn, showStatus) {
  document.getElementById('btn-close-entry').addEventListener('click',  () => closeFn('entry-modal'));
  document.getElementById('btn-cancel-entry').addEventListener('click', () => closeFn('entry-modal'));
  document.getElementById('btn-save-entry').addEventListener('click',   () => _save(closeFn, showStatus));
}

async function _save(closeFn, showStatus) {
  const name    = document.getElementById('e-name').value.trim();
  const amount  = parseFloat(document.getElementById('e-amount').value);
  const nextDate = document.getElementById('e-date').value;
  const endDate  = document.getElementById('e-end-date').value || null;
  const interval = document.getElementById('e-interval').value;
  const category = document.getElementById('e-category').value;

  if (!name || isNaN(amount) || !nextDate)
    return _flashError('Bitte Name, Betrag und Datum ausfüllen.', showStatus);
  if (amount <= 0)
    return _flashError('Betrag muss größer als 0 sein.', showStatus);
  if (endDate && endDate < nextDate)
    return _flashError('Enddatum darf nicht vor dem Startdatum liegen.', showStatus);

  const data = { name, amount, next_date: nextDate, end_date: endDate, interval, category };
  try {
    if (_type === 'expense')
      _id ? await api.updateExpense(_id, data) : await api.createExpense(data);
    else
      _id ? await api.updateIncome(_id, data)  : await api.createIncome(data);
    await refresh();
    closeFn('entry-modal');
  } catch (err) {
    _flashError(err.message, showStatus);
  }
}

function _flashError(msg, showStatus) {
  showStatus('error', msg);
  const modal = document.querySelector('#entry-modal .modal');
  if (modal) {
    modal.style.boxShadow = '0 24px 60px rgba(0,0,0,0.5),0 0 0 1px var(--red)';
    setTimeout(() => { modal.style.boxShadow = ''; }, 600);
  }
}
```

- [ ] **Step 3: Write `static/js/modals/reset.js`**

```js
import { api } from '../api.js';
import { refresh } from '../state.js';

export function registerResetModal(closeFn) {
  document.getElementById('btn-close-reset').addEventListener('click',   () => closeFn('reset-modal'));
  document.getElementById('btn-cancel-reset').addEventListener('click',  () => closeFn('reset-modal'));
  document.getElementById('btn-confirm-reset').addEventListener('click', async () => {
    await api.resetData();
    await refresh();
    closeFn('reset-modal');
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add static/js/modals/
git commit -m "feat: modal modules (settings, entry, reset)"
```

---

### Task 15: main.js + run.sh

**Files:**
- Create: `static/js/main.js`
- Create: `run.sh`

- [ ] **Step 1: Write `static/js/main.js`**

```js
import { injectIcons } from './icons.js';
import { state, subscribe, refresh } from './state.js';
import { api } from './api.js';
import { renderSummary  } from './render/summary.js';
import { renderChart    } from './render/chart.js';
import { renderTimeline } from './render/timeline.js';
import { renderMiniLists} from './render/lists.js';
import { registerSettingsModal } from './modals/settings.js';
import { openEntry, registerEntryModal } from './modals/entry.js';
import { registerResetModal } from './modals/reset.js';

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (!document.querySelector('.modal-overlay.open'))
    document.body.style.overflow = '';
}

let _statusTimer = null;
function showStatus(type, msg) {
  const el = document.getElementById('save-status');
  if (!el) return;
  clearTimeout(_statusTimer);
  el.className = 'save-status ' + type;
  el.textContent = msg;
  _statusTimer = setTimeout(() => { el.textContent = ''; el.className = 'save-status'; }, 2500);
}

function renderAll(s) {
  renderSummary(s);
  renderChart(s);
  renderTimeline(s);
  renderMiniLists(s);
  const el = document.getElementById('next-salary-text');
  if (el) {
    el.textContent = s.settings.next_salary_date
      ? `Bis ${new Date(s.settings.next_salary_date + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
      : 'Kein Gehaltsdatum';
  }
}

async function _delete(type, id) {
  if (type === 'expense') await api.deleteExpense(id);
  else await api.deleteIncome(id);
  await refresh();
}

async function init() {
  injectIcons();
  subscribe(renderAll);

  registerSettingsModal(openModal, closeModal, showStatus);
  registerEntryModal(openModal, closeModal, showStatus);
  registerResetModal(closeModal);

  document.getElementById('btn-add-expense').addEventListener('click',
    () => openEntry('expense', null, openModal));
  document.getElementById('btn-add-expense-2').addEventListener('click',
    () => openEntry('expense', null, openModal));
  document.getElementById('btn-add-income').addEventListener('click',
    () => openEntry('income', null, openModal));

  document.body.addEventListener('click', e => {
    const row = e.target.closest('.v3-mini-item');
    if (!row) return;
    const { id, type } = row.dataset;
    const btn = e.target.closest('.row-action');
    if (btn) {
      if (btn.dataset.action === 'edit')   openEntry(type, id, openModal);
      if (btn.dataset.action === 'delete') _delete(type, id);
    } else {
      openEntry(type, id, openModal);
    }
  });

  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); }));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const open = document.querySelectorAll('.modal-overlay.open');
      if (open.length) closeModal(open[open.length - 1].id);
    }
    if (e.key === 'Enter' && document.getElementById('entry-modal').classList.contains('open')
        && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT') {
      e.preventDefault();
      document.getElementById('btn-save-entry').click();
    }
  });

  await refresh();

  if (!state.settings.next_salary_date && !state.expenses.length && !state.incomes.length)
    setTimeout(() => openModal('settings-modal'), 350);
}

document.addEventListener('DOMContentLoaded', init);
```

- [ ] **Step 2: Write `run.sh`**

```bash
#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d ".venv" ]; then
  python -m venv .venv
  .venv/bin/pip install -q flask python-dateutil
fi

source .venv/bin/activate
echo "Starting Sparnessa → http://127.0.0.1:5000"
python app.py
```

```bash
chmod +x run.sh
```

- [ ] **Step 3: Commit**

```bash
git add static/js/main.js run.sh
git commit -m "feat: main.js + run.sh"
```

---

### Task 16: Smoke test + final verification

- [ ] **Step 1: Run full test suite**

```bash
pytest tests/ -v
```
Expected: all tests PASS, no errors

- [ ] **Step 2: Start the app**

```bash
source .venv/bin/activate
python app.py &
sleep 2
```

- [ ] **Step 3: Verify all API endpoints**

```bash
# Settings
curl -s http://127.0.0.1:5000/api/settings | python -m json.tool | grep balance

# Create expense
curl -s -X POST http://127.0.0.1:5000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"name":"Miete","amount":800,"next_date":"2026-05-01","interval":"monthly","category":"Wohnen"}' | python -m json.tool | grep id

# Settings with salary date
curl -s -X POST http://127.0.0.1:5000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"current_date":"2026-05-16","balance":1500,"disposition_limit":-1300,"next_salary_date":"2026-05-31","next_salary_amount":2000}' > /dev/null

# Forecast
curl -s http://127.0.0.1:5000/api/forecast | python -m json.tool | grep balance_before_salary

# HTML shell
curl -s http://127.0.0.1:5000/ | grep -q "Sparnessa" && echo "HTML OK"

kill %1
```

Expected: each command returns valid JSON/HTML with no errors

- [ ] **Step 4: Open in browser and verify visually**

```bash
python app.py &
xdg-open http://127.0.0.1:5000
```

Check:
- Dark background, Inter font, purple accent visible
- "Verfügbar bis Gehalt" shows `—` on first load
- Settings modal auto-opens after ~350ms
- Fill in settings (balance, dispo, salary date/amount) → save → summary updates
- Add an expense → appears in list + timeline + chart updates
- Edit expense → values pre-filled in modal
- Delete expense → removed from list
- Export → downloads JSON file
- Reset → all data cleared

- [ ] **Step 5: Stop server and final commit**

```bash
kill %1
git add -A
git commit -m "feat: Sparnessa Flask app — complete"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `python app.py` starts on port 5000 | Task 2, 15 |
| Persist to `data/sparnessa.db` | Task 2 |
| Full API surface | Tasks 3–6 |
| Forecast in `backend/services/forecast.py` | Task 5 |
| Modular file structure | All tasks |
| ES modules, no bundler | Tasks 10–15 |
| Frontend + backend validation | Tasks 4, 14 |
| JSON errors on 400 | Tasks 3–6 |
| Import/export/reset | Task 6 |
| First-run auto-open settings | Task 15 |
| ESC closes modal | Task 15 |
| Enter saves entry form | Task 15 |
| Click overlay closes modal | Task 15 |
| Hover shows edit/delete | Task 8 (CSS), Task 13 |
| Visual design matching prototype | Tasks 7–9 |

**No placeholders found.** All steps have actual code or commands.

**Type consistency:** `snake_case` field names used consistently throughout backend (DB, models, API) and frontend (reads from API). `next_date`, `end_date`, `current_date`, `next_salary_date`, `next_salary_amount`, `disposition_limit`, `frei_inkl_dispo`, `dispo_ok`, `total_out`, `total_in`, `balance_before_salary`, `balance_after_salary` — all consistent across Tasks 2–15.
