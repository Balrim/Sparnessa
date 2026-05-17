from flask import jsonify
from backend.models.settings import get_settings
from backend.models.expenses import get_all as get_expenses
from backend.models.incomes  import get_all as get_incomes
from backend.services.forecast import calculate

def register(bp):
    @bp.route('/api/forecast', methods=['GET'])
    def api_forecast():
        result = calculate(get_settings(), get_expenses(), get_incomes())
        if result is None:
            return jsonify({'error': 'Kein Gehaltsdatum gesetzt'}), 400
        return jsonify(result)
