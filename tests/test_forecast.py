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
