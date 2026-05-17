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

    # When end_date clips the series, the next occurrence may overshoot upper;
    # back up one step to include the last valid occurrence in that case.
    if cur > upper:
        prev = cur - relativedelta(months=step)
        if prev < nd:
            return []
        cur = prev

    results = []
    while from_date < cur <= upper:
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

    # Period 2: salary_date → salary_date + 1 month (for chart only)
    to_date2 = to_date + relativedelta(months=1)
    upcoming2 = []
    for e in expenses:
        for d in occurrences(e, to_date, to_date2):
            upcoming2.append({**e, 'date': d, 'type': 'expense'})
    for i in incomes:
        for d in occurrences(i, to_date, to_date2):
            upcoming2.append({**i, 'date': d, 'type': 'income'})
    upcoming2.sort(key=lambda x: x['date'])
    for ev in upcoming2:
        running += ev['amount'] if ev['type'] == 'income' else -ev['amount']
        trajectory.append({'date': ev['date'], 'balance': running,
                           'kind': ev['type'], 'label': ev['name']})
    running += salary_amount
    trajectory.append({'date': to_date2.isoformat(), 'balance': running,
                       'kind': 'salary', 'label': 'Gehalt'})

    return {
        'upcoming': upcoming,
        'total_out': total_out, 'total_in': total_in,
        'balance_before_salary': balance_before_salary,
        'balance_after_salary': balance_after_salary,
        'dispo_ok': dispo_ok, 'frei_inkl_dispo': frei_inkl_dispo,
        'lowest': lowest, 'trajectory': trajectory,
    }
