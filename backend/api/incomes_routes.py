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
