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
