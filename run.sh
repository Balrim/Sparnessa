#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d ".venv" ]; then
  python -m venv .venv
  .venv/bin/pip install -q flask python-dateutil
fi

source .venv/bin/activate

# Alten Prozess auf Port 5000 beenden, aber nur wenn es Sparnessa ist
PORT_PIDS="$(lsof -ti:5000 2>/dev/null || true)"
if [ -n "$PORT_PIDS" ]; then
  FOREIGN_FOUND=false
  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    PROC_CMD="$(ps -p "$pid" -o args= 2>/dev/null || true)"
    PROC_CWD="$(readlink /proc/$pid/cwd 2>/dev/null || true)"
    if [ "$PROC_CWD" != "$SCRIPT_DIR" ]; then
      echo "Fehler: Port 5000 wird von einem anderen Programm genutzt (PID $pid: $PROC_CMD)"
      FOREIGN_FOUND=true
    fi
  done <<< "$PORT_PIDS"
  if [ "$FOREIGN_FOUND" = true ]; then
    exit 1
  fi
  echo "Alter Sparnessa-Prozess gefunden – beende ihn..."
  echo "$PORT_PIDS" | xargs kill 2>/dev/null || true
  sleep 1
fi

echo "Starting Sparnessa → http://127.0.0.1:5000"

# Browser nach kurzem Warten öffnen
(sleep 1.5 && xdg-open http://127.0.0.1:5000) &

python app.py
