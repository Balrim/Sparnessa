import json
import os
import urllib.request
from flask import jsonify, Response
from backend import update_state

_CHUNK = 65536  # 64 KB


def register(bp):
    @bp.route('/api/update-info')
    def update_info():
        return jsonify(update_state.state)

    @bp.route('/api/download-update-stream')
    def download_update_stream():
        url = update_state.state.get('download_url')

        def generate():
            if not url:
                yield 'data: ' + json.dumps({'error': 'Kein Download-Link verfügbar'}) + '\n\n'
                return
            dest = os.path.join(os.path.expanduser('~'), 'Downloads', 'Sparnessa.exe')
            try:
                with urllib.request.urlopen(urllib.request.Request(url)) as resp:
                    total = int(resp.headers.get('Content-Length') or 0)
                    downloaded = 0
                    with open(dest, 'wb') as f:
                        while True:
                            chunk = resp.read(_CHUNK)
                            if not chunk:
                                break
                            f.write(chunk)
                            downloaded += len(chunk)
                            percent = int(downloaded * 100 / total) if total else -1
                            yield 'data: ' + json.dumps({'percent': percent}) + '\n\n'
                yield 'data: ' + json.dumps({'done': True, 'path': dest}) + '\n\n'
            except Exception as e:
                yield 'data: ' + json.dumps({'error': str(e)}) + '\n\n'

        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
        )
