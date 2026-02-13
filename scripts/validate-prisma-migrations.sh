#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-.}"
MIGRATIONS_DIR="${ROOT_DIR%/}/apps/api/prisma/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Prisma migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

missing=()

for dir in "$MIGRATIONS_DIR"/*/; do
  [ -d "$dir" ] || continue
  if [ ! -f "${dir}migration.sql" ]; then
    missing+=("${dir#${ROOT_DIR%/}/}")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "Found Prisma migration directories without migration.sql:"
  for path in "${missing[@]}"; do
    echo "  - $path"
  done
  exit 1
fi

echo "Prisma migration structure check passed."
