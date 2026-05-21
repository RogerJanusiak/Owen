#!/bin/bash
set -e

PID_FILE=".server.pid"
PORT=3000

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
