#!/usr/bin/env bash
# Stops Prelegal (Mac and Linux). The database is temporary and is discarded with the container.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose down
echo "Prelegal stopped."
