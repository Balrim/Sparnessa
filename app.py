import os
from flask import Flask
from backend.db import init_db, close_db
from backend.api import create_blueprint

def create_app(config=None):
    app = Flask(__name__)
    app.config['DATABASE'] = os.path.join(app.root_path, 'data', 'sparnessa.db')
    if config:
        app.config.update(config)
    app.teardown_appcontext(close_db)
    app.register_blueprint(create_blueprint())
    with app.app_context():
        init_db()
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
