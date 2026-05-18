from flask import Blueprint, render_template

def create_blueprint():
    bp = Blueprint('main', __name__)

    @bp.route('/')
    def index():
        return render_template('index.html')

    from backend.api.settings_routes import register as reg_settings
    from backend.api.expenses_routes import register as reg_expenses
    from backend.api.incomes_routes  import register as reg_incomes
    from backend.api.forecast_routes import register as reg_forecast
    from backend.api.data_routes     import register as reg_data
    from backend.api.update_routes   import register as reg_update

    reg_settings(bp)
    reg_expenses(bp)
    reg_incomes(bp)
    reg_forecast(bp)
    reg_data(bp)
    reg_update(bp)

    return bp
