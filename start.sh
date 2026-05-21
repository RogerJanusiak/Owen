#!/bin/bash
set -e

PID_FILE=".server.pid"
PORT=3000

# Start MySQL container and wait for it to be ready
echo "Starting MySQL..."
docker compose up -d
until docker compose exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; do
  sleep 1
done
echo "MySQL ready."

# Start the Node server (skip if already running)
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Server already running (pid $PID) at http://localhost:$PORT"
    open "http://localhost:$PORT"
    exit 0
  fi
  rm "$PID_FILE"
fi

nohup node server.js >> server.log 2>&1 &
echo $! > "$PID_FILE"
echo "Server started (pid $(cat $PID_FILE)) at http://localhost:$PORT"

sleep 0.5
open "http://localhost:$PORT"
