#!/bin/bash

PID_FILE=".server.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "No server pid file found."
  exit 0
fi

PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Server (pid $PID) stopped."
else
  echo "No process found for pid $PID."
fi

rm "$PID_FILE"
