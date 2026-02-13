#!/bin/sh
set -eu

ROOT_DIR="${1:-.}"
MIGRATIONS_DIR="${ROOT_DIR%/}/apps/api/prisma/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Prisma migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

missing_count=0
missing_paths=""

for dir in "$MIGRATIONS_DIR"/*/; do
  [ -d "$dir" ] || continue
  if [ ! -f "${dir}migration.sql" ]; then
    rel_path=$(printf '%s' "$dir" | sed "s#^${ROOT_DIR%/}/##")
    if [ "$missing_count" -eq 0 ]; then
      missing_paths="$rel_path"
    else
      missing_paths="$missing_paths
$rel_path"
    fi
    missing_count=$((missing_count + 1))
  fi
done

if [ "$missing_count" -gt 0 ]; then
  echo "Found Prisma migration directories without migration.sql:"
  printf '%s\n' "$missing_paths" | while IFS= read -r path; do
    [ -n "$path" ] || continue
    echo "  - $path"
  done
  exit 1
fi

echo "Prisma migration structure check passed."
