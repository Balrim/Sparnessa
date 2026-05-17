from flask import request, jsonify
from backend.models.settings import get_settings, save_settings

def register(bp):
    @bp.route('/api/settings', methods=['GET'])
    def api_get_settings():
        return jsonify(get_settings())

    @bp.route('/api/settings', methods=['POST'])
    def api_save_settings():
        data = request.get_json()
        for field in ('current_date', 'balance', 'disposition_limit', 'next_salary_amount'):
            if field not in data:
                return jsonify({'error': f'{field} fehlt'}), 400
        try:
            payload = {
                'current_date':       data['current_date'],
                'balance':            float(data['balance']),
                'disposition_limit':  float(data['disposition_limit']),
                'next_salary_date':   data.get('next_salary_date') or None,
                'next_salary_amount': float(data['next_salary_amount']),
            }
        except (TypeError, ValueError) as e:
            return jsonify({'error': str(e)}), 400
        return jsonify(save_settings(payload))
