import os
import tempfile
import pytest

@pytest.fixture
def app():
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    from app import create_app
    flask_app = create_app({'TESTING': True, 'DATABASE': db_path})
    yield flask_app
    os.close(db_fd)
    os.unlink(db_path)

@pytest.fixture
def client(app):
    return app.test_client()
