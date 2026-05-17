from datetime import date

def export_data(settings: dict, expenses: list, incomes: list) -> dict:
    return {'settings': settings, 'expenses': expenses,
            'incomes': incomes, 'exported_at': date.today().isoformat()}

def normalize_import(data: dict) -> dict:
    """Accept both camelCase (old JS export) and snake_case (new Flask export)."""
    s = data.get('settings', {})
    norm_settings = {
        'current_date':       s.get('current_date') or s.get('currentDate'),
        'balance':            s.get('balance', 0),
        'disposition_limit':  s.get('disposition_limit') if 'disposition_limit' in s else s.get('dispositionLimit', -1300),
        'next_salary_date':   s.get('next_salary_date') or s.get('nextSalaryDate'),
        'next_salary_amount': s.get('next_salary_amount') if 'next_salary_amount' in s else s.get('nextSalaryAmount', 1800),
    }

    def norm_entry(e):
        return {
            'id':        e.get('id', ''),
            'name':      e.get('name', ''),
            'amount':    e.get('amount'),
            'next_date': e.get('next_date') or e.get('nextDate', ''),
            'end_date':  e.get('end_date') or e.get('endDate'),
            'interval':  e.get('interval', ''),
            'category':  e.get('category', 'Sonstiges'),
        }

    return {
        'settings': norm_settings,
        'expenses': [norm_entry(e) for e in data.get('expenses', [])],
        'incomes':  [norm_entry(e) for e in data.get('incomes', [])],
    }

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
