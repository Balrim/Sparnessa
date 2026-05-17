import json
from datetime import date
from flask import request, jsonify, Response
from backend.db import get_db
from backend.models.settings import get_settings, save_settings, DEFAULTS
from backend.models.expenses import get_all as get_expenses
from backend.models.incomes  import get_all as get_incomes
from backend.services.importexport import export_data, normalize_import, validate_import

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
        data = normalize_import(request.get_json() or {})
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
                    "INSERT INTO expenses (id, name, amount, next_date, end_date, interval, category, loan_details) VALUES (?,?,?,?,?,?,?,?)",
                    (e['id'], e['name'], e['amount'], e['next_date'],
                     e.get('end_date'), e['interval'], e.get('category', 'Sonstiges'),
                     json.dumps(e['loan_details']) if e.get('loan_details') else None))
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
