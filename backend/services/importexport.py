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
            'id':          e.get('id', ''),
            'name':        e.get('name', ''),
            'amount':      e.get('amount'),
            'next_date':   e.get('next_date') or e.get('nextDate', ''),
            'end_date':    e.get('end_date') or e.get('endDate'),
            'interval':    e.get('interval', ''),
            'category':    e.get('category', 'Sonstiges'),
            'loan_details': e.get('loan_details'),
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
    def _validate_loan_details(ld, name):
        if ld is None:
            return None
        if not isinstance(ld, dict):
            return f'loan_details muss ein Objekt sein bei "{name}"'
        if not isinstance(ld.get('principal'), (int, float)) or ld.get('principal', 0) <= 0:
            return f'Ungültiges loan_details.principal bei "{name}"'
        if not isinstance(ld.get('interest_rate'), (int, float)) or ld.get('interest_rate', -1) < 0:
            return f'Ungültiges loan_details.interest_rate bei "{name}"'
        if not isinstance(ld.get('term_months'), (int, float)) or ld.get('term_months', 0) <= 0:
            return f'Ungültiges loan_details.term_months bei "{name}"'
        if not ld.get('start_date'):
            return f'loan_details.start_date fehlt bei "{name}"'
        if not isinstance(ld.get('special_payments'), list):
            return f'loan_details.special_payments kein Array bei "{name}"'
        return None

    for entry in [*data.get('expenses', []), *data.get('incomes', [])]:
        err = _validate_loan_details(entry.get('loan_details'), entry.get('name', ''))
        if err:
            return False, err
    return True, None
