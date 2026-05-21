#!/bin/bash

PID_FILE=".server.pid"

# Stop the Node server
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "Server (pid $PID) stopped."
  else
    echo "No process found for pid $PID."
  fi
  rm "$PID_FILE"
else
  echo "No server pid file found."
fi

# Stop the MySQL container
docker compose down
echo "MySQL stopped."
