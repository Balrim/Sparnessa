import os
import urllib.request
from flask import jsonify, request
from backend import update_state


def register(bp):
    @bp.route('/api/update-info')
    def update_info():
        return jsonify(update_state.state)

    @bp.route('/api/download-update', methods=['POST'])
    def download_update():
        url = update_state.state.get('download_url')
        if not url:
            return jsonify({'error': 'Kein Download-Link verfügbar'}), 400

        dest = os.path.join(os.path.expanduser('~'), 'Downloads', 'Sparnessa.exe')
        try:
            urllib.request.urlretrieve(url, dest)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

        return jsonify({'ok': True, 'path': dest})
