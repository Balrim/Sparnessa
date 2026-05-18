import os
import sys
import sqlite3
from flask import g, current_app


def get_db_path() -> str:
    if sys.platform == 'win32':
        base = os.path.join(os.path.expanduser('~'), 'Documents', 'FinanzenApp')
    else:
        base = os.path.join(os.path.expanduser('~'), '.local', 'share', 'FinanzenApp')
    os.makedirs(base, exist_ok=True)
    return os.path.join(base, 'sparnessa.db')

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
    loan_details TEXT,
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
    # Migration: add loan_details to expenses if not present
    try:
        db.execute("ALTER TABLE expenses ADD COLUMN loan_details TEXT")
        db.commit()
    except Exception:
        pass  # column already exists
