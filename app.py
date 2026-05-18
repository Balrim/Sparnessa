import sys
import os

if getattr(sys, 'frozen', False):
    devnull = open(os.devnull, 'w')
    sys.stdout = devnull
    sys.stderr = devnull

from flask import Flask
from backend.db import init_db, close_db, get_db_path
from backend.api import create_blueprint

APP_VERSION = "0.0.0"

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

@app.route('/api/version')
def version():
    from flask import jsonify
    return jsonify({'version': APP_VERSION})

def _check_for_update():
    import urllib.request
    import urllib.error
    import json
    from backend import update_state

    try:
        req = urllib.request.Request(
            "https://api.github.com/repos/Balrim/Sparnessa/releases/latest",
            headers={"User-Agent": f"Sparnessa/{APP_VERSION}"},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())

        tag = data.get("tag_name", "").lstrip("v")
        download_url = next(
            (a["browser_download_url"] for a in data.get("assets", [])
             if a["browser_download_url"].endswith(".exe")),
            None,
        )

        if tag and tag > APP_VERSION:
            update_state.state.update({
                "checked": True,
                "available": True,
                "version": tag,
                "download_url": download_url,
            })
        else:
            update_state.state["checked"] = True
    except Exception:
        update_state.state["checked"] = True

if __name__ == '__main__':
    if getattr(sys, 'frozen', False):
        import threading
        import webbrowser
        import pystray
        from PIL import Image, ImageDraw

        threading.Thread(target=_check_for_update, daemon=True).start()

        def run_flask():
            app.run(debug=False, use_reloader=False, port=5000)

        flask_thread = threading.Thread(target=run_flask, daemon=True)
        flask_thread.start()

        threading.Timer(1.5, lambda: webbrowser.open("http://127.0.0.1:5000")).start()

        def make_icon_image():
            img = Image.new('RGB', (64, 64), color=(37, 99, 235))
            draw = ImageDraw.Draw(img)
            draw.ellipse([8, 8, 56, 56], fill=(255, 255, 255))
            draw.text((22, 18), 'S', fill=(37, 99, 235))
            return img

        def on_open(icon, item):
            webbrowser.open("http://127.0.0.1:5000")

        def on_quit(icon, item):
            icon.stop()
            os._exit(0)

        menu = pystray.Menu(
            pystray.MenuItem("Öffnen", on_open),
            pystray.MenuItem("Beenden", on_quit),
        )
        icon = pystray.Icon("Sparnessa", make_icon_image(), "Sparnessa", menu)
        icon.run()
    else:
        app.run(debug=False, use_reloader=False, port=5000)
