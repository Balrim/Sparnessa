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
