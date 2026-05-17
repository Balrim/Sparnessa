from datetime import date
from dateutil.relativedelta import relativedelta
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
    settings = dict(row)
    return _advance_salary_if_needed(settings)

def _advance_salary_if_needed(settings: dict) -> dict:
    current = settings.get('current_date')
    salary  = settings.get('next_salary_date')
    if not current or not salary:
        return settings

    cur_d = date.fromisoformat(current)
    sal_d = date.fromisoformat(salary)
    if cur_d < sal_d:
        return settings

    while sal_d <= cur_d:
        sal_d += relativedelta(months=1)

    new_date = sal_d.isoformat()
    get_db().execute(
        "UPDATE settings SET next_salary_date = ?, updated_at = datetime('now') WHERE id = 1",
        (new_date,)
    )
    get_db().commit()
    return {**settings, 'next_salary_date': new_date}

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
