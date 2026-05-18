import sys
import os

if getattr(sys, 'frozen', False):
    devnull = open(os.devnull, 'w')
    sys.stdout = devnull
    sys.stderr = devnull

from flask import Flask
from backend.db import init_db, close_db, get_db_path
from backend.api import create_blueprint

def create_app(config=None):
    app = Flask(__name__)
    app.config['DATABASE'] = get_db_path()
    if config:
        app.config.update(config)
    app.teardown_appcontext(close_db)
    app.register_blueprint(create_blueprint())
    with app.app_context():
        init_db()
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=False, use_reloader=False, port=5000)
