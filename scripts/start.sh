#!/usr/bin/env bash
# Builds and starts Prelegal in Docker at http://localhost:8000 (Mac and Linux).
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose up -d --build

# Wait for the prelegal container's own health check, not just anything on port 8000.
echo "Waiting for Prelegal to start..."
for _ in $(seq 1 60); do
  if [ "$(docker inspect -f '{{.State.Health.Status}}' prelegal 2>/dev/null)" = "healthy" ]; then
    echo "Prelegal is running at http://localhost:8000"
    exit 0
  fi
  sleep 1
done
echo "Prelegal did not become healthy; see: docker compose logs prelegal" >&2
exit 1
