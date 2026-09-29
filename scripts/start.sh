#!/usr/bin/env bash
# Builds and starts Prelegal in Docker at http://localhost:8000 (Mac and Linux).
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose up -d --build

echo "Waiting for Prelegal to start..."
for _ in $(seq 1 60); do
  if curl -fsS http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "Prelegal is running at http://localhost:8000"
    exit 0
  fi
  sleep 1
done
echo "Prelegal did not become healthy; see: docker compose logs prelegal" >&2
exit 1
